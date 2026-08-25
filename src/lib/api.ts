/**
 * MridaOS Unified REST API Client
 * Talks to Supabase Edge Functions with automatic session JWT attachment.
 */

import { supabase } from './supabase';
import {
  Branch,
  InventoryItem,
  SaleRecord,
  CustomerKhata,
  PurchaseOrder,
  PlantCareTask,
  NurserySensor,
  ComplianceLicense,
  ActivityLog,
  SeasonalInsight,
  UserProfile,
  UserRole,
} from '../types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://erhabsohsdpusepjplup.supabase.co';
const FUNCTIONS_URL = `${SUPABASE_URL}/functions/v1`;

export interface ApiResponse<T> {
  data: T | null;
  error: { code: string; message: string; details?: any } | null;
  meta: { page?: number; limit?: number; total?: number; [key: string]: any } | null;
}

/**
 * Base fetch wrapper that attaches the active custom JWT or Supabase JWT
 */
export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    let token = localStorage.getItem('mridaos_jwt_token') || '';
    if (!token) {
      const { data: { session } } = await supabase.auth.getSession();
      token = session?.access_token || '';
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers as Record<string, string> || {}),
    };

    // If local dev or endpoint path resolution
    const url = endpoint.startsWith('http') ? endpoint : `${FUNCTIONS_URL}/${endpoint.replace(/^\//, '')}`;

    const response = await fetch(url, {
      ...options,
      headers,
    });

    const json = await response.json().catch(() => null);

    if (!response.ok || (json && json.error)) {
      return {
        data: null,
        error: json?.error || {
          code: `HTTP_${response.status}`,
          message: response.statusText || 'Request failed',
        },
        meta: null,
      };
    }

    return {
      data: json?.data !== undefined ? json.data : json,
      error: null,
      meta: json?.meta || null,
    };
  } catch (err: any) {
    return {
      data: null,
      error: {
        code: 'NETWORK_ERROR',
        message: err?.message || 'Failed to connect to API server',
      },
      meta: null,
    };
  }
}

// ==============================================================================
// 1. MASTER DATA API
// ==============================================================================
export const itemsApi = {
  listFertilizer: (params?: { search?: string; low_stock?: boolean; page?: number; limit?: number }) => {
    const query = new URLSearchParams(params as any).toString();
    return apiFetch<InventoryItem[]>(`items/fertilizer${query ? `?${query}` : ''}`);
  },
  listNursery: (params?: { search?: string; page?: number; limit?: number }) => {
    const query = new URLSearchParams(params as any).toString();
    return apiFetch<InventoryItem[]>(`items/nursery${query ? `?${query}` : ''}`);
  },
  listAll: (params?: { category?: string; search?: string; page?: number; limit?: number }) => {
    const query = new URLSearchParams(params as any).toString();
    return apiFetch<InventoryItem[]>(`items${query ? `?${query}` : ''}`);
  },
  getById: (id: string) => apiFetch<InventoryItem>(`items/${id}`),
  create: (item: Partial<InventoryItem>) =>
    apiFetch<InventoryItem>('items', { method: 'POST', body: JSON.stringify(item) }),
  update: (id: string, updates: Partial<InventoryItem>) =>
    apiFetch<InventoryItem>(`items/${id}`, { method: 'PUT', body: JSON.stringify(updates) }),
  delete: (id: string) => apiFetch<{ archived: boolean }>(`items/${id}`, { method: 'DELETE' }),
};

export const suppliersApi = {
  list: (params?: { search?: string }) => {
    const query = new URLSearchParams(params as any).toString();
    return apiFetch<any[]>(`suppliers${query ? `?${query}` : ''}`);
  },
  getById: (id: string) => apiFetch<any>(`suppliers/${id}`),
  create: (supplier: any) =>
    apiFetch<any>('suppliers', { method: 'POST', body: JSON.stringify(supplier) }),
  update: (id: string, updates: any) =>
    apiFetch<any>(`suppliers/${id}`, { method: 'PUT', body: JSON.stringify(updates) }),
  delete: (id: string) => apiFetch<any>(`suppliers/${id}`, { method: 'DELETE' }),
};

