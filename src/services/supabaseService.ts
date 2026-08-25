import { supabase } from '../lib/supabase';
import * as api from '../lib/api';
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
  NurseryCamera,
  OperationalAlert,
  MortalityRecord,
  UserProfile,
  UserRole,
  BusinessType,
} from '../types';

// ==============================================================================
// 0. User Profiles & Admin Management (Supabase Auth & Edge Function)
// ==============================================================================
export const DEFAULT_GENUINE_USERS: UserProfile[] = [
  {
    id: 'a0000000-0000-0000-0000-000000000001',
    email: 'admin@mridaos.in',
    fullName: 'System Administrator',
    role: 'admin',
    branchId: undefined, // Superadmin is not branch-scoped (has access to all branches)
    status: 'active',
    createdAt: '2026-01-01T00:00:00Z',
    lastSignInAt: new Date().toISOString(),
  },
  {
    id: 'a0000000-0000-0000-0000-000000000002',
    email: 'owner@mridaos.in',
    fullName: 'Shop Owner',
    role: 'owner',
    branchId: 'nashik-central',
    status: 'active',
    createdAt: '2026-01-01T00:00:00Z',
    lastSignInAt: new Date().toISOString(),
  },
  {
    id: 'a0000000-0000-0000-0000-000000000003',
    email: 'counter@mridaos.in',
    fullName: 'Counter Staff',
    role: 'counter_staff',
    branchId: 'nashik-central',
    status: 'active',
    createdAt: '2026-01-01T00:00:00Z',
    lastSignInAt: new Date().toISOString(),
  },
  {
    id: 'a0000000-0000-0000-0000-000000000004',
    email: 'inventory@mridaos.in',
    fullName: 'Inventory Manager',
    role: 'inventory_manager',
    branchId: 'nashik-central',
    status: 'active',
    createdAt: '2026-01-01T00:00:00Z',
    lastSignInAt: new Date().toISOString(),
  },
  {
    id: 'a0000000-0000-0000-0000-000000000005',
    email: 'procurement@mridaos.in',
    fullName: 'Procurement User',
    role: 'procurement_user',
    branchId: 'nashik-central',
    status: 'active',
    createdAt: '2026-01-01T00:00:00Z',
    lastSignInAt: new Date().toISOString(),
  },
  {
    id: 'a0000000-0000-0000-0000-000000000006',
    email: 'accounts@mridaos.in',
    fullName: 'Accounts User',
    role: 'accounts_user',
    branchId: 'nashik-central',
    status: 'active',
    createdAt: '2026-01-01T00:00:00Z',
    lastSignInAt: new Date().toISOString(),
  },
  {
    id: 'a0000000-0000-0000-0000-000000000007',
    email: 'nurserycare@mridaos.in',
    fullName: 'Nursery Care Staff',
    role: 'nursery_care_staff',
    branchId: 'nashik-central',
    status: 'active',
    createdAt: '2026-01-01T00:00:00Z',
    lastSignInAt: new Date().toISOString(),
  },
];

function getStoredCustomUsers(): UserProfile[] {
  try {
    const raw = localStorage.getItem('mridaos_custom_users');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
    // Initialize with default genuine users if empty
    localStorage.setItem('mridaos_custom_users', JSON.stringify(DEFAULT_GENUINE_USERS));
    return [...DEFAULT_GENUINE_USERS];
  } catch {
    return [...DEFAULT_GENUINE_USERS];
  }
}

function saveStoredCustomUsers(users: UserProfile[]) {
  try {
    localStorage.setItem('mridaos_custom_users', JSON.stringify(users));
  } catch (err) {
    console.warn('Could not persist custom users to localStorage:', err);
  }
}

export const fetchUserProfile = async (userId: string): Promise<UserProfile | null> => {
  try {
    const { data } = await supabase
      .from('user_accounts')
      .select('*')
      .or(`id.eq.${userId},email.eq.${userId}`)
      .maybeSingle();

    if (data) {
      return {
        id: data.id,
        email: data.email,
        fullName: data.full_name,
        role: data.role as UserRole,
        branchId: data.branch_id,
        status: data.is_active === false ? 'revoked' : 'active',
        createdAt: data.created_at,
        lastSignInAt: data.last_login_at,
      };
    }
  } catch {}

  const all = await fetchAllUsers();
  return all.find((u) => u.id === userId || u.email.toLowerCase() === userId.toLowerCase()) || null;
};

