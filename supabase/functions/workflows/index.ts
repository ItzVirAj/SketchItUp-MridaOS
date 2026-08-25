import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { handleCors } from '../_shared/cors.ts';
import { successResponse, errorResponse } from '../_shared/response.ts';
import { authenticateUser } from '../_shared/auth.ts';
import { requireRole } from '../_shared/rbac.ts';
import {
  validateWorkflowTransition,
  validateFertilizerExpiry,
  recordWorkflowEvent,
} from '../_shared/workflow.ts';

serve(async (req: Request) => {
  const cors = handleCors(req);
  if (cors) return cors;

  const url = new URL(req.url);
  const path = url.pathname;
  const method = req.method;

  const { user, error: authError, client } = await authenticateUser(req);
  if (authError) return authError;
  if (!user) return errorResponse('UNAUTHORIZED', 'Unauthorized', 401);

  try {
    // ========================================================================
    // 1. SUPPLIER ONBOARDING WORKFLOW (Section 3A)
    // ========================================================================

    // POST /workflows/supplier/submit-for-approval
    if (method === 'POST' && path.endsWith('/supplier/submit-for-approval')) {
      const rbacError = requireRole(
        ['procurement_user', 'inventory_manager', 'admin', 'owner'],
        user.role
      );
      if (rbacError) return rbacError;

      const body = await req.json();
      const { supplier_id } = body;
      if (!supplier_id) {
        return errorResponse('VALIDATION_ERROR', 'supplier_id is required', 400);
      }

      const { data: supplier, error: fetchErr } = await client
        .from('suppliers')
        .select('*')
        .eq('id', supplier_id)
        .single();

      if (fetchErr || !supplier) {
        return errorResponse('NOT_FOUND', `Supplier ${supplier_id} not found`, 404);
      }

      // Check transition rule
      const check = validateWorkflowTransition('supplier', supplier.status || 'draft', 'pending_approval');
      if (!check.isValid) {
        return errorResponse('INVALID_STATE_TRANSITION', check.error!, 422);
      }

      // Validate required profile data before submission
      if (!supplier.name || !supplier.phone) {
        return errorResponse(
          'VALIDATION_ERROR',
          'Supplier must have a valid Name and Contact Phone before submitting for approval.',
          400
        );
      }

      const { data: updated, error: updateErr } = await client
        .from('suppliers')
        .update({
          status: 'pending_approval',
          updated_at: new Date().toISOString(),
        })
        .eq('id', supplier_id)
        .select()
        .single();

      if (updateErr) return errorResponse('DATABASE_ERROR', updateErr.message, 500);

      // Record Activity Timeline Event
      await recordWorkflowEvent(client, {
        entityType: 'supplier',
        entityId: supplier_id,
        fromStatus: supplier.status || 'draft',
        toStatus: 'pending_approval',
        performedBy: user.id,
        performedByName: user.email,
        performedByRole: user.role,
        notes: `Supplier profile submitted for Owner review by ${user.email}`,
        metadata: { supplier_name: supplier.name, gstin: supplier.gstin },
      });

      // Create Operational Alert for Owner
      try {
        await client.from('operational_alerts').insert({
          title: `Supplier Pending Approval: ${supplier.name}`,
          description: `Submitted by ${user.email} (${user.role}). Review credentials & GSTIN for commercial activation.`,
          severity: 'warning',
          category: 'procurement',
          action_label: 'Review Supplier',
          action_type: 'supplier_approval',
        });
      } catch {}

      return successResponse({
        supplier: updated || supplier,
        next_step: 'awaiting_owner_approval',
      });
    }

    // POST /workflows/supplier/approve
    if (method === 'POST' && path.endsWith('/supplier/approve')) {
      const rbacError = requireRole(['owner', 'admin'], user.role);
      if (rbacError) return rbacError;

      const body = await req.json();
      const { supplier_id, approved_by_notes } = body;
      if (!supplier_id) {
        return errorResponse('VALIDATION_ERROR', 'supplier_id is required', 400);
      }

      const { data: supplier, error: fetchErr } = await client
        .from('suppliers')
        .select('*')
        .eq('id', supplier_id)
        .single();

      if (fetchErr || !supplier) {
        return errorResponse('NOT_FOUND', `Supplier ${supplier_id} not found`, 404);
      }

      const check = validateWorkflowTransition('supplier', supplier.status, 'approved');
      if (!check.isValid) {
        return errorResponse('INVALID_STATE_TRANSITION', check.error!, 422);
      }

      const { data: updated, error: updateErr } = await client
        .from('suppliers')
        .update({
          status: 'approved',
          updated_at: new Date().toISOString(),
        })
        .eq('id', supplier_id)
        .select()
        .single();

      if (updateErr) return errorResponse('DATABASE_ERROR', updateErr.message, 500);

      await recordWorkflowEvent(client, {
        entityType: 'supplier',
        entityId: supplier_id,
        fromStatus: supplier.status,
        toStatus: 'approved',
        performedBy: user.id,
        performedByName: user.email,
        performedByRole: user.role,
        notes: `Supplier approved by ${user.role}: ${approved_by_notes || 'Approved for commercial Purchase Orders'}`,
        metadata: { notes: approved_by_notes },
      });

      return successResponse({
        supplier: updated || supplier,
        next_step: 'can_create_pos',
      });
    }

    // POST /workflows/supplier/suspend
    if (method === 'POST' && path.endsWith('/supplier/suspend')) {
      const rbacError = requireRole(['owner', 'admin'], user.role);
      if (rbacError) return rbacError;

      const body = await req.json();
      const { supplier_id, reason } = body;
      if (!supplier_id) {
        return errorResponse('VALIDATION_ERROR', 'supplier_id is required', 400);
      }

      const { data: supplier, error: fetchErr } = await client
        .from('suppliers')
        .select('*')
        .eq('id', supplier_id)
        .single();

      if (fetchErr || !supplier) {
        return errorResponse('NOT_FOUND', `Supplier ${supplier_id} not found`, 404);
      }

      const check = validateWorkflowTransition('supplier', supplier.status, 'suspended');
      if (!check.isValid) {
        return errorResponse('INVALID_STATE_TRANSITION', check.error!, 422);
      }

      const { data: updated, error: updateErr } = await client
        .from('suppliers')
        .update({
          status: 'suspended',
          updated_at: new Date().toISOString(),
        })
        .eq('id', supplier_id)
        .select()
        .single();

      if (updateErr) return errorResponse('DATABASE_ERROR', updateErr.message, 500);

      await recordWorkflowEvent(client, {
        entityType: 'supplier',
        entityId: supplier_id,
        fromStatus: supplier.status,
        toStatus: 'suspended',
        performedBy: user.id,
        performedByName: user.email,
        performedByRole: user.role,
        notes: `Supplier suspended: ${reason || 'Hold placed on supplier'}`,
        metadata: { reason },
      });

      return successResponse({
        supplier: updated || supplier,
        next_step: null,
      });
    }

    // ========================================================================
    // 2. PURCHASE ORDER → GRN WORKFLOW (Section 3B)
    // ========================================================================

    // POST /workflows/po/send-for-acknowledgement
    if (method === 'POST' && path.endsWith('/po/send-for-acknowledgement')) {
      const rbacError = requireRole(['procurement_user', 'admin', 'owner'], user.role);
      if (rbacError) return rbacError;

      const body = await req.json();
      const { po_id } = body;
      if (!po_id) return errorResponse('VALIDATION_ERROR', 'po_id is required', 400);

      const { data: po, error: poErr } = await client
        .from('purchase_orders')
        .select('*')
        .eq('id', po_id)
        .single();

      if (poErr || !po) {
        return errorResponse('NOT_FOUND', `Purchase order ${po_id} not found`, 404);
      }

      const check = validateWorkflowTransition('purchase_order', po.status || 'draft', 'pending_acknowledgement');
      if (!check.isValid) {
        return errorResponse('INVALID_STATE_TRANSITION', check.error!, 422);
      }

      const { data: updated, error: updateErr } = await client
        .from('purchase_orders')
        .update({
          status: 'pending_acknowledgement',
          updated_at: new Date().toISOString(),
        })
        .eq('id', po_id)
        .select()
        .single();

      if (updateErr) return errorResponse('DATABASE_ERROR', updateErr.message, 500);

      await recordWorkflowEvent(client, {
        entityType: 'purchase_order',
        entityId: po_id,
        fromStatus: po.status || 'draft',
        toStatus: 'pending_acknowledgement',
        performedBy: user.id,
        performedByName: user.email,
        performedByRole: user.role,
        notes: `PO dispatched electronically to ${po.supplier_name} for order acknowledgement`,
        metadata: { supplier_name: po.supplier_name, total_amount: po.total_amount },
      });

      return successResponse({
        po: updated || po,
        pdf_url: `/api/v1/purchase-orders/${po_id}/pdf`,
        next_step: 'awaiting_supplier_confirmation',
      });
    }

    // PATCH /workflows/po/mark-acknowledged
    if ((method === 'PATCH' || method === 'POST') && path.endsWith('/po/mark-acknowledged')) {
      const rbacError = requireRole(['procurement_user', 'admin', 'owner'], user.role);
      if (rbacError) return rbacError;

      const body = await req.json();
      const { po_id, acknowledgement_date, supplier_eta } = body;
      if (!po_id) return errorResponse('VALIDATION_ERROR', 'po_id is required', 400);

      const { data: po, error: poErr } = await client
        .from('purchase_orders')
        .select('*')
        .eq('id', po_id)
        .single();

      if (poErr || !po) {
        return errorResponse('NOT_FOUND', `Purchase order ${po_id} not found`, 404);
      }

      const check = validateWorkflowTransition('purchase_order', po.status, 'acknowledged');
      if (!check.isValid) {
        return errorResponse('INVALID_STATE_TRANSITION', check.error!, 422);
      }

      const updatePayload: Record<string, any> = {
        status: 'acknowledged',
        updated_at: new Date().toISOString(),
      };
      if (supplier_eta) {
        updatePayload.expected_delivery = supplier_eta;
      }

      const { data: updated, error: updateErr } = await client
        .from('purchase_orders')
        .update(updatePayload)
        .eq('id', po_id)
        .select()
        .single();

      if (updateErr) return errorResponse('DATABASE_ERROR', updateErr.message, 500);

      await recordWorkflowEvent(client, {
        entityType: 'purchase_order',
        entityId: po_id,
        fromStatus: po.status,
        toStatus: 'acknowledged',
        performedBy: user.id,
        performedByName: user.email,
        performedByRole: user.role,
        notes: `PO acknowledged by supplier. Confirmed Delivery ETA: ${supplier_eta || po.expected_delivery || 'Standard Schedule'}`,
        metadata: { acknowledgement_date, supplier_eta },
      });

      return successResponse({
        po: updated || po,
        next_step: 'awaiting_dispatch',
      });
    }

    // PATCH /workflows/po/mark-dispatched
    if ((method === 'PATCH' || method === 'POST') && path.endsWith('/po/mark-dispatched')) {
      const rbacError = requireRole(['procurement_user', 'admin', 'owner'], user.role);
      if (rbacError) return rbacError;

      const body = await req.json();
      const { po_id, dispatch_date, tracking_info } = body;
      if (!po_id) return errorResponse('VALIDATION_ERROR', 'po_id is required', 400);

      const { data: po, error: poErr } = await client
        .from('purchase_orders')
        .select('*')
        .eq('id', po_id)
        .single();

      if (poErr || !po) {
        return errorResponse('NOT_FOUND', `Purchase order ${po_id} not found`, 404);
      }

      const check = validateWorkflowTransition('purchase_order', po.status, 'dispatched');
      if (!check.isValid) {
        return errorResponse('INVALID_STATE_TRANSITION', check.error!, 422);
      }

      const { data: updated, error: updateErr } = await client
        .from('purchase_orders')
        .update({
          status: 'dispatched',
          updated_at: new Date().toISOString(),
        })
        .eq('id', po_id)
        .select()
        .single();

      if (updateErr) return errorResponse('DATABASE_ERROR', updateErr.message, 500);

      await recordWorkflowEvent(client, {
        entityType: 'purchase_order',
        entityId: po_id,
        fromStatus: po.status,
        toStatus: 'dispatched',
        performedBy: user.id,
        performedByName: user.email,
        performedByRole: user.role,
        notes: `Consignment marked Dispatched. Tracking: ${tracking_info || 'Carrier Assigned'}`,
        metadata: { dispatch_date, tracking_info },
      });

      // Operational Alert for Inventory Team
      try {
        await client.from('operational_alerts').insert({
          title: `Inbound PO Dispatched: ${po.po_number}`,
          description: `Supplier ${po.supplier_name} dispatched goods. Tracking: ${tracking_info || 'N/A'}. Prepare Bay for GRN.`,
          severity: 'info',
          category: 'inventory',
          action_label: 'Start GRN',
          action_type: 'start_grn',
        });
      } catch {}

      return successResponse({
        po: updated || po,
        next_step: 'prepare_grn',
      });
    }

    // POST /workflows/po/start-grn
    if (method === 'POST' && path.endsWith('/po/start-grn')) {
      const rbacError = requireRole(['inventory_manager', 'admin', 'owner'], user.role);
      if (rbacError) return rbacError;

      const body = await req.json();
      const { po_id } = body;
      if (!po_id) return errorResponse('VALIDATION_ERROR', 'po_id is required', 400);

      const { data: po, error: poErr } = await client
        .from('purchase_orders')
        .select('*')
        .eq('id', po_id)
        .single();

      if (poErr || !po) {
        return errorResponse('NOT_FOUND', `Purchase order ${po_id} not found`, 404);
      }

      const check = validateWorkflowTransition('purchase_order', po.status, 'grn_pending');
      if (!check.isValid) {
        return errorResponse('INVALID_STATE_TRANSITION', check.error!, 422);
      }

      const { data: updated, error: updateErr } = await client
        .from('purchase_orders')
        .update({
          status: 'grn_pending',
          updated_at: new Date().toISOString(),
        })
        .eq('id', po_id)
        .select()
        .single();

      if (updateErr) return errorResponse('DATABASE_ERROR', updateErr.message, 500);

      await recordWorkflowEvent(client, {
        entityType: 'purchase_order',
        entityId: po_id,
        fromStatus: po.status,
        toStatus: 'grn_pending',
        performedBy: user.id,
        performedByName: user.email,
        performedByRole: user.role,
        notes: `Goods arrived on dock. GRN verification initiated by ${user.email}`,
        metadata: {},
      });

      return successResponse({
        po: updated || po,
        grn_items: po.items || [],
        next_step: 'complete_grn_with_batch_capture',
      });
    }

    // POST /workflows/po/complete-grn
    if (method === 'POST' && path.endsWith('/po/complete-grn')) {
      const rbacError = requireRole(['inventory_manager', 'admin', 'owner'], user.role);
      if (rbacError) return rbacError;

      const body = await req.json();
      const { po_id, grn_date, items } = body;
      if (!po_id || !Array.isArray(items) || items.length === 0) {
        return errorResponse(
          'VALIDATION_ERROR',
          'po_id and non-empty items array are required for GRN completion',
          400
        );
      }

      const { data: po, error: poErr } = await client
        .from('purchase_orders')
        .select('*')
        .eq('id', po_id)
        .single();

      if (poErr || !po) {
        return errorResponse('NOT_FOUND', `Purchase order ${po_id} not found`, 404);
      }

      // Check PO transition
      const check = validateWorkflowTransition('purchase_order', po.status, 'received');
      if (!check.isValid && po.status !== 'grn_pending' && po.status !== 'partially_received') {
        return errorResponse('INVALID_STATE_TRANSITION', check.error!, 422);
      }

      // ======================================================================
      // 1. HARD STATUTORY VALIDATION GATES (Fertilizer Expiry Check)
      // ======================================================================
      for (const item of items) {
        const itemCategory = item.category || item.item_category || 'fertilizer';
        const expiryCheck = validateFertilizerExpiry(itemCategory, item.expiry_date);
        if (!expiryCheck.isValid) {
          return errorResponse('FERTILIZER_EXPIRY_MANDATORY', expiryCheck.error!, 400);
        }

        if (item.received_qty <= 0) {
          return errorResponse('VALIDATION_ERROR', `Received quantity must be positive for item ${item.item_id || item.name}`, 400);
        }

        if (item.ordered_qty && item.received_qty > item.ordered_qty) {
          return errorResponse(
            'VALIDATION_ERROR',
            `Received quantity (${item.received_qty}) cannot exceed ordered quantity (${item.ordered_qty}) for item ${item.item_id || item.name}`,
            400
          );
        }
      }

      // ======================================================================
      // 2. INWARD BATCH LOTS & UPDATE INVENTORY
      // ======================================================================
      const createdBatches = [];
      let allItemsFullyReceived = true;

      for (const it of items) {
        const receivedQty = Number(it.received_qty) || 0;
        const orderedQty = Number(it.ordered_qty) || receivedQty;
        if (receivedQty < orderedQty) {
          allItemsFullyReceived = false;
        }

        const batchNumber = it.batch_number || `BAT-${Date.now().toString().slice(-6)}`;
        const mfgDate = it.mfg_date || new Date().toISOString().split('T')[0];
        const expiryDate = it.expiry_date || null;
        const costPrice = it.cost_price || 0;
        const storageLocation = it.storage_location || it.rack || 'Bay A-01';

        // Fetch current inventory item
        const { data: invItem } = await client
          .from('inventory')
          .select('*')
          .eq('id', it.item_id)
          .single();

        if (invItem) {
          const currentStock = Number(invItem.stock_qty) || 0;
          const newStock = currentStock + receivedQty;
          const currentBatches = invItem.batches || [];

          currentBatches.push({
            batchNumber,
            manufacturingDate: mfgDate,
            expiryDate,
            quantity: receivedQty,
            costPrice,
            rack: storageLocation,
            status: 'active',
          });

          await client
            .from('inventory')
            .update({
              stock_qty: newStock,
              batches: currentBatches,
              updated_at: new Date().toISOString(),
            })
            .eq('id', it.item_id);
        }

        createdBatches.push({
          itemId: it.item_id,
          itemName: it.name || it.item_name,
          batchNumber,
          quantity: receivedQty,
          mfgDate,
          expiryDate,
          storageLocation,
          status: 'active',
        });
      }

      const finalStatus = allItemsFullyReceived ? 'received' : 'partially_received';

      const { data: updatedPO, error: poUpdateErr } = await client
        .from('purchase_orders')
        .update({
          status: finalStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', po_id)
        .select()
        .single();

      if (poUpdateErr) return errorResponse('DATABASE_ERROR', poUpdateErr.message, 500);

      // Record Activity Timeline Event
      await recordWorkflowEvent(client, {
        entityType: 'purchase_order',
        entityId: po_id,
        fromStatus: po.status,
        toStatus: finalStatus,
        performedBy: user.id,
        performedByName: user.email,
        performedByRole: user.role,
        notes: `GRN Inwarding finalized: ${createdBatches.length} batch lots created. Stock updated in Warehouse.`,
        metadata: {
          grn_date: grn_date || new Date().toISOString(),
          created_batches: createdBatches,
          final_status: finalStatus,
        },
      });

      return successResponse({
        po: updatedPO || po,
        created_batches: createdBatches,
        next_step: 'assign_to_shelf_and_enable_for_sale',
      });
    }

    // ========================================================================
    // 3. WORKFLOW TIMELINE & AUDIT TRAIL QUERY (Section 4)
    // ========================================================================
    if (method === 'GET' && path.includes('/timeline/')) {
      const parts = path.split('/').filter(Boolean);
      const entityType = parts[parts.length - 2];
      const entityId = parts[parts.length - 1];

      if (!entityType || !entityId) {
        return errorResponse('VALIDATION_ERROR', 'entityType and entityId required', 400);
      }

      const { data: events, error } = await client
        .from('workflow_events')
        .select('*')
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .order('created_at', { ascending: true });

      if (error) return errorResponse('DATABASE_ERROR', error.message, 500);

      return successResponse(events || []);
    }

    // ========================================================================
    // 4. DASHBOARD NEXT ACTIONS SUMMARY WIDGET (Section 6)
    // ========================================================================
    if (method === 'GET' && path.endsWith('/next-actions')) {
      const actions: any[] = [];

      // Query POs pending acknowledgement
      const { data: pendingAcks } = await client
        .from('purchase_orders')
        .select('id, po_number, supplier_name')
        .eq('status', 'pending_acknowledgement');

      if (pendingAcks && pendingAcks.length > 0) {
        actions.push({
          role: 'procurement_user',
          title: `${pendingAcks.length} POs awaiting supplier acknowledgement`,
          count: pendingAcks.length,
          target_view: 'purchase_orders',
          status_filter: 'pending_acknowledgement',
        });
      }

      // Query POs dispatched (ready for GRN)
      const { data: pendingGRNs } = await client
        .from('purchase_orders')
        .select('id, po_number, supplier_name')
        .in('status', ['dispatched', 'grn_pending']);

      if (pendingGRNs && pendingGRNs.length > 0) {
        actions.push({
          role: 'inventory_manager',
          title: `${pendingGRNs.length} GRNs pending verification on arrival dock`,
          count: pendingGRNs.length,
          target_view: 'purchase_orders',
          status_filter: 'dispatched',
        });
      }

      // Query Suppliers pending approval (for owner)
      const { data: pendingSuppliers } = await client
        .from('suppliers')
        .select('id, name')
        .eq('status', 'pending_approval');

      if (pendingSuppliers && pendingSuppliers.length > 0) {
        actions.push({
          role: 'owner',
          title: `${pendingSuppliers.length} Suppliers pending commercial approval`,
          count: pendingSuppliers.length,
          target_view: 'suppliers',
          status_filter: 'pending_approval',
        });
      }

      return successResponse({
        user_role: user.role,
        actions,
      });
    }

    return errorResponse('NOT_FOUND', `Workflow endpoint ${path} not found`, 404);
  } catch (err: any) {
    return errorResponse('INTERNAL_ERROR', err.message || 'Internal Server Error', 500);
  }
});