export const customersApi = {
  list: (params?: { search?: string; has_outstanding_balance?: boolean; page?: number; limit?: number }) => {
    const query = new URLSearchParams(params as any).toString();
    return apiFetch<CustomerKhata[]>(`customers${query ? `?${query}` : ''}`);
  },
  getById: (id: string) => apiFetch<CustomerKhata & { recentInvoices: any[] }>(`customers/${id}`),
  create: (customer: Partial<CustomerKhata>) =>
    apiFetch<CustomerKhata>('customers', { method: 'POST', body: JSON.stringify(customer) }),
  update: (id: string, updates: Partial<CustomerKhata>) =>
    apiFetch<CustomerKhata>(`customers/${id}`, { method: 'PUT', body: JSON.stringify(updates) }),
};

export const batchesApi = {
  list: (params?: { item_id?: string; expiring_within_days?: number; status?: string }) => {
    const query = new URLSearchParams(params as any).toString();
    return apiFetch<any[]>(`batches${query ? `?${query}` : ''}`);
  },
  getFefoBatch: (itemId: string) => apiFetch<any>(`batches/fefo/${itemId}`),
  update: (id: string, updates: any) =>
    apiFetch<any>(`batches/${id}`, { method: 'PUT', body: JSON.stringify(updates) }),
};

export const storageLocationsApi = {
  list: () => apiFetch<any[]>('storage-locations'),
};

export const branchesApi = {
  list: () => apiFetch<Branch[]>('branches'),
  getById: (id: string) => apiFetch<Branch>(`branches/${id}`),
  create: (branch: Partial<Branch>) =>
    apiFetch<Branch>('branches', { method: 'POST', body: JSON.stringify(branch) }),
  update: (id: string, updates: Partial<Branch>) =>
    apiFetch<Branch>(`branches/${id}`, { method: 'PUT', body: JSON.stringify(updates) }),
};

// ==============================================================================
// 2. TRANSACTIONAL API
// ==============================================================================
export const salesApi = {
  list: (params?: { date_from?: string; date_to?: string; customer_name?: string; is_khata?: boolean }) => {
    const query = new URLSearchParams(params as any).toString();
    return apiFetch<SaleRecord[]>(`sales${query ? `?${query}` : ''}`);
  },
  getById: (id: string) => apiFetch<SaleRecord>(`sales/${id}`),
  getInvoice: (id: string) => apiFetch<{ sale: SaleRecord; invoice: any }>(`sales/${id}/invoice`),
  create: (sale: {
    customer_name: string;
    customer_phone?: string;
    customer_gstin?: string;
    customer_state_code?: string;
    is_khata: boolean;
    items: { item_id: string; qty: number; price: number; batch?: string; hsn_code?: string; gst_rate?: number; is_gst_exempt?: boolean }[];
    total: number;
    cash_paid: number;
    khata_amount: number;
    payment_mode?: string;
  }) => apiFetch<{ sale: SaleRecord; invoice: any; deductions: any[] }>('sales', { method: 'POST', body: JSON.stringify(sale) }),
};

export const gstReportsApi = {
  getSummary: (params?: { from?: string; to?: string; branch_id?: string }) => {
    const query = new URLSearchParams(params as any).toString();
    return apiFetch<any>(`reports-gst/summary${query ? `?${query}` : ''}`);
  },
  getB2BInvoices: (params?: { from?: string; to?: string; branch_id?: string }) => {
    const query = new URLSearchParams(params as any).toString();
    return apiFetch<any>(`reports-gst/b2b-invoices${query ? `?${query}` : ''}`);
  },
  getHsnSummary: (params?: { from?: string; to?: string; branch_id?: string }) => {
    const query = new URLSearchParams(params as any).toString();
    return apiFetch<any>(`reports-gst/hsn-summary${query ? `?${query}` : ''}`);
  },
};

