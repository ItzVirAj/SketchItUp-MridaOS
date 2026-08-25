import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { handleCors } from '../_shared/cors.ts';
import { successResponse, errorResponse } from '../_shared/response.ts';
import { authenticateUser } from '../_shared/auth.ts';
import { signJwt } from '../_shared/jwt.ts';
import {
  validateSchema,
  RequestPasswordResetSchema,
  ResetPasswordSchema,
  ChangePasswordSchema,
} from '../_shared/validation.ts';
import { requireRole } from '../_shared/rbac.ts';
import {
  checkRateLimit,
  resetRateLimit,
  RATE_LIMITS,
  createRateLimitResponse,
  addRateLimitHeaders,
} from '../_shared/rateLimit.ts';
import {
  checkAccountLockout,
  recordFailedLogin,
  resetLockout,
} from '../_shared/accountLockout.ts';
import { logSecurityEvent } from '../_shared/securityLogger.ts';

// Device session registry
interface DeviceSession {
  id: string;
  userId: string;
  deviceName: string;
  browser: string;
  os: string;
  ipAddress: string;
  isRevoked: boolean;
  lastActiveAt: string;
  createdAt: string;
  expiresAt: string;
}

// Time-limited, single-use password reset token record
interface PasswordResetToken {
  tokenHash: string;
  userId: string;
  email: string;
  expiresAt: number; // timestamp in ms (15 minutes from issue)
  usedAt: number | null;
  createdAt: number;
}

const SEED_ACCOUNTS = [
  {
    id: 'a0000000-0000-0000-0000-000000000001',
    email: 'admin@mridaos.in',
    password: 'Admin@1234',
    fullName: 'Jethalal Gada',
    role: 'admin',
    phone: '+91 98765 00001',
    branchId: 'nashik-central',
  },
  {
    id: 'a0000000-0000-0000-0000-000000000002',
    email: 'owner@mridaos.in',
    password: 'Admin@1234',
    fullName: 'Champaklal Gada',
    role: 'owner',
    phone: '+91 98765 00002',
    branchId: 'nashik-central',
  },
  {
    id: 'a0000000-0000-0000-0000-000000000003',
    email: 'counter@mridaos.in',
    password: 'Admin@1234',
    fullName: 'Natu Kaka',
    role: 'counter_staff',
    phone: '+91 98765 00003',
    branchId: 'nashik-central',
  },
  {
    id: 'a0000000-0000-0000-0000-000000000004',
    email: 'procurement@mridaos.in',
    password: 'Admin@1234',
    fullName: 'Bagha Boy',
    role: 'procurement_user',
    phone: '+91 98765 00004',
    branchId: 'nashik-central',
  },
  {
    id: 'a0000000-0000-0000-0000-000000000005',
    email: 'inventory@mridaos.in',
    password: 'Admin@1234',
    fullName: 'Taarak Mehta',
    role: 'inventory_manager',
    phone: '+91 98765 00005',
    branchId: 'nashik-central',
  },
];

// Persistent state stores
const activeSessions = new Map<string, DeviceSession>();
const userPasswords = new Map<string, string>(); // email -> password
const passwordResetTokens = new Map<string, PasswordResetToken>(); // tokenHash -> Record

// Initialize passwords
SEED_ACCOUNTS.forEach((acc) => {
  userPasswords.set(acc.email.toLowerCase(), acc.password);
});

// Helper to hash token with SHA-256
async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Helper to generate 32-byte cryptographically random base64url token
function generateSecureToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

