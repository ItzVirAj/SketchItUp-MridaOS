-- ==============================================================================
-- MRIDAOS: ACCOUNT LOCKOUT & SECURITY AUDIT EVENTS SCHEMA
-- ==============================================================================

-- 1. Add lockout tracking columns to user_accounts table
ALTER TABLE IF EXISTS user_accounts 
  ADD COLUMN IF NOT EXISTS failed_login_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS last_failed_login_at TIMESTAMPTZ DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_user_accounts_locked 
  ON user_accounts(locked_until) WHERE locked_until IS NOT NULL;

COMMENT ON COLUMN user_accounts.failed_login_count IS 
  'Consecutive failed login attempts since last successful login';
COMMENT ON COLUMN user_accounts.locked_until IS 
  'Account is locked until this timestamp; NULL means not locked';
COMMENT ON COLUMN user_accounts.last_failed_login_at IS 
  'Timestamp of most recent failed login attempt';

-- 2. Create security_events table for comprehensive audit logging
CREATE TABLE IF NOT EXISTS security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  user_id UUID REFERENCES user_accounts(id) ON DELETE SET NULL,
  email TEXT,
  ip_address TEXT,
  user_agent TEXT,
  device_fingerprint TEXT,
  metadata JSONB DEFAULT '{}',
  severity TEXT CHECK (severity IN ('info', 'warning', 'critical')) DEFAULT 'info',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_security_events_user_id ON security_events(user_id);
CREATE INDEX IF NOT EXISTS idx_security_events_type ON security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_security_events_severity ON security_events(severity);
CREATE INDEX IF NOT EXISTS idx_security_events_created_at ON security_events(created_at DESC);

COMMENT ON TABLE security_events IS 'Audit log for security-related events (auth, lockouts, suspicious activity)';