export const purchaseOrdersApi = {
  list: (params?: { status?: string; supplier_name?: string }) => {
    const query = new URLSearchParams(params as any).toString();
    return apiFetch<PurchaseOrder[]>(`purchase-orders${query ? `?${query}` : ''}`);
  },
  getById: (id: string) => apiFetch<PurchaseOrder>(`purchase-orders/${id}`),
  create: (po: {
    supplier_name: string;
    items_count: number;
    total_amount: number;
    payment_terms?: string;
    notes?: string;
  }) => apiFetch<PurchaseOrder>('purchase-orders', { method: 'POST', body: JSON.stringify(po) }),
  transitionStatus: (id: string, status: string) =>
    apiFetch<PurchaseOrder>(`purchase-orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  inwardGRN: (id: string, batches: { item_id: string; batch_number?: string; mfg_date?: string; expiry_date?: string; qty: number; rack?: string }[]) =>
    apiFetch<{ purchaseOrder: PurchaseOrder; inwardedBatchesCount: number }>(`purchase-orders/${id}/grn`, {
      method: 'POST',
      body: JSON.stringify({ batches }),
    }),
};

export const khataApi = {
  getLedger: (customerId: string) =>
    apiFetch<{ customer: CustomerKhata; transactions: any[] }>(`khata/ledger/${customerId}`),
  getAgeingReport: () => apiFetch<any>('khata/ageing-report'),
  recordPayment: (customerId: string, amount: number, paymentMode = 'cash') =>
    apiFetch<{ customer: CustomerKhata; receiptNo: string; amountReceived: number }>(`khata/payments`, {
      method: 'POST',
      body: JSON.stringify({ customer_id: customerId, amount, payment_mode: paymentMode }),
    }),
};

export const stockAdjustmentsApi = {
  getHistory: () => apiFetch<any[]>('stock-adjustments'),
  create: (itemId: string, batchId: string, varianceQty: number, reason: string) =>
    apiFetch<any>('stock-adjustments', {
      method: 'POST',
      body: JSON.stringify({ item_id: itemId, batch_id: batchId, variance_qty: varianceQty, reason }),
    }),
};

export const returnsApi = {
  list: () => apiFetch<any[]>('returns'),
  create: (itemId: string, batchId: string, qty: number, reason: string) =>
    apiFetch<any>('returns', {
      method: 'POST',
      body: JSON.stringify({ item_id: itemId, batch_id: batchId, qty, reason }),
    }),
};

export const writeOffsApi = {
  list: () => apiFetch<any[]>('write-offs'),
  create: (itemId: string, batchId: string, reason: string) =>
    apiFetch<any>('write-offs', {
      method: 'POST',
      body: JSON.stringify({ item_id: itemId, batch_id: batchId, reason }),
    }),
};

export const plantCareApi = {
  list: (params?: { section?: string; category?: string; is_completed?: boolean }) => {
    const query = new URLSearchParams(params as any).toString();
    return apiFetch<PlantCareTask[]>(`plant-care${query ? `?${query}` : ''}`);
  },
  create: (task: Omit<PlantCareTask, 'id' | 'isCompleted'>) =>
    apiFetch<PlantCareTask>('plant-care', { method: 'POST', body: JSON.stringify(task) }),
  toggleComplete: (taskId: string, notes?: string) =>
    apiFetch<PlantCareTask>(`plant-care/${taskId}/complete`, {
      method: 'PATCH',
      body: JSON.stringify({ notes }),
    }),
};

export const mortalityApi = {
  list: (params?: { section?: string; reason?: string }) => {
    const query = new URLSearchParams(params as any).toString();
    return apiFetch<any[]>(`mortality${query ? `?${query}` : ''}`);
  },
  create: (record: { plant_name: string; quantity_lost: number; reason: string; section: string; estimated_value?: number }) =>
    apiFetch<any>('mortality', { method: 'POST', body: JSON.stringify(record) }),
};

export const complianceApi = {
  list: (params?: { status?: string; expiring_within_days?: number }) => {
    const query = new URLSearchParams(params as any).toString();
    return apiFetch<ComplianceLicense[]>(`compliance${query ? `?${query}` : ''}`);
  },
  create: (license: any) =>
    apiFetch<ComplianceLicense>('compliance', { method: 'POST', body: JSON.stringify(license) }),
  acknowledge: (id: string) =>
    apiFetch<ComplianceLicense>(`compliance/${id}/acknowledge`, { method: 'PATCH' }),
  uploadDoc: (id: string, docName: string) =>
    apiFetch<any>(`compliance/${id}/upload`, { method: 'POST', body: JSON.stringify({ doc_name: docName }) }),
};

export const adminUsersApi = {
  list: () => apiFetch<UserProfile[]>('admin-users'),
  create: (user: { email: string; password: string; full_name: string; role: UserRole; branch_id?: string }) =>
    apiFetch<UserProfile>('admin-users', { method: 'POST', body: JSON.stringify(user) }),
  update: (id: string, updates: { full_name?: string; role?: UserRole; branch_id?: string }) =>
    apiFetch<UserProfile>(`admin-users/${id}`, { method: 'PUT', body: JSON.stringify(updates) }),
  revoke: (id: string) =>
    apiFetch<{ message: string; profile: UserProfile }>(`admin-users/${id}/revoke`, { method: 'PATCH' }),
  unrevoke: (id: string) =>
    apiFetch<{ message: string; profile: UserProfile }>(`admin-users/${id}/unrevoke`, { method: 'PATCH' }),
  unlock: (id: string) =>
    apiFetch<{ message: string; userId: string }>(`admin-users/${id}/unlock`, { method: 'PATCH' }),
  delete: (id: string) =>
    apiFetch<{ message: string; userId: string }>(`admin-users/${id}`, { method: 'DELETE' }),
};

// ==============================================================================
// 3. DASHBOARD AGGREGATION API
// ==============================================================================
export const dashboardApi = {
  getMetrics: () => apiFetch<any>('dashboard/metrics'),
  getAlerts: () => apiFetch<any[]>('dashboard/alerts'),
  getSalesAnalytics: (range = 'today') => apiFetch<any>(`dashboard/sales-analytics?range=${range}`),
  getInventoryIntelligence: () => apiFetch<any>('dashboard/inventory-intelligence'),
  getSeasonalIntelligence: () => apiFetch<SeasonalInsight>('dashboard/seasonal-intelligence'),
  getActivityLog: (page = 1, limit = 20, tag?: string) => {
    const query = new URLSearchParams({ page: String(page), limit: String(limit), ...(tag ? { tag } : {}) }).toString();
    return apiFetch<ActivityLog[]>(`dashboard/activity-log?${query}`);
  },
  getSensors: () => apiFetch<NurserySensor[]>('dashboard/sensors'),
};

// ==============================================================================
// 4. GLOBAL REALTIME SEARCH API
// ==============================================================================
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

export const searchApi = {
  query: (q: string, limit = 30) => {
    const query = new URLSearchParams({ q, limit: String(limit) }).toString();
    return apiFetch<{ results: SearchResultItem[]; total: number }>(`search?${query}`);
  },
};

// ==============================================================================
// 5. CUSTOM SECURE JWT AUTH & DEVICE SESSION API
// ==============================================================================
export interface AuthLoginResponse {
  token: string;
  tokenType: string;
  expiresIn: number;
  expiresAt: string;
  sessionId: string;
  user: UserProfile;
  session: any;
}

export const authApi = {
  login: (email: string, password: string, deviceName?: string) =>
    apiFetch<AuthLoginResponse>('auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, deviceName }),
    }),

  refresh: (sessionId: string) =>
    apiFetch<{ token: string; expiresIn: number; expiresAt: string; sessionId: string }>('auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ sessionId }),
    }),

  logout: () =>
    apiFetch<{ message: string }>('auth/logout', {
      method: 'POST',
    }),

  getDevices: () =>
    apiFetch<{ currentSessionId: string; devices: any[]; total: number }>('auth/devices'),

  revokeDevice: (sessionId: string) =>
    apiFetch<{ message: string; sessionId: string }>(`auth/devices/${sessionId}`, {
      method: 'DELETE',
    }),

  revokeAllOtherDevices: () =>
    apiFetch<{ message: string; revokedCount: number }>('auth/devices', {
      method: 'DELETE',
    }),

  changePassword: (currentPassword: string, newPassword: string) =>
    apiFetch<{ message: string }>('auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    }),

  requestPasswordReset: (email: string) =>
    apiFetch<{ message: string; resetLink?: string; expiresInSeconds: number }>('auth/request-password-reset', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  resetPasswordWithToken: (token: string, new_password: string) =>
    apiFetch<{ message: string; revokedSessionsCount: number }>('auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, new_password }),
    }),

  adminGenerateResetToken: (email: string) =>
    apiFetch<{ token: string; resetLink: string; expiresAt: string; message: string }>('auth/admin-generate-reset-token', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),
};


