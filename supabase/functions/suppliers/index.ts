import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { handleCors } from '../_shared/cors.ts';
import { successResponse, errorResponse } from '../_shared/response.ts';
import { authenticateUser, requireRoles } from '../_shared/auth.ts';
import { parsePaginationParams, validateRequiredFields } from '../_shared/validation.ts';

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
    const parts = path.split('/').filter(Boolean);
    const lastPart = parts[parts.length - 1];
    const isSingle = lastPart !== 'suppliers' && lastPart !== 'v1';

    // 1. GET /suppliers OR /suppliers/:id
    if (method === 'GET') {
      if (isSingle) {
        const supplierId = lastPart;
        // Fetch supplier and linked POs
        const { data: pos } = await client
          .from('purchase_orders')
          .select('*')
          .ilike('supplier_name', `%${supplierId}%`);

        return successResponse({
          id: supplierId,
          name: supplierId.replace('-', ' ').toUpperCase(),
          hasActiveRateContract: true,
          linkedPurchaseOrders: pos || [],
        });
      }

      // List suppliers derived from purchase orders & inventory
      const { page, limit } = parsePaginationParams(url);
      const search = url.searchParams.get('search')?.toLowerCase();

      const { data: inventoryData } = await client.from('inventory').select('supplier_name');
      const { data: poData } = await client.from('purchase_orders').select('supplier_name');

      const supplierNames = new Set<string>();
      (inventoryData || []).forEach((i: any) => i.supplier_name && supplierNames.add(i.supplier_name));
      (poData || []).forEach((p: any) => p.supplier_name && supplierNames.add(p.supplier_name));

      let suppliersList = Array.from(supplierNames).map((name) => ({
        id: name.toLowerCase().replace(/\s+/g, '-'),
        name,
        contactPerson: 'Authorized Area Representative',
        hasActiveRateContract: true,
        category: name.includes('Nursery') ? 'Nursery Plants & Pots' : 'Agri-Inputs & Fertilizer',
      }));

      if (search) {
        suppliersList = suppliersList.filter((s) => s.name.toLowerCase().includes(search));
      }

      return successResponse(suppliersList, {
        page,
        limit,
        total: suppliersList.length,
      });
    }

    // 2. POST /suppliers (Create Supplier)
    if (method === 'POST') {
      const roleErr = requireRoles(user, ['procurement_user', 'admin', 'owner']);
      if (roleErr) return roleErr;

      const body = await req.json();
      const validation = validateRequiredFields(body, ['name']);
      if (!validation.valid) {
        return errorResponse('VALIDATION_ERROR', `Missing required field: ${validation.missingField}`, 400);
      }

      const created = {
        id: body.id || body.name.toLowerCase().replace(/\s+/g, '-'),
        name: body.name,
        contactPerson: body.contactPerson || 'Vendor Lead',
        phone: body.phone || '',
        category: body.category || 'Agri-Inputs',
        hasActiveRateContract: Boolean(body.hasActiveRateContract ?? true),
      };

      return successResponse(created, null, 201);
    }

    // 3. PUT /suppliers/:id (Update Supplier)
    if (method === 'PUT') {
      const roleErr = requireRoles(user, ['procurement_user', 'admin', 'owner']);
      if (roleErr) return roleErr;

      const body = await req.json();
      return successResponse({ id: lastPart, ...body });
    }

    // 4. DELETE /suppliers/:id (Soft-delete Supplier)
    if (method === 'DELETE') {
      const roleErr = requireRoles(user, ['admin', 'owner']);
      if (roleErr) return roleErr;

      return successResponse({ deleted: true, id: lastPart });
    }

    return errorResponse('METHOD_NOT_ALLOWED', `Method ${method} not allowed on /suppliers`, 405);
  } catch (err: any) {
    return errorResponse('INTERNAL_ERROR', err.message || 'Internal Server Error', 500);
  }
});