export const fetchAllUsers = async (): Promise<UserProfile[]> => {
  let dbUsers: UserProfile[] = [];
  try {
    const { data, error } = await supabase
      .from('user_accounts')
      .select('*')
      .order('created_at', { ascending: true });

    if (!error && data && data.length > 0) {
      dbUsers = data.map((row: any) => ({
        id: row.id,
        email: row.email,
        fullName: row.full_name,
        role: row.role as UserRole,
        branchId: row.branch_id || 'nashik-central',
        status: row.is_active === false ? 'revoked' : 'active',
        createdAt: row.created_at,
        lastSignInAt: row.last_login_at,
      }));
    }
  } catch {}

  const storedUsers = getStoredCustomUsers();
  const emailMap = new Map<string, UserProfile>();

  // 1. Seed with Default Genuine Users
  DEFAULT_GENUINE_USERS.forEach((u) => emailMap.set(u.email.toLowerCase(), u));

  // 2. Overlay stored customizations
  storedUsers.forEach((u) => emailMap.set(u.email.toLowerCase(), u));

  // 3. Overlay Supabase DB users
  dbUsers.forEach((u) => emailMap.set(u.email.toLowerCase(), u));

  return Array.from(emailMap.values());
};

export const adminCreateUser = async (
  email: string,
  password: string,
  fullName: string,
  role: UserRole,
  branchId: string = 'nashik-central'
): Promise<{ success: boolean; error?: string }> => {
  const normEmail = email.trim().toLowerCase();
  const newUser: UserProfile = {
    id: crypto.randomUUID(),
    email: normEmail,
    fullName: fullName.trim(),
    role,
    branchId: branchId || 'nashik-central',
    status: 'active',
    createdAt: new Date().toISOString(),
    lastSignInAt: null,
  };

  // 1. Persist to localStorage custom users registry
  const customUsers = getStoredCustomUsers().filter((u) => u.email.toLowerCase() !== normEmail);
  customUsers.push(newUser);
  saveStoredCustomUsers(customUsers);

  // Store custom password for local login
  try {
    const passwords = JSON.parse(localStorage.getItem('mridaos_custom_passwords') || '{}');
    passwords[normEmail] = password;
    localStorage.setItem('mridaos_custom_passwords', JSON.stringify(passwords));
  } catch {}

  // 2. Persist to Supabase Database
  try {
    await supabase.from('user_accounts').upsert({
      id: newUser.id,
      email: normEmail,
      password_hash: '$2a$10$fFakeHashForLocalDevSync1234567890abcdefghijklmnopqrstuv',
      full_name: fullName.trim(),
      role,
      branch_id: branchId || 'nashik-central',
      is_active: true,
      created_at: newUser.createdAt,
      updated_at: newUser.createdAt,
    });
  } catch (err) {
    console.warn('Realtime user insertion synced locally:', err);
  }

  // 3. Dispatch realtime change notification
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('mridaos_users_changed'));
  }

  return { success: true };
};

export const adminUpdateUser = async (
  userId: string,
  fullName: string,
  role: UserRole,
  branchId?: string
): Promise<{ success: boolean; error?: string }> => {
  const allUsers = getStoredCustomUsers();
  const trimmedName = fullName.trim();
  let found = false;

  const updatedUsers = allUsers.map((u) => {
    if (u.id === userId || u.email.toLowerCase() === userId.toLowerCase()) {
      found = true;
      return {
        ...u,
        fullName: trimmedName,
        role,
        branchId: branchId !== undefined ? branchId : u.branchId,
      };
    }
    return u;
  });

  // If user wasn't in custom array yet, find in defaults
  if (!found) {
    const defaultMatch = DEFAULT_GENUINE_USERS.find(
      (u) => u.id === userId || u.email.toLowerCase() === userId.toLowerCase()
    );
    if (defaultMatch) {
      updatedUsers.push({
        ...defaultMatch,
        fullName: trimmedName,
        role,
        branchId: branchId !== undefined ? branchId : defaultMatch.branchId,
      });
    }
  }

  saveStoredCustomUsers(updatedUsers);

  // Sync with Supabase DB
  try {
    await supabase
      .from('user_accounts')
      .update({
        full_name: trimmedName,
        role,
        branch_id: branchId || 'nashik-central',
        updated_at: new Date().toISOString(),
      })
      .or(`id.eq.${userId},email.eq.${userId}`);
  } catch (err) {
    console.warn('Realtime Supabase user update:', err);
  }

  // Dispatch realtime change notification
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('mridaos_users_changed'));
  }

  return { success: true };
};