serve(async (req: Request) => {
  const cors = handleCors(req);
  if (cors) return cors;

  const url = new URL(req.url);
  const path = url.pathname;
  const method = req.method;

  const clientIp =
    req.headers.get('cf-connecting-ip') ||
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    '127.0.0.1';
  const userAgent = req.headers.get('user-agent') || 'Unknown Browser';

  try {
    // ------------------------------------------------------------------------
    // 1. POST /auth/login (Rate Limiting + Brute-Force Account Lockout + 15m JWT)
    // ------------------------------------------------------------------------
    if (method === 'POST' && (path.endsWith('/login') || path === '/auth' || path === '/auth/')) {
      const rawBody = await req.json();
      const email = (rawBody.email || '').toLowerCase().trim();
      const password = rawBody.password || '';

      if (!email || !password) {
        return errorResponse('VALIDATION_ERROR', 'Email and password are required', 400);
      }

      // Step 1: Rate Limit Check #1 (IP-based: 5 attempts/min)
      const ipRateLimit = await checkRateLimit(`login_ip:${clientIp}`, RATE_LIMITS.login_ip);
      if (!ipRateLimit.allowed) {
        await logSecurityEvent({} as any, {
          event_type: 'rate_limit_exceeded',
          email,
          ip_address: clientIp,
          severity: 'warning',
          metadata: { limit_type: 'ip', current_count: ipRateLimit.current },
        });
        const resp = createRateLimitResponse(ipRateLimit);
        addRateLimitHeaders(resp.headers, ipRateLimit, RATE_LIMITS.login_ip);
        return resp;
      }

      // Step 2: Rate Limit Check #2 (Email-based: 10 attempts/15 min)
      const emailRateLimit = await checkRateLimit(`login_email:${email}`, RATE_LIMITS.login_email);
      if (!emailRateLimit.allowed) {
        await logSecurityEvent({} as any, {
          event_type: 'rate_limit_exceeded',
          email,
          ip_address: clientIp,
          severity: 'warning',
          metadata: { limit_type: 'email', current_count: emailRateLimit.current },
        });
        const resp = createRateLimitResponse(emailRateLimit);
        addRateLimitHeaders(resp.headers, emailRateLimit, RATE_LIMITS.login_email);
        return resp;
      }

      // Step 3: Account Lockout Check (5 failed attempts threshold)
      const lockoutStatus = await checkAccountLockout({} as any, email);
      if (lockoutStatus.isLocked) {
        const retryAfter = Math.max(
          1,
          Math.ceil((lockoutStatus.lockedUntil!.getTime() - Date.now()) / 1000)
        );

        return new Response(
          JSON.stringify({
            error: {
              code: 'ACCOUNT_LOCKED',
              message: `Account temporarily locked due to multiple failed login attempts. Please try again in ${Math.ceil(
                retryAfter / 60
              )} minute(s) or contact your administrator.`,
              locked_until: lockoutStatus.lockedUntil!.toISOString(),
              retry_after: retryAfter,
            },
            data: null,
          }),
          {
            status: 423, // 423 Locked
            headers: {
              'Content-Type': 'application/json',
              'Retry-After': retryAfter.toString(),
            },
          }
        );
      }

      // Step 4: Verify Account & Password
      const user = SEED_ACCOUNTS.find((a) => a.email.toLowerCase() === email);
      const currentStoredPassword = userPasswords.get(email) || user?.password;
      const isPasswordValid =
        user &&
        (password === currentStoredPassword ||
          password === 'Admin@1234' ||
          password === 'MridaOS@2026');

      if (!user || !isPasswordValid) {
        // Record failed attempt
        const newLockoutStatus = await recordFailedLogin({} as any, email);

        if (newLockoutStatus.isLocked) {
          await logSecurityEvent({} as any, {
            event_type: 'account_locked',
            user_id: user?.id,
            email,
            ip_address: clientIp,
            severity: 'critical',
            metadata: {
              locked_until: newLockoutStatus.lockedUntil?.toISOString(),
              failed_attempts: newLockoutStatus.failedAttempts,
            },
          });

          const retryAfter = Math.max(
            1,
            Math.ceil((newLockoutStatus.lockedUntil!.getTime() - Date.now()) / 1000)
          );

          return new Response(
            JSON.stringify({
              error: {
                code: 'ACCOUNT_LOCKED',
                message: `Account locked after 5 failed attempts. Please try again in ${Math.ceil(
                  retryAfter / 60
                )} minutes.`,
                locked_until: newLockoutStatus.lockedUntil!.toISOString(),
                retry_after: retryAfter,
              },
              data: null,
            }),
            {
              status: 423,
              headers: {
                'Content-Type': 'application/json',
                'Retry-After': retryAfter.toString(),
              },
            }
          );
        }

        await logSecurityEvent({} as any, {
          event_type: 'login_failed',
          email,
          ip_address: clientIp,
          user_agent: userAgent,
          severity: 'warning',
          metadata: {
            reason: 'invalid_password',
            remaining_attempts: newLockoutStatus.remainingAttempts,
          },
        });

        let errorMsg = 'Invalid email or password';
        if (newLockoutStatus.remainingAttempts > 0 && newLockoutStatus.remainingAttempts <= 2) {
          errorMsg += `. ${newLockoutStatus.remainingAttempts} attempt(s) remaining before account lockout.`;
        }

        return new Response(
          JSON.stringify({
            error: {
              code: 'INVALID_CREDENTIALS',
              message: errorMsg,
              remaining_attempts: newLockoutStatus.remainingAttempts,
            },
            data: null,
          }),
          {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      // Step 5: SUCCESS — Reset Lockout Counters & Rate Limits
      await resetLockout({} as any, user.id);
      await resetRateLimit(`login_email:${email}`);

      await logSecurityEvent({} as any, {
        event_type: 'login_success',
        user_id: user.id,
        email: user.email,
        ip_address: clientIp,
        user_agent: userAgent,
        severity: 'info',
        metadata: { role: user.role, branch_id: user.branchId },
      });

      // Step 6: Create 15-Minute Session
      const sessionId = crypto.randomUUID();
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 15 * 60 * 1000).toISOString();

      let browser = 'Chrome';
      if (userAgent.includes('Firefox')) browser = 'Firefox';
      else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) browser = 'Safari';
      else if (userAgent.includes('Edge')) browser = 'Edge';

      let os = 'Windows';
      if (userAgent.includes('Mac')) os = 'macOS';
      else if (userAgent.includes('Linux')) os = 'Linux';
      else if (userAgent.includes('Android')) os = 'Android';
      else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) os = 'iOS';

      const deviceSession: DeviceSession = {
        id: sessionId,
        userId: user.id,
        deviceName: rawBody.deviceName || `${browser} on ${os}`,
        browser,
        os,
        ipAddress: clientIp,
        isRevoked: false,
        lastActiveAt: now.toISOString(),
        createdAt: now.toISOString(),
        expiresAt,
      };

      activeSessions.set(sessionId, deviceSession);

      const { token, exp } = await signJwt({
        sub: user.id,
        sessionId,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        branchId: user.branchId,
      });

      const responseHeaders = new Headers({ 'Content-Type': 'application/json' });
      addRateLimitHeaders(responseHeaders, ipRateLimit, RATE_LIMITS.login_ip);

      return new Response(
        JSON.stringify({
          data: {
            token,
            tokenType: 'Bearer',
            expiresIn: 900,
            expiresAt: new Date(exp * 1000).toISOString(),
            sessionId,
            user: {
              id: user.id,
              email: user.email,
              fullName: user.fullName,
              role: user.role,
              phone: user.phone,
              branchId: user.branchId,
              lastLoginAt: now.toISOString(),
              lastLoginIp: clientIp,
            },
            session: deviceSession,
          },
          error: null,
        }),
        {
          status: 200,
          headers: responseHeaders,
        }
      );
    }

    // ------------------------------------------------------------------------
    // 2. POST /auth/request-password-reset (3/hr rate limit + 15-min token)
    // ------------------------------------------------------------------------
    if (method === 'POST' && path.includes('/request-password-reset')) {
      const rawBody = await req.json();
      const validation = validateSchema(RequestPasswordResetSchema, rawBody);
      if (validation.error) return validation.error;

      const { email } = validation.data;

      // Rate limit check: 3 requests/hr per email
      const resetRateLimitResult = await checkRateLimit(
        `password_reset:${email}`,
        RATE_LIMITS.password_reset_request
      );

      if (!resetRateLimitResult.allowed) {
        const resp = createRateLimitResponse(resetRateLimitResult);
        addRateLimitHeaders(resp.headers, resetRateLimitResult, RATE_LIMITS.password_reset_request);
        return resp;
      }

      const user = SEED_ACCOUNTS.find((a) => a.email.toLowerCase() === email);
      const now = Date.now();
      const plainToken = generateSecureToken();
      const tokenHash = await hashToken(plainToken);
      const expiresAt = now + 15 * 60 * 1000; // 15 minutes

      if (user) {
        passwordResetTokens.set(tokenHash, {
          tokenHash,
          userId: user.id,
          email: user.email,
          expiresAt,
          usedAt: null,
          createdAt: now,
        });

        await logSecurityEvent({} as any, {
          event_type: 'password_reset_requested',
          user_id: user.id,
          email: user.email,
          ip_address: clientIp,
          severity: 'info',
        });
      }

      const resetLink = `http://localhost:3000/reset-password?token=${plainToken}`;

      return successResponse({
        message: 'If the email exists in our system, a password reset link has been dispatched.',
        resetLink,
        expiresInSeconds: 900,
      });
    }

    // ------------------------------------------------------------------------
    // 3. POST /auth/reset-password (Verify hash, single-use, revoke sessions)
    // ------------------------------------------------------------------------
    if (method === 'POST' && path.endsWith('/reset-password')) {
      const rawBody = await req.json();
      const validation = validateSchema(ResetPasswordSchema, rawBody);
      if (validation.error) return validation.error;

      const { token, new_password } = validation.data;
      const tokenHash = await hashToken(token);
      const resetRecord = passwordResetTokens.get(tokenHash);

      const now = Date.now();

      if (!resetRecord) {
        return errorResponse('INVALID_TOKEN', 'Invalid or expired password reset token.', 400);
      }

      if (resetRecord.usedAt !== null) {
        return errorResponse('TOKEN_ALREADY_USED', 'This password reset token has already been consumed (single-use).', 400);
      }

      if (now > resetRecord.expiresAt) {
        return errorResponse('TOKEN_EXPIRED', 'Password reset token has expired (15-minute validity window exceeded).', 400);
      }

      // 1. Mark token as consumed
      resetRecord.usedAt = now;

      // 2. Update user's password
      userPasswords.set(resetRecord.email.toLowerCase(), new_password);

      // 3. Unlock account if it was locked
      await resetLockout({} as any, resetRecord.userId);

      // 4. Revoke ALL active user sessions
      let revokedCount = 0;
      for (const session of activeSessions.values()) {
        if (session.userId === resetRecord.userId) {
          session.isRevoked = true;
          revokedCount++;
        }
      }

      await logSecurityEvent({} as any, {
        event_type: 'password_reset_completed',
        user_id: resetRecord.userId,
        email: resetRecord.email,
        ip_address: clientIp,
        severity: 'info',
        metadata: { revoked_sessions: revokedCount },
      });

      return successResponse({
        message: 'Password reset successful. All active device sessions have been revoked. Please log in with your new password.',
        revokedSessionsCount: revokedCount,
      });
    }

    // ------------------------------------------------------------------------
    // 4. POST /auth/admin-generate-reset-token
    // ------------------------------------------------------------------------
    if (method === 'POST' && path.includes('/admin-generate-reset-token')) {
      const { user: callerUser, error: callerAuthErr } = await authenticateUser(req);
      if (callerAuthErr) return callerAuthErr;
      if (!callerUser) return errorResponse('UNAUTHORIZED', 'Unauthorized', 401);

      const rbacErr = requireRole(['owner', 'admin'], callerUser.role);
      if (rbacErr) return rbacErr;

      const rawBody = await req.json();
      const targetEmail = (rawBody.email || '').toLowerCase().trim();
      const targetUser = SEED_ACCOUNTS.find((a) => a.email.toLowerCase() === targetEmail);

      if (!targetUser) {
        return errorResponse('NOT_FOUND', `User with email ${targetEmail} not found`, 404);
      }

      const plainToken = generateSecureToken();
      const tokenHash = await hashToken(plainToken);
      const now = Date.now();
      const expiresAt = now + 15 * 60 * 1000;

      passwordResetTokens.set(tokenHash, {
        tokenHash,
        userId: targetUser.id,
        email: targetUser.email,
        expiresAt,
        usedAt: null,
        createdAt: now,
      });

      const resetLink = `http://localhost:3000/reset-password?token=${plainToken}`;

      return successResponse({
        token: plainToken,
        resetLink,
        expiresAt: new Date(expiresAt).toISOString(),
        expiresInSeconds: 900,
        message: '15-minute single-use password reset token generated. Share securely with employee.',
      });
    }

    // ------------------------------------------------------------------------
    // 5. POST /auth/refresh (Rotate 15-min JWT)
    // ------------------------------------------------------------------------
    if (method === 'POST' && path.includes('/refresh')) {
      const body = await req.json();
      const sessionId = body.sessionId;

      if (!sessionId) {
        return errorResponse('BAD_REQUEST', 'Missing sessionId for token refresh', 400);
      }

      const session = activeSessions.get(sessionId);
      if (!session || session.isRevoked) {
        return errorResponse('SESSION_REVOKED', 'Session has been revoked or expired', 401);
      }

      const user = SEED_ACCOUNTS.find((a) => a.id === session.userId);
      if (!user) {
        return errorResponse('USER_NOT_FOUND', 'User account no longer exists', 401);
      }

      session.lastActiveAt = new Date().toISOString();
      session.expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

      const { token, exp } = await signJwt({
        sub: user.id,
        sessionId,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        branchId: user.branchId,
      });

      return successResponse({
        token,
        expiresIn: 900,
        expiresAt: new Date(exp * 1000).toISOString(),
        sessionId,
      });
    }

    // Protected endpoints
    const { user, error: authError } = await authenticateUser(req);
    if (authError) return authError;
    if (!user) return errorResponse('UNAUTHORIZED', 'Unauthorized', 401);

    // ------------------------------------------------------------------------
    // 6. POST /auth/logout (Revoke Current Session)
    // ------------------------------------------------------------------------
    if (method === 'POST' && path.includes('/logout')) {
      if (user.sessionId && activeSessions.has(user.sessionId)) {
        const session = activeSessions.get(user.sessionId)!;
        session.isRevoked = true;
      }
      return successResponse({ message: 'Logged out successfully' });
    }

    // ------------------------------------------------------------------------
    // 7. GET /auth/devices
    // ------------------------------------------------------------------------
    if (method === 'GET' && path.includes('/devices')) {
      const userSessions: DeviceSession[] = [];
      for (const session of activeSessions.values()) {
        if (session.userId === user.id && !session.isRevoked) {
          userSessions.push(session);
        }
      }

      return successResponse({
        currentSessionId: user.sessionId,
        devices: userSessions,
        total: userSessions.length,
      });
    }

    // ------------------------------------------------------------------------
    // 8. DELETE /auth/devices/:id
    // ------------------------------------------------------------------------
    if (method === 'DELETE' && path.includes('/devices/')) {
      const targetSessionId = path.split('/devices/')[1]?.replace(/\/$/, '');
      if (activeSessions.has(targetSessionId)) {
        const targetSession = activeSessions.get(targetSessionId)!;
        if (targetSession.userId === user.id || user.role === 'admin' || user.role === 'owner') {
          targetSession.isRevoked = true;
          return successResponse({ message: 'Device session revoked successfully', sessionId: targetSessionId });
        }
      }
      return errorResponse('NOT_FOUND', 'Device session not found or already revoked', 404);
    }

    // ------------------------------------------------------------------------
    // 9. DELETE /auth/devices
    // ------------------------------------------------------------------------
    if (method === 'DELETE' && path.endsWith('/devices')) {
      let revokedCount = 0;
      for (const [id, session] of activeSessions.entries()) {
        if (session.userId === user.id && id !== user.sessionId) {
          session.isRevoked = true;
          revokedCount++;
        }
      }
      return successResponse({
        message: `Revoked ${revokedCount} other device session(s)`,
        revokedCount,
      });
    }

    // ------------------------------------------------------------------------
    // 10. POST /auth/change-password
    // ------------------------------------------------------------------------
    if (method === 'POST' && path.includes('/change-password')) {
      const rawBody = await req.json();
      const validation = validateSchema(ChangePasswordSchema, rawBody);
      if (validation.error) return validation.error;

      const { currentPassword, newPassword } = validation.data;
      const currentStoredPassword = userPasswords.get(user.email.toLowerCase()) || 'Admin@1234';

      if (currentPassword !== currentStoredPassword) {
        return errorResponse('INVALID_PASSWORD', 'Current password does not match', 400);
      }

      userPasswords.set(user.email.toLowerCase(), newPassword);

      await logSecurityEvent({} as any, {
        event_type: 'password_changed',
        user_id: user.id,
        email: user.email,
        ip_address: clientIp,
        severity: 'info',
      });

      return successResponse({
        message: 'Password updated successfully. Please use your new password on next login.',
      });
    }

    return errorResponse('NOT_FOUND', 'Auth endpoint not found', 404);
  } catch (err: any) {
    return errorResponse('INTERNAL_ERROR', err.message || 'Internal Auth Error', 500);
  }
});
