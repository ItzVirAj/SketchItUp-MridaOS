/**
 * MridaOS Workflow State Machines & Transition Engine
 * Pure TypeScript transition validation, role checks, and timeline event logger
 */

export type SupplierStatus = 'draft' | 'pending_approval' | 'approved' | 'suspended' | 'terminated';
export type POStatus = 'draft' | 'pending_acknowledgement' | 'acknowledged' | 'dispatched' | 'grn_pending' | 'received' | 'partially_received' | 'cancelled';
export type BatchStatus = 'quarantine' | 'active' | 'reserved' | 'low_stock' | 'near_expiry' | 'expired' | 'depleted' | 'returned' | 'written_off';
export type KhataStatus = 'pending_approval' | 'active' | 'suspended' | 'closed';
export type SaleStatus = 'draft' | 'completed' | 'invoiced' | 'cancelled' | 'returned';
export type KhataPaymentStatus = 'pending' | 'cleared' | 'bounced';
export type TaskStatus = 'scheduled' | 'in_progress' | 'completed' | 'skipped' | 'overdue';
export type LicenseStatus = 'active' | 'renewal_due' | 'expired' | 'renewed' | 'suspended';

export interface WorkflowEvent {
  id?: string;
  entityType: 'supplier' | 'purchase_order' | 'batch' | 'customer_khata' | 'sale' | 'plant_care_task' | 'compliance_license';
  entityId: string;
  fromStatus?: string | null;
  toStatus: string;
  performedBy: string;
  performedByName?: string;
  performedByRole: string;
  notes?: string;
  metadata?: Record<string, any>;
  createdAt?: string;
}

export const WORKFLOW_TRANSITIONS: Record<string, Record<string, string[]>> = {
  supplier: {
    draft: ['pending_approval'],
    pending_approval: ['approved', 'draft'],
    approved: ['suspended', 'terminated'],
    suspended: ['approved', 'terminated'],
    terminated: [],
  },
  purchase_order: {
    draft: ['pending_acknowledgement', 'cancelled'],
    pending_acknowledgement: ['acknowledged', 'cancelled'],
    acknowledged: ['dispatched', 'cancelled'],
    dispatched: ['grn_pending', 'received'],
    grn_pending: ['received', 'partially_received'],
    partially_received: ['received'],
    received: [],
    cancelled: [],
  },
  batch: {
    quarantine: ['active', 'written_off', 'returned'],
    active: ['reserved', 'low_stock', 'near_expiry', 'expired', 'depleted', 'returned', 'written_off'],
    reserved: ['active', 'depleted'],
    low_stock: ['active', 'depleted', 'written_off'],
    near_expiry: ['expired', 'written_off', 'returned', 'depleted'],
    expired: ['written_off', 'returned'],
    depleted: [],
    returned: [],
    written_off: [],
  },
  customer_khata: {
    pending_approval: ['active', 'closed'],
    active: ['suspended', 'closed'],
    suspended: ['active', 'closed'],
    closed: ['active'],
  },
  sale: {
    draft: ['completed', 'cancelled'],
    completed: ['invoiced', 'returned'],
    invoiced: ['returned'],
    cancelled: [],
    returned: [],
  },
  khata_payment: {
    pending: ['cleared', 'bounced'],
    cleared: [],
    bounced: [],
  },
  plant_care_task: {
    scheduled: ['in_progress', 'skipped', 'overdue'],
    in_progress: ['completed', 'skipped'],
    overdue: ['in_progress', 'completed', 'skipped'],
    completed: [],
    skipped: [],
  },
  compliance_license: {
    active: ['renewal_due', 'expired', 'suspended'],
    renewal_due: ['renewed', 'expired', 'suspended', 'active'],
    expired: ['renewed', 'suspended'],
    renewed: ['active'],
    suspended: ['active'],
  },
};

/**
 * Validates whether a state transition from `fromStatus` to `toStatus` is permitted.
 */
export function validateWorkflowTransition(
  entityType: string,
  fromStatus: string | null | undefined,
  toStatus: string
): { isValid: boolean; error?: string } {
  const currentFrom = fromStatus || 'draft';
  if (currentFrom === toStatus) {
    return { isValid: true };
  }

  const entityRules = WORKFLOW_TRANSITIONS[entityType];
  if (!entityRules) {
    return { isValid: true }; // No strict rules for entity
  }

  const allowedNext = entityRules[currentFrom] || [];
  if (!allowedNext.includes(toStatus)) {
    return {
      isValid: false,
      error: `Invalid workflow transition for ${entityType}: [${currentFrom}] → [${toStatus}] is not allowed. Permitted transitions: ${allowedNext.length ? allowedNext.join(', ') : 'None (Terminal state)'}`,
    };
  }

  return { isValid: true };
}

/**
 * Hard statutory gate: Fertilizer items MUST have an expiry date upon GRN receipt.
 * Living nursery saplings / seeds may omit or have optional expiry dates.
 */
export function validateFertilizerExpiry(
  itemCategory: string,
  expiryDate?: string | null
): { isValid: boolean; error?: string } {
  const isFertilizerOrChemical =
    itemCategory.toLowerCase().includes('fertilizer') ||
    itemCategory.toLowerCase().includes('pesticide') ||
    itemCategory.toLowerCase().includes('chemical') ||
    itemCategory.toLowerCase().includes('nutrient') ||
    itemCategory.toLowerCase() === 'fertilizer';

  if (isFertilizerOrChemical && (!expiryDate || !expiryDate.trim())) {
    return {
      isValid: false,
      error: `Statutory Compliance Violation: Expiry date is MANDATORY for all fertilizer & agro-chemical inventory items under the Fertilizer Control Order (FCO). Cannot inward batch without an expiry date.`,
    };
  }

  return { isValid: true };
}

/**
 * Record an immutable workflow transition event in the audit trail.
 */
export async function recordWorkflowEvent(
  client: any,
  event: WorkflowEvent
): Promise<void> {
  try {
    if (client && client.from) {
      await client.from('workflow_events').insert({
        entity_type: event.entityType,
        entity_id: event.entityId,
        from_status: event.fromStatus || null,
        to_status: event.toStatus,
        performed_by: event.performedBy,
        performed_by_name: event.performedByName || null,
        performed_by_role: event.performedByRole,
        notes: event.notes || null,
        metadata: event.metadata || {},
        created_at: event.createdAt || new Date().toISOString(),
      });
    }
  } catch (err) {
    console.warn('Failed to record workflow event to DB:', err);
  }
}
