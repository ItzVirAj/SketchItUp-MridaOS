import { getRedisClient, makeRedisKey } from './redis.ts';

export interface RateLimitConfig {
  window: number; // Time window in seconds
  max: number;    // Max requests allowed in that window
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number; // Unix timestamp in milliseconds
  current: number; // Current request count
}

// Predefined rate limit rules for different operations
export const RATE_LIMITS = {
  // Authentication endpoints
  login_ip: { window: 60, max: 5 },                // 5 login attempts per minute per IP
  login_email: { window: 900, max: 10 },           // 10 login attempts per 15 min per email
  refresh_token: { window: 60, max: 20 },          // 20 token refreshes per minute per user
  password_reset_request: { window: 3600, max: 3 }, // 3 reset requests per hour per email
  password_change: { window: 3600, max: 5 },       // 5 password changes per hour per user

  // API endpoints (per authenticated user)
  api_read: { window: 60, max: 100 },              // 100 read requests per minute
  api_write: { window: 60, max: 30 },              // 30 write requests per minute
  api_delete: { window: 60, max: 10 },             // 10 delete requests per minute

  // Global fallback (per IP, all requests)
  global_ip: { window: 60, max: 200 },             // 200 total requests per minute per IP

  // Admin operations (stricter limits on sensitive actions)
  admin_user_create: { window: 300, max: 10 },     // 10 user creations per 5 min
  admin_user_delete: { window: 3600, max: 5 },     // 5 user deletions per hour
} as const;

/**
 * Check if a request is within rate limits using sliding window counter
 */
export async function checkRateLimit(
  key: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const redis = getRedisClient();
  const redisKey = makeRedisKey('ratelimit', key);

  try {
    // Increment counter and get current value
    const current = await redis.incr(redisKey);

    // If this is the first request in a new window, set expiration
    if (current === 1) {
      await redis.expire(redisKey, config.window);
    }

    // Get TTL to calculate reset time
    const ttl = await redis.ttl(redisKey);
    const resetAt = Date.now() + (ttl > 0 ? ttl * 1000 : config.window * 1000);

    const allowed = current <= config.max;
    const remaining = Math.max(0, config.max - current);

    return {
      allowed,
      remaining,
      resetAt,
      current,
    };
  } catch (error) {
    // If Redis fails, fail open to prevent outages while logging for monitoring
    console.error('Rate limit check failed:', error);

    return {
      allowed: true,
      remaining: 999,
      resetAt: Date.now() + config.window * 1000,
      current: 0,
    };
  }
}

/**
 * Reset/clear a rate limit counter (used when an operation succeeds, e.g., successful login)
 */
export async function resetRateLimit(key: string): Promise<void> {
  const redis = getRedisClient();
  const redisKey = makeRedisKey('ratelimit', key);

  try {
    await redis.del(redisKey);
  } catch (error) {
    console.error('Failed to reset rate limit:', error);
  }
}

/**
 * Get current rate limit status without incrementing
 */
export async function getRateLimitStatus(
  key: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const redis = getRedisClient();
  const redisKey = makeRedisKey('ratelimit', key);

  try {
    const current = ((await redis.get(redisKey)) as number) || 0;
    const ttl = await redis.ttl(redisKey);
    const resetAt = Date.now() + (ttl > 0 ? ttl * 1000 : config.window * 1000);

    return {
      allowed: current < config.max,
      remaining: Math.max(0, config.max - current),
      resetAt,
      current,
    };
  } catch (error) {
    console.error('Failed to get rate limit status:', error);
    return {
      allowed: true,
      remaining: 999,
      resetAt: Date.now() + config.window * 1000,
      current: 0,
    };
  }
}

/**
 * Middleware helper: Add rate limit headers to response
 */
export function addRateLimitHeaders(
  headers: Headers,
  result: RateLimitResult,
  config: RateLimitConfig
): void {
  headers.set('X-RateLimit-Limit', config.max.toString());
  headers.set('X-RateLimit-Remaining', result.remaining.toString());
  headers.set('X-RateLimit-Reset', Math.floor(result.resetAt / 1000).toString());

  if (!result.allowed) {
    const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);
    headers.set('Retry-After', retryAfter.toString());
  }
}

/**
 * Middleware helper: Create rate limit exceeded response (HTTP 429)
 */
export function createRateLimitResponse(result: RateLimitResult): Response {
  const retryAfter = Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000));

  return new Response(
    JSON.stringify({
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: `Too many requests. Please try again in ${retryAfter} seconds.`,
        retry_after: retryAfter,
        reset_at: new Date(result.resetAt).toISOString(),
      },
      data: null,
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': retryAfter.toString(),
      },
    }
  );
}
