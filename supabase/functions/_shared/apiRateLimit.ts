import {
  checkRateLimit,
  RATE_LIMITS,
  createRateLimitResponse,
  addRateLimitHeaders,
} from './rateLimit.ts';

/**
 * Enforce operation-specific rate limits for authenticated users
 */
export async function enforceApiRateLimit(
  req: Request,
  userId: string,
  operation: 'read' | 'write' | 'delete'
): Promise<Response | null> {
  const limitKey =
    operation === 'read'
      ? 'api_read'
      : operation === 'write'
      ? 'api_write'
      : 'api_delete';

  const result = await checkRateLimit(
    `${limitKey}:${userId}`,
    RATE_LIMITS[limitKey]
  );

  if (!result.allowed) {
    const response = createRateLimitResponse(result);
    addRateLimitHeaders(response.headers, result, RATE_LIMITS[limitKey]);
    return response;
  }

  return null;
}

/**
 * Enforce global IP rate limit across all requests (200 requests/minute/IP)
 */
export async function enforceGlobalIpRateLimit(req: Request): Promise<Response | null> {
  const ip =
    req.headers.get('cf-connecting-ip') ||
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    '127.0.0.1';

  const result = await checkRateLimit(`global_ip:${ip}`, RATE_LIMITS.global_ip);

  if (!result.allowed) {
    const response = createRateLimitResponse(result);
    addRateLimitHeaders(response.headers, result, RATE_LIMITS.global_ip);
    return response;
  }

  return null;
}