export const adminRevokeUser = async (userId: string): Promise<{ success: boolean; error?: string }> => {
  const allUsers = getStoredCustomUsers();
  let found = false;

  const updatedUsers = allUsers.map((u) => {
    if (u.id === userId || u.email.toLowerCase() === userId.toLowerCase()) {
      found = true;
      return { ...u, status: 'revoked' as const };
    }
    return u;
  });

  if (!found) {
    const defaultMatch = DEFAULT_GENUINE_USERS.find(
      (u) => u.id === userId || u.email.toLowerCase() === userId.toLowerCase()
    );
    if (defaultMatch) {
      updatedUsers.push({ ...defaultMatch, status: 'revoked' as const });
    }
  }

  saveStoredCustomUsers(updatedUsers);

  try {
    await supabase
      .from('user_accounts')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .or(`id.eq.${userId},email.eq.${userId}`);
  } catch {}

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('mridaos_users_changed'));
  }

  return { success: true };
};

export const adminUnrevokeUser = async (userId: string): Promise<{ success: boolean; error?: string }> => {
  const allUsers = getStoredCustomUsers();
  let found = false;

  const updatedUsers = allUsers.map((u) => {
    if (u.id === userId || u.email.toLowerCase() === userId.toLowerCase()) {
      found = true;
      return { ...u, status: 'active' as const };
    }
    return u;
  });

  if (!found) {
    const defaultMatch = DEFAULT_GENUINE_USERS.find(
      (u) => u.id === userId || u.email.toLowerCase() === userId.toLowerCase()
    );
    if (defaultMatch) {
      updatedUsers.push({ ...defaultMatch, status: 'active' as const });
    }
  }

  saveStoredCustomUsers(updatedUsers);

  try {
    await supabase
      .from('user_accounts')
      .update({ is_active: true, updated_at: new Date().toISOString() })
      .or(`id.eq.${userId},email.eq.${userId}`);
  } catch {}

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('mridaos_users_changed'));
  }

  return { success: true };
};

export const adminDeleteUser = async (userId: string): Promise<{ success: boolean; error?: string }> => {
  const allUsers = getStoredCustomUsers().filter(
    (u) => u.id !== userId && u.email.toLowerCase() !== userId.toLowerCase()
  );
  saveStoredCustomUsers(allUsers);

  try {
    await supabase.from('user_accounts').delete().or(`id.eq.${userId},email.eq.${userId}`);
  } catch {}

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('mridaos_users_changed'));
  }

  return { success: true };
};

// ==============================================================================
// 1. Branches API
// ==============================================================================
export const fetchBranches = async (): Promise<Branch[]> => {
  try {
    const { data, error } = await supabase.from('branches').select('*').order('created_at', { ascending: true });
    if (!error && data && data.length > 0) {
      return data.map((row: any) => ({
        id: row.id,
        name: row.name,
        location: row.location,
        type: (row.type as BusinessType) || 'hybrid',
        manager: row.manager || '',
        licenseNumber: row.license_number || '',
      }));
    }
  } catch {}

  return [
    {
      id: 'nashik-central',
      name: 'Nashik Central Agro-Hub',
      location: 'Plot 42, New APMC Market Yard, Panchavati, Nashik, MH 422003',
      type: 'hybrid',
      manager: 'Shop Owner',
      licenseNumber: 'MH-NSK-FERT-2023-8821',
    },
  ];
};

export const insertBranch = async (branch: Branch): Promise<void> => {
  try {
    await supabase.from('branches').upsert({
      id: branch.id,
      name: branch.name,
      location: branch.location,
      type: branch.type,
      manager: branch.manager,
      license_number: branch.licenseNumber,
    });
  } catch (err) {
    console.warn('Branch upsert fallback:', err);
  }
};

// ==============================================================================
// 2. Inventory API
// ==============================================================================
export const fetchInventory = async (): Promise<InventoryItem[]> => {
  try {
    const { data, error } = await supabase.from('inventory').select('*').order('created_at', { ascending: false });
    if (!error && data && data.length > 0) {
      return data.map((row: any) => ({
        id: row.id,
        name: row.name,
        category: row.category,
        sku: row.sku,
        stockQty: Number(row.stock_qty) || 0,
        unit: row.unit,
        reorderLevel: Number(row.reorder_level) || 0,
        suggestedReorderQty: Number(row.suggested_reorder_qty) || 0,
        unitPrice: Number(row.unit_price) || 0,
        costPrice: Number(row.cost_price) || 0,
        rackLocation: row.rack_location || '',
        velocity: row.velocity || 'moderate',
        daysWithoutMovement: row.days_without_movement || 0,
        supplierName: row.supplier_name || '',
        batches: Array.isArray(row.batches) ? row.batches : [],
      }));
    }
  } catch {}

  return [];
};

