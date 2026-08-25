import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { handleCors } from '../_shared/cors.ts';
import { successResponse, errorResponse } from '../_shared/response.ts';
import { authenticateUser } from '../_shared/auth.ts';

export interface SearchResultItem {
  entity_type:
    | 'item_fertilizer'
    | 'item_nursery'
    | 'batch'
    | 'customer'
    | 'supplier'
    | 'purchase_order'
    | 'sale'
    | 'compliance_license'
    | 'plant_care_task';
  id: string;
  display_name: string;
  meta: Record<string, any>;
  url: string;
}

serve(async (req: Request) => {
  const cors = handleCors(req);
  if (cors) return cors;

  const url = new URL(req.url);
  const method = req.method;

  const { user, error: authError, client } = await authenticateUser(req);
  if (authError) return authError;
  if (!user) return errorResponse('UNAUTHORIZED', 'Unauthorized', 401);

  if (method !== 'GET') {
    return errorResponse('METHOD_NOT_ALLOWED', `Method ${method} not allowed on /search`, 405);
  }

  const query = (url.searchParams.get('q') || url.searchParams.get('query') || '').trim().toLowerCase();
  const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') || '30', 10)));

  if (!query || query.length < 2) {
    return successResponse({ results: [], total: 0 });
  }

  try {
    const role = user.role;
    const canSeeSuppliersAndPOs = ['procurement_user', 'inventory_manager', 'admin', 'owner'].includes(role);
    const canSeeCompliance = ['owner', 'admin', 'accounts_user'].includes(role);

    // Parallel search across indexed tables
    const promises: Promise<any>[] = [
      // 1. Items & Batches
      client.from('inventory').select('*').or(`name.ilike.%${query}%,sku.ilike.%${query}%,category.ilike.%${query}%,supplier_name.ilike.%${query}%`).limit(15),
      
      // 2. Customers
      client.from('khata_ledger').select('*').or(`name.ilike.%${query}%,phone.ilike.%${query}%,village.ilike.%${query}%`).limit(15),
      
      // 3. Sales
      client.from('sales').select('*').or(`invoice_no.ilike.%${query}%,customer_name.ilike.%${query}%`).limit(15),
      
      // 4. Plant care tasks
      client.from('plant_care_tasks').select('*').or(`title.ilike.%${query}%,section.ilike.%${query}%,plant_type.ilike.%${query}%,category.ilike.%${query}%`).limit(10),
    ];

    // Optional RBAC-scoped queries
    if (canSeeSuppliersAndPOs) {
      promises.push(
        client.from('purchase_orders').select('*').or(`po_number.ilike.%${query}%,supplier_name.ilike.%${query}%`).limit(10)
      );
    } else {
      promises.push(Promise.resolve({ data: [] }));
    }

    if (canSeeCompliance) {
      promises.push(
        client.from('compliance_licenses').select('*').or(`name.ilike.%${query}%,license_number.ilike.%${query}%,authority.ilike.%${query}%`).limit(10)
      );
    } else {
      promises.push(Promise.resolve({ data: [] }));
    }

    const [
      { data: inventoryData },
      { data: customersData },
      { data: salesData },
      { data: plantCareData },
      { data: poData },
      { data: complianceData },
    ] = await Promise.all(promises);

    const results: SearchResultItem[] = [];

    // Map Inventory Items & Batches
    (inventoryData || []).forEach((item: any) => {
      const isNursery = item.category === 'Plant/Sapling' || item.category === 'Pot & Soil';
      const entity_type = isNursery ? 'item_nursery' : 'item_fertilizer';
      const stockLevel = Number(item.stock_qty) || 0;
      const reorderLevel = Number(item.reorder_level) || 0;
      const isLowStock = stockLevel <= reorderLevel;

      results.push({
        entity_type,
        id: item.id,
        display_name: item.name,
        meta: {
          code: item.sku,
          stock_level: stockLevel,
          unit: item.unit,
          status: isLowStock ? 'low_stock' : 'in_stock',
          rack: item.rack_location,
          category: item.category,
        },
        url: isNursery ? '/nursery' : '/inventory',
      });

      // Index child batches matching query
      (item.batches || []).forEach((b: any) => {
        if (
          b.batchNumber?.toLowerCase().includes(query) ||
          item.name.toLowerCase().includes(query)
        ) {
          const daysRemaining = Number(b.daysRemaining) || 0;
          results.push({
            entity_type: 'batch',
            id: `${item.id}-${b.batchNumber}`,
            display_name: `Lot ${b.batchNumber} (${item.name})`,
            meta: {
              batch_number: b.batchNumber,
              item_name: item.name,
              item_id: item.id,
              expiry_date: b.expiryDate,
              days_remaining: daysRemaining,
              is_critical_expiry: daysRemaining <= 30,
              quantity: b.quantity,
              unit: item.unit,
              rack: b.rack,
            },
            url: '/inventory',
          });
        }
      });
    });

    // Map Customers
    (customersData || []).forEach((c: any) => {
      const balance = Number(c.outstanding_balance) || 0;
      const daysOverdue = Number(c.days_overdue) || 0;
      let agingBucket = 'current';
      if (daysOverdue > 60) agingBucket = '>60d';
      else if (daysOverdue > 30) agingBucket = '30-60d';

      results.push({
        entity_type: 'customer',
        id: c.id,
        display_name: c.name,
        meta: {
          phone: c.phone,
          village: c.village,
          khata_balance: balance,
          aging_bucket: agingBucket,
          days_overdue: daysOverdue,
          status: c.status,
        },
        url: '/khata',
      });
    });

    // Map Suppliers (Extracted from POs or inventory if user has permissions)
    if (canSeeSuppliersAndPOs) {
      const supplierSet = new Set<string>();
      (inventoryData || []).forEach((i: any) => {
        if (i.supplier_name && i.supplier_name.toLowerCase().includes(query)) {
          supplierSet.add(i.supplier_name);
        }
      });
      (poData || []).forEach((p: any) => {
        if (p.supplier_name && p.supplier_name.toLowerCase().includes(query)) {
          supplierSet.add(p.supplier_name);
        }
      });

      supplierSet.forEach((name) => {
        results.push({
          entity_type: 'supplier',
          id: `sup-${name.toLowerCase().replace(/\s+/g, '-')}`,
          display_name: name,
          meta: {
            category: name.includes('Nursery') ? 'Nursery Plants & Soil' : 'Agri-Chemicals & Fertilizers',
            has_active_contract: true,
          },
          url: '/procurement',
        });
      });

      // Map Purchase Orders
      (poData || []).forEach((po: any) => {
        results.push({
          entity_type: 'purchase_order',
          id: po.id,
          display_name: `PO #${po.po_number}`,
          meta: {
            po_number: po.po_number,
            supplier_name: po.supplier_name,
            status: po.status,
            total_amount: Number(po.total_amount) || 0,
            expected_delivery: po.expected_delivery,
          },
          url: '/procurement',
        });
      });
    }

    // Map Sales
    (salesData || []).forEach((s: any) => {
      results.push({
        entity_type: 'sale',
        id: s.id,
        display_name: `Invoice #${s.invoice_no}`,
        meta: {
          invoice_no: s.invoice_no,
          customer_name: s.customer_name,
          date: s.date,
          total: Number(s.total) || 0,
          payment_mode: s.payment_mode,
          is_khata: s.is_khata,
        },
        url: '/sales-pos',
      });
    });

    // Map Compliance Licenses
    if (canSeeCompliance) {
      (complianceData || []).forEach((lic: any) => {
        const daysRemaining = Number(lic.days_remaining) || 0;
        results.push({
          entity_type: 'compliance_license',
          id: lic.id,
          display_name: lic.name,
          meta: {
            license_number: lic.license_number,
            authority: lic.authority,
            expiry_date: lic.expiry_date,
            days_remaining: daysRemaining,
            is_critical: daysRemaining <= 30,
            status: lic.status,
          },
          url: '/compliance',
        });
      });
    }

    // Map Plant Care Tasks
    (plantCareData || []).forEach((task: any) => {
      results.push({
        entity_type: 'plant_care_task',
        id: task.id,
        display_name: task.title,
        meta: {
          section: task.section,
          plant_type: task.plant_type,
          category: task.category,
          is_completed: task.is_completed,
          time_slot: task.time_slot,
        },
        url: '/nursery',
      });
    });

    const paginatedResults = results.slice(0, limit);

    return successResponse({
      results: paginatedResults,
      total: results.length,
    });
  } catch (err: any) {
    return errorResponse('INTERNAL_ERROR', err.message || 'Internal Search Error', 500);
  }
});
