-- ==============================================================================
-- MRIDAOS GUIDED WORKFLOW STATE MACHINES & AUDIT TIMELINE SCHEMA
-- Enforces legal state transitions, triggers, and immutable activity timelines
-- ==============================================================================

-- 1. Status Enums
DO $$ BEGIN
  CREATE TYPE supplier_status AS ENUM (
    'draft',
    'pending_approval',
    'approved',
    'suspended',
    'terminated'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE po_status AS ENUM (
    'draft',
    'pending_acknowledgement',
    'acknowledged',
    'dispatched',
    'grn_pending',
    'received',
    'partially_received',
    'cancelled'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE batch_status AS ENUM (
    'quarantine',
    'active',
    'reserved',
    'low_stock',
    'near_expiry',
    'expired',
    'depleted',
    'returned',
    'written_off'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE customer_khata_status AS ENUM (
    'pending_approval',
    'active',
    'suspended',
    'closed'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE sale_status AS ENUM (
    'draft',
    'completed',
    'invoiced',
    'cancelled',
    'returned'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE khata_payment_status AS ENUM (
    'pending',
    'cleared',
    'bounced'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE task_status AS ENUM (
    'scheduled',
    'in_progress',
    'completed',
    'skipped',
    'overdue'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE license_status AS ENUM (
    'active',
    'renewal_due',
    'expired',
    'renewed',
    'suspended'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Add Status Columns If Not Exists
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft';
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft';
ALTER TABLE batches ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE khata_ledger ADD COLUMN IF NOT EXISTS khata_status TEXT DEFAULT 'active';
ALTER TABLE sales ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'completed';
ALTER TABLE plant_care_tasks ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'scheduled';
ALTER TABLE compliance_licenses ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- 3. Workflow Activity Timeline & Events Table
CREATE TABLE IF NOT EXISTS workflow_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,           -- 'supplier', 'purchase_order', 'batch', 'customer_khata', 'sale', 'plant_care_task', 'compliance_license'
  entity_id TEXT NOT NULL,             -- UUID / String identifier of entity
  from_status TEXT,                   -- Previous status (null on creation)
  to_status TEXT NOT NULL,             -- New status
  performed_by TEXT NOT NULL,          -- User ID or User Email
  performed_by_name TEXT,              -- Full Name of actor
  performed_by_role TEXT NOT NULL,     -- Role ('owner', 'admin', 'procurement_user', etc.)
  notes TEXT,                          -- Human readable summary / notes
  metadata JSONB DEFAULT '{}'::jsonb,  -- Context (ETA, tracking info, batches created, amounts)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workflow_events_entity ON workflow_events(entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_workflow_events_user ON workflow_events(performed_by);

-- 4. Generic State Transition Validation Function
CREATE OR REPLACE FUNCTION validate_status_transition()
RETURNS TRIGGER AS $$
DECLARE
  allowed_transitions JSONB;
  current_old_status TEXT;
  current_new_status TEXT;
  is_valid BOOLEAN := false;
BEGIN
  current_old_status := COALESCE(OLD.status, 'draft');
  current_new_status := NEW.status;

  -- Same status -> allow (e.g. data update without status change)
  IF current_old_status = current_new_status THEN
    RETURN NEW;
  END IF;

  CASE TG_TABLE_NAME
    WHEN 'suppliers' THEN
      allowed_transitions := '{
        "draft": ["pending_approval"],
        "pending_approval": ["approved", "draft"],
        "approved": ["suspended", "terminated"],
        "suspended": ["approved", "terminated"],
        "terminated": []
      }'::jsonb;
    
    WHEN 'purchase_orders' THEN
      allowed_transitions := '{
        "draft": ["pending_acknowledgement", "cancelled"],
        "pending_acknowledgement": ["acknowledged", "cancelled"],
        "acknowledged": ["dispatched", "cancelled"],
        "dispatched": ["grn_pending", "received"],
        "grn_pending": ["received", "partially_received"],
        "partially_received": ["received"],
        "received": [],
        "cancelled": []
      }'::jsonb;

    WHEN 'batches' THEN
      allowed_transitions := '{
        "quarantine": ["active", "written_off", "returned"],
        "active": ["reserved", "low_stock", "near_expiry", "expired", "depleted", "returned", "written_off"],
        "reserved": ["active", "depleted"],
        "low_stock": ["active", "depleted", "written_off"],
        "near_expiry": ["expired", "written_off", "returned", "depleted"],
        "expired": ["written_off", "returned"],
        "depleted": [],
        "returned": [],
        "written_off": []
      }'::jsonb;

    WHEN 'khata_ledger' THEN
      allowed_transitions := '{
        "pending_approval": ["active", "closed"],
        "active": ["suspended", "closed"],
        "suspended": ["active", "closed"],
        "closed": ["active"]
      }'::jsonb;

    WHEN 'sales' THEN
      allowed_transitions := '{
        "draft": ["completed", "cancelled"],
        "completed": ["invoiced", "returned"],
        "invoiced": ["returned"],
        "cancelled": [],
        "returned": []
      }'::jsonb;

    WHEN 'plant_care_tasks' THEN
      allowed_transitions := '{
        "scheduled": ["in_progress", "skipped", "overdue"],
        "in_progress": ["completed", "skipped"],
        "overdue": ["in_progress", "completed", "skipped"],
        "completed": [],
        "skipped": []
      }'::jsonb;

    WHEN 'compliance_licenses' THEN
      allowed_transitions := '{
        "active": ["renewal_due", "expired", "suspended"],
        "renewal_due": ["renewed", "expired", "suspended", "active"],
        "expired": ["renewed", "suspended"],
        "renewed": ["active"],
        "suspended": ["active"]
      }'::jsonb;
    
    ELSE
      -- If table not governed by strict transition rules, allow
      RETURN NEW;
  END CASE;

  IF allowed_transitions ? current_old_status THEN
    is_valid := (allowed_transitions->current_old_status) @> to_jsonb(current_new_status);
  END IF;

  IF NOT is_valid THEN
    RAISE EXCEPTION 'Invalid workflow status transition for %: [%] -> [%] is not permitted.',
      TG_TABLE_NAME, current_old_status, current_new_status;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Attach Validation Triggers
DROP TRIGGER IF EXISTS trg_validate_supplier_status ON suppliers;
CREATE TRIGGER trg_validate_supplier_status
  BEFORE UPDATE OF status ON suppliers
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION validate_status_transition();

DROP TRIGGER IF EXISTS trg_validate_po_status ON purchase_orders;
CREATE TRIGGER trg_validate_po_status
  BEFORE UPDATE OF status ON purchase_orders
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION validate_status_transition();