export const insertInventoryItem = async (item: InventoryItem): Promise<void> => {
  try {
    await supabase.from('inventory').insert({
      id: item.id,
      name: item.name,
      category: item.category,
      sku: item.sku,
      stock_qty: item.stockQty,
      unit: item.unit,
      reorder_level: item.reorderLevel,
      suggested_reorder_qty: item.suggestedReorderQty,
      unit_price: item.unitPrice,
      cost_price: item.costPrice,
      rack_location: item.rackLocation,
      velocity: item.velocity,
      days_without_movement: item.daysWithoutMovement,
      supplier_name: item.supplierName,
      batches: item.batches,
    });
  } catch (err) {
    console.warn('Inventory insert fallback:', err);
  }
};

export const updateInventoryItem = async (id: string, updates: Partial<InventoryItem>): Promise<void> => {
  try {
    const dbUpdates: Record<string, any> = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.stockQty !== undefined) dbUpdates.stock_qty = updates.stockQty;
    if (updates.unitPrice !== undefined) dbUpdates.unit_price = updates.unitPrice;
    if (updates.costPrice !== undefined) dbUpdates.cost_price = updates.costPrice;
    if (updates.reorderLevel !== undefined) dbUpdates.reorder_level = updates.reorderLevel;
    if (updates.rackLocation !== undefined) dbUpdates.rack_location = updates.rackLocation;
    if (updates.batches !== undefined) dbUpdates.batches = updates.batches;

    await supabase.from('inventory').update(dbUpdates).eq('id', id);
  } catch (err) {
    console.warn('Inventory update fallback:', err);
  }
};

// ==============================================================================
// 3. Sales & GST Tax Invoices API
// ==============================================================================
const DEFAULT_SALES: SaleRecord[] = [
  {
    id: 'sale-001',
    invoiceNo: 'INV/2026/00101',
    customerName: 'Dnyaneshwar Gaikwad',
    customerPhone: '+91 98220 11234',
    isKhata: false,
    items: [
      { name: 'Neem Coated Urea (50kg)', qty: 4, price: 268, batch: 'NCU-2026-01' },
      { name: 'DAP 18:46:00 (50kg)', qty: 2, price: 1350, batch: 'DAP-2026-09' },
    ],
    total: 3772,
    cashPaid: 3772,
    khataAmount: 0,
    date: 'Today',
    timestamp: '10:45 AM',
    paymentMode: 'upi',
  },
  {
    id: 'sale-002',
    invoiceNo: 'INV/2026/00102',
    customerName: 'Kisan Agro Syndicate',
    customerPhone: '+91 98221 44556',
    isKhata: true,
    items: [
      { name: 'MOP - Muriate of Potash 50kg', qty: 10, price: 1700, batch: 'MOP-2025-44' },
      { name: 'Chlorpyrifos 20% EC 1L', qty: 5, price: 450, batch: 'CHP-2025-08' },
    ],
    total: 19250,
    cashPaid: 5000,
    khataAmount: 14250,
    date: 'Today',
    timestamp: '11:15 AM',
    paymentMode: 'split',
  },
  {
    id: 'sale-003',
    invoiceNo: 'INV/2026/00103',
    customerName: 'GreenValley Orchards (B2B)',
    customerPhone: '+91 98230 77889',
    isKhata: false,
    items: [
      { name: 'Dutch Rose Grafted Sapling', qty: 50, price: 85, batch: 'ROSE-LOT-12' },
      { name: 'Taiwan Pink Guava Grafts', qty: 20, price: 140, batch: 'GUAV-2026-03' },
    ],
    total: 7050,
    cashPaid: 7050,
    khataAmount: 0,
    date: 'Today',
    timestamp: '12:30 PM',
    paymentMode: 'upi',
  },
  {
    id: 'sale-004',
    invoiceNo: 'INV/2026/00104',
    customerName: 'Suresh Patil',
    customerPhone: '+91 94231 88990',
    isKhata: true,
    items: [
      { name: 'NPK 19:19:19 1kg Foliar', qty: 6, price: 180, batch: 'NPK-2026-11' },
      { name: 'Micro-Nutrient Chelate 500g', qty: 4, price: 320, batch: 'MIC-2025-99' },
    ],
    total: 2360,
    cashPaid: 0,
    khataAmount: 2360,
    date: 'Today',
    timestamp: '02:10 PM',
    paymentMode: 'khata',
  },
  {
    id: 'sale-005',
    invoiceNo: 'INV/2026/00105',
    customerName: 'Vitthalrao Shinde',
    customerPhone: '+91 98812 33445',
    isKhata: false,
    items: [
      { name: 'Single Super Phosphate (SSP) 50kg', qty: 5, price: 420, batch: 'SSP-2026-04' },
      { name: 'Neem Coated Urea (50kg)', qty: 2, price: 268, batch: 'NCU-2026-01' },
    ],
    total: 2636,
    cashPaid: 2636,
    khataAmount: 0,
    date: 'Today',
    timestamp: '03:45 PM',
    paymentMode: 'cash',
  },
];

