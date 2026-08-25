import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const LOCKOUT_THRESHOLD = 5;          // Lock after 5 failed attempts
const LOCKOUT_DURATION_MINUTES = 15;  // Lock for 15 minutes
const LOCKOUT_RESET_HOURS = 24;       // Reset counter after 24 hours of no attempts

export interface LockoutStatus {
  isLocked: boolean;
  lockedUntil: Date | null;
  failedAttempts: number;
  remainingAttempts: number;
}

// In-memory lockout store for fast Edge evaluation and fallback
const inMemoryLockoutStore = new Map<
  string,
  { failedCount: number; lockedUntil: number | null; lastFailedAt: number }
>();

/**
 * Check if an account is currently locked
 */
export async function checkAccountLockout(
  supabase: SupabaseClient,
  email: string
): Promise<LockoutStatus> {
  const normEmail = email.toLowerCase().trim();
  const now = new Date();

  // 1. Try DB lookup first
  try {
    const { data: user } = await supabase
      .from('user_accounts')
      .select('failed_login_count, locked_until, last_failed_login_at')
      .eq('email', normEmail)
      .single();

    if (user) {
      const lockedUntil = user.locked_until ? new Date(user.locked_until) : null;
      const isLocked = lockedUntil !== null && lockedUntil > now;

      let failedAttempts = user.failed_login_count || 0;
      const lastFailedLogin = user.last_failed_login_at
        ? new Date(user.last_failed_login_at)
        : null;

      if (lastFailedLogin) {
        const hoursSince = (now.getTime() - lastFailedLogin.getTime()) / (1000 * 60 * 60);
        if (hoursSince > LOCKOUT_RESET_HOURS) {
          failedAttempts = 0;
        }
      }

      return {
        isLocked,
        lockedUntil,
        failedAttempts,
        remainingAttempts: Math.max(0, LOCKOUT_THRESHOLD - failedAttempts),
      };
    }
  } catch (err) {
    console.warn('DB lockout check fallback to in-memory store:', err);
  }

  // 2. Fallback to in-memory lockout tracker
  const memRecord = inMemoryLockoutStore.get(normEmail);
  if (memRecord) {
    const isLocked = memRecord.lockedUntil !== null && memRecord.lockedUntil > now.getTime();
    return {
      isLocked,
      lockedUntil: memRecord.lockedUntil ? new Date(memRecord.lockedUntil) : null,
      failedAttempts: memRecord.failedCount,
      remainingAttempts: Math.max(0, LOCKOUT_THRESHOLD - memRecord.failedCount),
    };
  }

  return {
    isLocked: false,
    lockedUntil: null,
    failedAttempts: 0,
    remainingAttempts: LOCKOUT_THRESHOLD,
  };
}

/**
 * Record a failed login attempt and apply lockout if threshold reached
 */
export async function recordFailedLogin(
  supabase: SupabaseClient,
  email: string
): Promise<LockoutStatus> {
  const normEmail = email.toLowerCase().trim();
  const now = new Date();

  // In-memory record update
  let mem = inMemoryLockoutStore.get(normEmail) || {
    failedCount: 0,
    lockedUntil: null,
    lastFailedAt: now.getTime(),
  };

  const hoursSince = (now.getTime() - mem.lastFailedAt) / (1000 * 60 * 60);
  if (hoursSince > LOCKOUT_RESET_HOURS) {
    mem.failedCount = 1;
  } else {
    mem.failedCount += 1;
  }
  mem.lastFailedAt = now.getTime();

  const shouldLock = mem.failedCount >= LOCKOUT_THRESHOLD;
  const lockedUntil = shouldLock
    ? new Date(now.getTime() + LOCKOUT_DURATION_MINUTES * 60 * 1000)
    : null;

  mem.lockedUntil = lockedUntil ? lockedUntil.getTime() : null;
  inMemoryLockoutStore.set(normEmail, mem);

  // Sync to database if available
  try {
    const { data: user } = await supabase
      .from('user_accounts')
      .select('id')
      .eq('email', normEmail)
      .single();

    if (user) {
      await supabase
        .from('user_accounts')
        .update({
          failed_login_count: mem.failedCount,
          locked_until: lockedUntil?.toISOString() || null,
          last_failed_login_at: now.toISOString(),
        })
        .eq('id', user.id);
    }
  } catch (err) {
    console.warn('DB record failed login fallback:', err);
  }

  return {
    isLocked: shouldLock,
    lockedUntil,
    failedAttempts: mem.failedCount,
    remainingAttempts: Math.max(0, LOCKOUT_THRESHOLD - mem.failedCount),
  };
}

/**
 * Reset lockout and failed login counter on successful login
 */
export async function resetLockout(
  supabase: SupabaseClient,
  userIdOrEmail: string
): Promise<void> {
  inMemoryLockoutStore.delete(userIdOrEmail.toLowerCase().trim());

  try {
    await supabase
      .from('user_accounts')
      .update({
        failed_login_count: 0,
        locked_until: null,
        last_failed_login_at: null,
      })
      .or(`id.eq.${userIdOrEmail},email.eq.${userIdOrEmail.toLowerCase().trim()}`);
  } catch (err) {
    console.warn('DB reset lockout warning:', err);
  }
}

/**
 * Admin function: Manually unlock an account
 */
export async function unlockAccount(
  supabase: SupabaseClient,
  userIdOrEmail: string
): Promise<void> {
  inMemoryLockoutStore.delete(userIdOrEmail.toLowerCase().trim());

  try {
    await supabase
      .from('user_accounts')
      .update({
        failed_login_count: 0,
        locked_until: null,
      })
      .or(`id.eq.${userIdOrEmail},email.eq.${userIdOrEmail.toLowerCase().trim()}`);
  } catch (err) {
    console.warn('DB unlock account warning:', err);
  }
}
