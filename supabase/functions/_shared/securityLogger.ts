import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

export interface SecurityEventData {
  event_type:
    | 'login_success'
    | 'login_failed'
    | 'account_locked'
    | 'account_unlocked'
    | 'rate_limit_exceeded'
    | 'password_changed'
    | 'password_reset_requested'
    | 'password_reset_completed'
    | 'session_revoked';
  user_id?: string;
  email?: string;
  ip_address?: string;
  user_agent?: string;
  device_fingerprint?: string;
  metadata?: Record<string, any>;
  severity?: 'info' | 'warning' | 'critical';
  performed_by?: string; // For admin actions
}

// In-memory buffer for recent security events
export const recentSecurityEvents: Array<SecurityEventData & { id: string; created_at: string }> = [];

/**
 * Log a structured security audit event
 */
export async function logSecurityEvent(
  supabase: SupabaseClient,
  event: SecurityEventData
): Promise<void> {
  const timestamp = new Date().toISOString();
  const eventRecord = {
    id: crypto.randomUUID(),
    event_type: event.event_type,
    user_id: event.user_id || null,
    email: event.email || null,
    ip_address: event.ip_address || null,
    user_agent: event.user_agent || null,
    device_fingerprint: event.device_fingerprint || null,
    metadata: event.metadata || {},
    severity: event.severity || 'info',
    created_at: timestamp,
  };

  // 1. Maintain in-memory log buffer (last 200 events)
  recentSecurityEvents.unshift(eventRecord);
  if (recentSecurityEvents.length > 200) {
    recentSecurityEvents.pop();
  }

  // 2. Persist to database security_events table if available
  try {
    await supabase.from('security_events').insert(eventRecord);
  } catch (error) {
    console.warn('Could not persist security event to DB:', error);
  }
}
