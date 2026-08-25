import { errorResponse } from './response.ts';

/**
 * Endpoint to Allowed Roles Matrix
 * Defines the strict Role-Based Access Control whitelist across MridaOS Edge Functions.
 */
export const ENDPOINT_PERMISSIONS: Record<string, string[]> = {
  // Sales & Invoices
  'GET /sales': ['counter_staff', 'owner', 'admin', 'inventory_manager', 'accounts_user'],
  'POST /sales': ['counter_staff', 'owner', 'admin'],
  'GET /sales/:id': ['counter_staff', 'owner', 'admin', 'accounts_user'],

  // Items & Inventory
  'GET /items': ['counter_staff', 'inventory_manager', 'procurement_user', 'owner', 'admin', 'accounts_user', 'nursery_care_staff'],
  'POST /items': ['inventory_manager', 'owner', 'admin'],
  'PUT /items/:id': ['inventory_manager', 'owner', 'admin'],
  'DELETE /items/:id': ['owner', 'admin'],

  // Batches & Lots
  'GET /batches': ['counter_staff', 'inventory_manager', 'procurement_user', 'owner', 'admin'],
  'POST /batches': ['inventory_manager', 'procurement_user', 'owner', 'admin'],

  // Suppliers & Rate Contracts
  'GET /suppliers': ['procurement_user', 'inventory_manager', 'owner', 'admin'],
  'POST /suppliers': ['procurement_user', 'owner', 'admin'],

  // Purchase Orders & GRN
  'GET /purchase-orders': ['procurement_user', 'inventory_manager', 'owner', 'admin'],
  'POST /purchase-orders': ['procurement_user', 'admin', 'owner'],
  'PATCH /purchase-orders/:id/status': ['procurement_user', 'owner', 'admin'],
  'POST /purchase-orders/:id/grn': ['inventory_manager', 'procurement_user', 'owner', 'admin'],

  // Khata & Customers
  'GET /customers': ['counter_staff', 'owner', 'admin', 'accounts_user'],
  'POST /customers': ['counter_staff', 'owner', 'admin', 'accounts_user'],
  'GET /khata': ['counter_staff', 'owner', 'admin', 'accounts_user'],
  'GET /khata/ledger/:id': ['counter_staff', 'owner', 'admin', 'accounts_user'],
  'POST /khata/payments': ['counter_staff', 'owner', 'admin', 'accounts_user'],
  'GET /khata/ageing-report': ['owner', 'admin', 'accounts_user'],

  // Stock Adjustments, Returns & Write-offs
  'GET /stock-adjustments': ['inventory_manager', 'owner', 'admin'],
  'POST /stock-adjustments': ['inventory_manager', 'owner', 'admin'],
  'GET /returns': ['counter_staff', 'inventory_manager', 'owner', 'admin'],
  'POST /returns': ['counter_staff', 'inventory_manager', 'owner', 'admin'],
  'GET /write-offs': ['inventory_manager', 'owner', 'admin'],
  'POST /write-offs': ['inventory_manager', 'owner', 'admin'],

  // Plant Care & Mortality
  'GET /plant-care': ['nursery_care_staff', 'counter_staff', 'inventory_manager', 'owner', 'admin'],
  'POST /plant-care': ['nursery_care_staff', 'inventory_manager', 'owner', 'admin'],
  'PATCH /plant-care/:id/complete': ['nursery_care_staff', 'owner', 'admin'],
  'GET /mortality': ['nursery_care_staff', 'inventory_manager', 'owner', 'admin'],
  'POST /mortality': ['nursery_care_staff', 'inventory_manager', 'owner', 'admin'],

  // Compliance & Licenses
  'GET /compliance': ['owner', 'admin', 'accounts_user'],
  'POST /compliance': ['owner', 'admin'],

  // Admin User Directory
  'GET /admin-users': ['owner', 'admin'],
  'POST /admin-users': ['owner', 'admin'],
  'PUT /admin-users/:id': ['owner', 'admin'],
  'PATCH /admin-users/:id/revoke': ['owner', 'admin'],
  'PATCH /admin-users/:id/unrevoke': ['owner', 'admin'],
  'DELETE /admin-users/:id': ['owner', 'admin'],

  // Branches & Storage
  'GET /branches': ['counter_staff', 'inventory_manager', 'procurement_user', 'nursery_care_staff', 'accounts_user', 'owner', 'admin'],
  'GET /storage-locations': ['counter_staff', 'inventory_manager', 'procurement_user', 'nursery_care_staff', 'accounts_user', 'owner', 'admin'],

  // Global Search & Dashboard
  'GET /search': ['counter_staff', 'inventory_manager', 'procurement_user', 'nursery_care_staff', 'accounts_user', 'owner', 'admin'],
  'GET /dashboard': ['counter_staff', 'inventory_manager', 'procurement_user', 'nursery_care_staff', 'accounts_user', 'owner', 'admin'],
  'GET /dashboard/metrics': ['counter_staff', 'inventory_manager', 'procurement_user', 'nursery_care_staff', 'accounts_user', 'owner', 'admin'],
  'GET /dashboard/alerts': ['counter_staff', 'inventory_manager', 'procurement_user', 'nursery_care_staff', 'accounts_user', 'owner', 'admin'],
  'GET /dashboard/sales-analytics': ['counter_staff', 'inventory_manager', 'procurement_user', 'accounts_user', 'owner', 'admin'],
  'GET /dashboard/inventory-intelligence': ['inventory_manager', 'procurement_user', 'owner', 'admin'],
  'GET /dashboard/seasonal-intelligence': ['counter_staff', 'inventory_manager', 'procurement_user', 'nursery_care_staff', 'accounts_user', 'owner', 'admin'],
  'GET /dashboard/activity-log': ['owner', 'admin', 'accounts_user'],
  'GET /dashboard/sensors': ['nursery_care_staff', 'inventory_manager', 'owner', 'admin'],
};

/**
 * Enforce role permission whitelist
 */
export function requireRole(allowedRoles: string[], userRole: string): Response | null {
  if (!allowedRoles.includes(userRole)) {
    return errorResponse(
      'FORBIDDEN',
      `Access denied. Role '${userRole}' does not have permission for this resource. Required one of: ${allowedRoles.join(', ')}`,
      403
    );
  }
  return null;
}

/**
 * Enforce multi-tenant branch match
 * Branch-scoped users can only access data belonging to their assigned branch.
 * Admin and Owner roles bypass branch restriction.
 */
export function requireBranchMatch(
  resourceBranchId: string | null | undefined,
  userBranchId: string | null | undefined,
  userRole: string
): Response | null {
  if (userRole === 'admin' || userRole === 'owner') {
    return null;
  }

  if (resourceBranchId && userBranchId && resourceBranchId !== userBranchId) {
    return errorResponse(
      'FORBIDDEN',
      `Access denied. Cannot access resources belonging to branch '${resourceBranchId}' from assigned branch '${userBranchId}'.`,
      403
    );
  }

  return null;
}

/**
 * Check permission against declarative ENDPOINT_PERMISSIONS mapping
 */
export function checkEndpointPermission(
  method: string,
  routeKey: string,
  userRole: string
): Response | null {
  const fullKey = `${method.toUpperCase()} ${routeKey}`;
  const allowed = ENDPOINT_PERMISSIONS[fullKey];

  if (allowed) {
    return requireRole(allowed, userRole);
  }

  return null;
}