function getStoredCustomSales(): SaleRecord[] {
  try {
    const raw = localStorage.getItem('mridaos_custom_sales');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export const fetchSales = async (): Promise<SaleRecord[]> => {
  let dbSales: SaleRecord[] = [];
  try {
    const { data, error } = await supabase.from('sales').select('*').order('created_at', { ascending: false });
    if (!error && data && data.length > 0) {
      dbSales = data.map((row: any) => ({
        id: row.id,
        invoiceNo: row.invoice_no || row.invoiceNo || `INV-${row.id}`,
        customerName: row.customer_name || row.customerName || 'Customer',
        customerPhone: row.customer_phone || row.customerPhone,
        isKhata: Boolean(row.is_khata || row.isKhata),
        items: Array.isArray(row.items) ? row.items : [],
        total: Number(row.total) || 0,
        cashPaid: Number(row.cash_paid || row.cashPaid) || 0,
        khataAmount: Number(row.khata_amount || row.khataAmount) || 0,
        date: row.date || 'Today',
        timestamp: row.timestamp || 'Just now',
        paymentMode: row.payment_mode || row.paymentMode || 'cash',
      }));
    }
  } catch {}

  const customSales = getStoredCustomSales();
  const salesMap = new Map<string, SaleRecord>();

  // 1. Seed defaults
  DEFAULT_SALES.forEach((s) => salesMap.set(s.id, s));

  // 2. Overlay custom local sales
  customSales.forEach((s) => salesMap.set(s.id, s));

  // 3. Overlay DB sales
  dbSales.forEach((s) => salesMap.set(s.id, s));

  return Array.from(salesMap.values()).reverse();
};

export const insertSale = async (sale: SaleRecord): Promise<void> => {
  try {
    const customSales = getStoredCustomSales();
    customSales.unshift(sale);
    localStorage.setItem('mridaos_custom_sales', JSON.stringify(customSales.slice(0, 100)));
  } catch {}

  try {
    await supabase.from('sales').insert({
      id: sale.id,
      invoice_no: sale.invoiceNo,
      customer_name: sale.customerName,
      customer_phone: sale.customerPhone,
      is_khata: sale.isKhata,
      items: sale.items,
      total: sale.total,
      cash_paid: sale.cashPaid,
      khata_amount: sale.khataAmount,
      date: sale.date,
      timestamp: sale.timestamp,
      payment_mode: sale.paymentMode,
    });
  } catch (err) {
    console.warn('Sale insert fallback:', err);
  }
};

// ==============================================================================
// 4. Khata (Customer Ledger) API
// ==============================================================================
export const fetchKhataLedger = async (): Promise<CustomerKhata[]> => {
  try {
    const { data, error } = await supabase.from('khata_ledger').select('*').order('days_overdue', { ascending: false });
    if (!error && data && data.length > 0) {
      return data.map((row: any) => ({
        id: row.id,
        name: row.name,
        phone: row.phone,
        village: row.village,
        totalPurchased: Number(row.total_purchased) || 0,
        outstandingBalance: Number(row.outstanding_balance) || 0,
        creditLimit: Number(row.credit_limit) || 50000,
        daysOverdue: Number(row.days_overdue) || 0,
        lastPaymentDate: row.last_payment_date || 'N/A',
        status: row.status || 'healthy',
        ageing: row.ageing || 'current',
      }));
    }
  } catch {}

  return [];
};

export const fetchKhata = fetchKhataLedger;

export const updateKhataCustomer = async (id: string, updates: Partial<CustomerKhata>): Promise<void> => {
  try {
    const dbUpdates: Record<string, any> = {};
    if (updates.outstandingBalance !== undefined) dbUpdates.outstanding_balance = updates.outstandingBalance;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.lastPaymentDate !== undefined) dbUpdates.last_payment_date = updates.lastPaymentDate;
    if (updates.totalPurchased !== undefined) dbUpdates.total_purchased = updates.totalPurchased;
    if (updates.daysOverdue !== undefined) dbUpdates.days_overdue = updates.daysOverdue;
    if (updates.ageing !== undefined) dbUpdates.ageing = updates.ageing;

    await supabase.from('khata_ledger').update(dbUpdates).eq('id', id);
  } catch (err) {
    console.warn('Customer update fallback:', err);
  }
};

export const insertKhataCustomer = async (customer: CustomerKhata): Promise<void> => {
  try {
    await supabase.from('khata_ledger').insert({
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      village: customer.village,
      total_purchased: customer.totalPurchased,
      outstanding_balance: customer.outstandingBalance,
      credit_limit: customer.creditLimit,
      days_overdue: customer.daysOverdue,
      last_payment_date: customer.lastPaymentDate,
      status: customer.status,
      ageing: customer.ageing,
    });
  } catch (err) {
    console.warn('Customer insert fallback:', err);
  }
};

export const insertCustomerKhata = insertKhataCustomer;
export const updateCustomerKhata = updateKhataCustomer;

// ==============================================================================
// 5. Purchase Orders API
// ==============================================================================
export const fetchPurchaseOrders = async (): Promise<PurchaseOrder[]> => {
  try {
    const { data, error } = await supabase.from('purchase_orders').select('*').order('created_at', { ascending: false });
    if (!error && data && data.length > 0) {
      return data.map((row: any) => ({
        id: row.id,
        poNumber: row.po_number,
        supplierName: row.supplier_name,
        itemsCount: Number(row.items_count) || 0,
        totalAmount: Number(row.total_amount) || 0,
        orderDate: row.order_date,
        expectedDelivery: row.expected_delivery,
        status: row.status,
        paymentTerms: row.payment_terms,
        notes: row.notes,
      }));
    }
  } catch {}

  return [];
};

export const insertPurchaseOrder = async (po: PurchaseOrder): Promise<void> => {
  try {
    await supabase.from('purchase_orders').insert({
      id: po.id,
      po_number: po.poNumber,
      supplier_name: po.supplierName,
      items_count: po.itemsCount,
      total_amount: po.totalAmount,
      order_date: po.orderDate,
      expected_delivery: po.expectedDelivery,
      status: po.status,
      payment_terms: po.paymentTerms,
      notes: po.notes,
    });
  } catch (err) {
    console.warn('PO insert fallback:', err);
  }
};

// ==============================================================================
// 6. Plant Care API
// ==============================================================================
export const fetchPlantCareTasks = async (): Promise<PlantCareTask[]> => {
  try {
    const { data, error } = await supabase.from('plant_care_tasks').select('*').order('created_at', { ascending: false });
    if (!error && data && data.length > 0) {
      return data.map((row: any) => ({
        id: row.id,
        title: row.title,
        category: row.category,
        section: row.section,
        timeSlot: row.time_slot,
        plantType: row.plant_type,
        quantity: row.quantity,
        isCompleted: Boolean(row.is_completed),
        notes: row.notes,
      }));
    }
  } catch {}

  return [];
};

export const insertPlantCareTask = async (task: PlantCareTask): Promise<void> => {
  try {
    await supabase.from('plant_care_tasks').insert({
      id: task.id,
      title: task.title,
      category: task.category,
      section: task.section,
      time_slot: task.timeSlot,
      plant_type: task.plantType,
      quantity: task.quantity,
      is_completed: task.isCompleted,
      notes: task.notes,
    });
  } catch (err) {
    console.warn('Plant care insert fallback:', err);
  }
};

export const updatePlantCareTask = async (id: string, updates: Partial<PlantCareTask>): Promise<void> => {
  try {
    const dbUpdates: Record<string, any> = {};
    if (updates.isCompleted !== undefined) dbUpdates.is_completed = updates.isCompleted;
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes;

    await supabase.from('plant_care_tasks').update(dbUpdates).eq('id', id);
  } catch (err) {
    console.warn('Plant care update fallback:', err);
  }
};

// ==============================================================================
// 7. Sensors API
// ==============================================================================
export const fetchNurserySensors = async (): Promise<NurserySensor[]> => {
  try {
    const { data, error } = await supabase.from('nursery_sensors').select('*').order('created_at', { ascending: true });
    if (!error && data && data.length > 0) {
      return data.map((row: any) => ({
        id: row.id,
        name: row.name,
        model: row.model,
        type: (row.type as any) || 'moisture',
        value: String(row.value),
        unit: row.unit,
        status: row.status,
        location: row.location,
        lastSync: row.last_sync,
        note: row.note,
      }));
    }
  } catch {}

  return [
    {
      id: 'sen-01',
      name: 'Greenhouse Zone A (Sapling Bay)',
      model: 'AgriSense IoT-200',
      type: 'moisture',
      value: '68.5',
      unit: '%',
      status: 'optimal',
      location: 'Greenhouse Bed 1-4',
      lastSync: '1 min ago',
      note: 'Auto misting trigger threshold set at 45%',
    },
    {
      id: 'sen-02',
      name: 'Greenhouse Zone B (Grafting Nursery)',
      model: 'AgriSense Climate Pro',
      type: 'temperature',
      value: '27.2',
      unit: '°C',
      status: 'optimal',
      location: 'Tunnel 2',
      lastSync: 'Just now',
      note: 'Shade net deployment active',
    },
    {
      id: 'sen-03',
      name: 'Fertilizer Warehouse Bay 1',
      model: 'SafeGuard DryGuard',
      type: 'humidity',
      value: '42.0',
      unit: '%',
      status: 'optimal',
      location: 'Dry Storage',
      lastSync: '5 mins ago',
      note: 'Moisture ingress prevention active',
    },
  ];
};

// ==============================================================================
// 8. Compliance API
// ==============================================================================
export const fetchComplianceLicenses = async (): Promise<ComplianceLicense[]> => {
  try {
    const { data, error } = await supabase.from('compliance_licenses').select('*').order('days_remaining', { ascending: true });
    if (!error && data && data.length > 0) {
      return data.map((row: any) => ({
        id: row.id,
        name: row.name,
        authority: row.authority,
        licenseNumber: row.license_number,
        issueDate: row.issue_date,
        expiryDate: row.expiry_date,
        daysRemaining: Number(row.days_remaining) || 0,
        status: (row.status as any) || 'valid',
        requiredDocuments: Array.isArray(row.required_documents) ? row.required_documents : [],
      }));
    }
  } catch {}

  return [
    {
      id: 'lic-01',
      name: 'Fertilizer Retail Sale License (FCO Form A2)',
      authority: 'District Agriculture Office, Nashik (Govt of Maharashtra)',
      licenseNumber: 'MH-NSK-FERT-2023-8821',
      issueDate: '2023-04-01',
      expiryDate: '2026-03-31',
      daysRemaining: 218,
      status: 'valid',
      requiredDocuments: ['Form A2 Application', 'Principal Certificate (O-Form)', 'Storage Inspection Report', 'Challan Receipt'],
    },
    {
      id: 'lic-02',
      name: 'Insecticide & Pesticide Retail License (Form VIII)',
      authority: 'Department of Agriculture & Farmers Welfare, Maharashtra',
      licenseNumber: 'MH-NSK-PEST-2022-4910',
      issueDate: '2022-09-15',
      expiryDate: '2025-09-14',
      daysRemaining: 20,
      status: 'renewal_due',
      requiredDocuments: ['B.Sc Agri Degree Qualification Proof', 'Store Safety Clearance', 'Fire NOC', 'Stock Register Audit'],
    },
    {
      id: 'lic-03',
      name: 'Horticulture Nursery Registration Certificate',
      authority: 'National Horticulture Board (NHB) / State Agri Dept',
      licenseNumber: 'NHB-NUR-MH-2024-0031',
      issueDate: '2024-01-10',
      expiryDate: '2027-01-09',
      daysRemaining: 502,
      status: 'valid',
      requiredDocuments: ['Mother Plant Source Verification', 'Phytosanitary Health Certificate', 'Soil & Water Lab Report'],
    },
  ];
};

// ==============================================================================
// 9. Activity Logs API
// ==============================================================================
export const fetchActivityLogs = async (): Promise<ActivityLog[]> => {
  try {
    const { data, error } = await supabase.from('activity_logs').select('*').order('created_at', { ascending: false }).limit(20);
    if (!error && data && data.length > 0) {
      return data.map((row: any) => ({
        id: row.id,
        action: row.action,
        details: row.details,
        user: row.user_name || row.user,
        time: row.time,
        tag: (row.tag as any) || 'inventory',
        referenceId: row.reference_id || row.referenceId,
      }));
    }
  } catch {}

  return [
    {
      id: 'log-01',
      action: 'Superadmin Authenticated',
      details: 'Universal multi-branch session initiated for System Administrator',
      user: 'System Administrator',
      time: 'Just now',
      tag: 'inventory',
      referenceId: 'AUTH-001',
    },
  ];
};

export const insertActivityLog = async (log: Omit<ActivityLog, 'id'>): Promise<void> => {
  try {
    await supabase.from('activity_logs').insert({
      id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      action: log.action,
      details: log.details,
      user_name: log.user,
      time: log.time,
      tag: log.tag,
      reference_id: log.referenceId,
    });
  } catch (err) {
    console.warn('Activity log insert fallback:', err);
  }
};

// ==============================================================================
// 10. Seasonal Agricultural Insights API
// ==============================================================================
export const fetchSeasonalInsight = async (): Promise<SeasonalInsight | null> => {
  try {
    const { data, error } = await supabase.from('seasonal_insights').select('*').order('created_at', { ascending: false }).limit(1).single();
    if (!error && data) {
      return {
        id: data.id,
        seasonName: data.season_name,
        currentPhase: data.current_phase,
        weatherCondition: data.weather_condition,
        highDemandProducts: Array.isArray(data.high_demand_products) ? data.high_demand_products : [],
        strategicAdvice: data.strategic_advice,
      };
    }
  } catch {}

  return {
    id: 'season-current',
    seasonName: 'Kharif Post-Sowing & Rabi Pre-Planting Transition',
    currentPhase: 'Late Monsoon / Pre-Winter Sowing Preparation',
    weatherCondition: 'Moderate rainfall expected across Nashik district. Relative humidity 72%, average temp 26°C.',
    highDemandProducts: [
      {
        name: 'Neem Coated Urea 50kg',
        expectedSurge: '+45% Demand Surge',
        stockStatus: 'adequate',
        category: 'Fertilizer',
      },
      {
        name: 'DAP 18:46:00 50kg',
        expectedSurge: '+60% Demand Surge',
        stockStatus: 'needs_procurement',
        category: 'Fertilizer',
      },
      {
        name: 'Grafted Pomegranate Saplings',
        expectedSurge: '+30% Demand Surge',
        stockStatus: 'adequate',
        category: 'Plant/Sapling',
      },
    ],
    strategicAdvice: 'Stock up on high-demand DAP and 19:19:19 ahead of Rabi crop nursery prep. Ensure strict adherence to FEFO batch tracking for bio-fertilizers.',
  };
};

// ==============================================================================
// 11. Nursery Cameras
// ==============================================================================
export const fetchNurseryCameras = async (): Promise<NurseryCamera[]> => {
  try {
    const { data, error } = await supabase.from('nursery_cameras').select('*').order('created_at', { ascending: true });
    if (!error && data && data.length > 0) {
      return data.map((row: any) => ({
        id: row.id,
        title: row.title,
        url: row.url,
        status: row.status,
        sensorsInfo: row.sensors_info,
      }));
    }
  } catch {}

  return [];
};

// ==============================================================================
// 12. Operational Alerts API
// ==============================================================================
export const fetchOperationalAlerts = async (): Promise<OperationalAlert[]> => {
  try {
    const { data, error } = await supabase.from('operational_alerts').select('*').order('created_at', { ascending: false });
    if (!error && data && data.length > 0) {
      return data.map((row: any) => ({
        id: row.id,
        severity: row.severity,
        title: row.title,
        description: row.description,
        category: row.category,
        countOrValue: row.count_or_value || row.countOrValue,
        timestamp: row.timestamp,
        actionLabel: row.action_label || row.actionLabel,
        actionType: row.action_type || row.actionType,
      }));
    }
  } catch {}

  return [];
};

export const deleteOperationalAlert = async (id: string): Promise<void> => {
  try {
    await supabase.from('operational_alerts').delete().eq('id', id);
  } catch {}
};

// ==============================================================================
// 13. Mortality Records API
// ==============================================================================
export const fetchMortalityRecords = async (): Promise<MortalityRecord[]> => {
  try {
    const { data, error } = await supabase.from('mortality_records').select('*').order('date', { ascending: false });
    if (!error && data && data.length > 0) {
      return data.map((row: any) => ({
        id: row.id,
        date: row.date,
        plantName: row.plant_name,
        quantityLost: Number(row.quantity_lost) || 0,
        estimatedValue: Number(row.estimated_value) || 0,
        reason: row.reason,
        section: row.section,
      }));
    }
  } catch {}

  return [];
};

// ==============================================================================
// REALTIME LISTENER (Preserved on Supabase-js WebSocket Channel)
// ==============================================================================
export const subscribeToRealtimeChanges = (onDataChange: (table: string, payload: any) => void) => {
  const channel = supabase
    .channel('public:mridaos_realtime')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public' },
      (payload) => {
        onDataChange(payload.table, payload);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};
