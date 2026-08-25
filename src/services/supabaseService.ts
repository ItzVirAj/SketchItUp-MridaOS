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
} from '../types';

// ==============================================================================
// 0. User Profiles & Admin Management (Supabase Auth & Edge Function)
// ==============================================================================
export const fetchUserProfile = async (userId: string): Promise<UserProfile | null> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !data) {
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user && userData.user.id === userId) {
        return {
          id: userId,
          email: userData.user.email || '',
          fullName: userData.user.user_metadata?.full_name || userData.user.email?.split('@')[0] || 'User',
          role: (userData.user.user_metadata?.role as UserRole) || 'counter_staff',
          branchId: userData.user.user_metadata?.branch_id || 'nashik-central',
          status: 'active',
          createdAt: userData.user.created_at,
          lastSignInAt: userData.user.last_sign_in_at,
        };
      }
      return null;
    }

    return {
      id: data.id,
      email: data.email,
      fullName: data.full_name,
      role: data.role as UserRole,
      branchId: data.branch_id,
      status: data.status,
      createdAt: data.created_at,
      lastSignInAt: data.last_sign_in_at,
    };
  } catch (err) {
    console.error('Error fetching user profile:', err);
    return null;
  }
};

export const fetchAllUsers = async (): Promise<UserProfile[]> => {
  const res = await api.adminUsersApi.list();
  if (res.data) return res.data;

  // Direct table fallback
  const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: true });
  return (data || []).map((row: any) => ({
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    role: row.role as UserRole,
    branchId: row.branch_id,
    status: row.status,
    createdAt: row.created_at,
    lastSignInAt: row.last_sign_in_at,
  }));
};

export const adminCreateUser = async (
  email: string,
  password: string,
  fullName: string,
  role: UserRole,
  branchId: string = 'nashik-central'
): Promise<{ success: boolean; error?: string }> => {
  const res = await api.adminUsersApi.create({
    email,
    password,
    full_name: fullName,
    role,
    branch_id: branchId,
  });

  if (res.error) {
    // Fallback to RPC
    const { error: rpcErr } = await supabase.rpc('admin_create_user', {
      p_email: email.trim().toLowerCase(),
      p_password: password,
      p_full_name: fullName.trim(),
      p_role: role,
      p_branch_id: branchId || 'nashik-central',
    });
    if (rpcErr) return { success: false, error: rpcErr.message };
  }

  return { success: true };
};

export const adminUpdateUser = async (
  userId: string,
  fullName: string,
  role: UserRole,
  branchId?: string
): Promise<{ success: boolean; error?: string }> => {
  const res = await api.adminUsersApi.update(userId, {
    full_name: fullName,
    role,
    branch_id: branchId,
  });

  if (res.error) {
    const { error: directError } = await supabase
      .from('profiles')
      .update({
        full_name: fullName.trim(),
        role: role,
        branch_id: branchId || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);
    if (directError) return { success: false, error: directError.message };
  }

  return { success: true };
};

export const adminRevokeUser = async (userId: string): Promise<{ success: boolean; error?: string }> => {
  const res = await api.adminUsersApi.revoke(userId);
  if (res.error) {
    const { error: directError } = await supabase
      .from('profiles')
      .update({ status: 'revoked', updated_at: new Date().toISOString() })
      .eq('id', userId);
    if (directError) return { success: false, error: directError.message };
  }
  return { success: true };
};

export const adminUnrevokeUser = async (userId: string): Promise<{ success: boolean; error?: string }> => {
  const res = await api.adminUsersApi.unrevoke(userId);
  if (res.error) {
    const { error: directError } = await supabase
      .from('profiles')
      .update({ status: 'active', updated_at: new Date().toISOString() })
      .eq('id', userId);
    if (directError) return { success: false, error: directError.message };
  }
  return { success: true };
};

export const adminDeleteUser = async (userId: string): Promise<{ success: boolean; error?: string }> => {
  const res = await api.adminUsersApi.delete(userId);
  if (res.error) {
    const { error: directError } = await supabase.from('profiles').delete().eq('id', userId);
    if (directError) return { success: false, error: directError.message };
  }
  return { success: true };
};

// ==============================================================================
// 1. Branches API
// ==============================================================================
export const fetchBranches = async (): Promise<Branch[]> => {
  const res = await api.branchesApi.list();
  if (res.data) return res.data;

  const { data } = await supabase.from('branches').select('*').order('created_at', { ascending: true });
  return (data || []).map((row: any) => ({
    id: row.id,
    name: row.name,
    location: row.location,
    type: row.type,
    manager: row.manager || '',
    licenseNumber: row.license_number || '',
  }));
};

export const insertBranch = async (branch: Branch): Promise<void> => {
  await api.branchesApi.create(branch);
  await supabase.from('branches').upsert({
    id: branch.id,
    name: branch.name,
    location: branch.location,
    type: branch.type,
    manager: branch.manager,
    license_number: branch.licenseNumber,
  });
};

// ==============================================================================
// 2. Inventory API
// ==============================================================================
export const fetchInventory = async (): Promise<InventoryItem[]> => {
  const res = await api.itemsApi.listAll();
  if (res.data) {
    return res.data.map((row: any) => ({
      id: row.id,
      name: row.name,
      category: row.category,
      sku: row.sku,
      stockQty: Number(row.stock_qty ?? row.stockQty) || 0,
      unit: row.unit,
      reorderLevel: Number(row.reorder_level ?? row.reorderLevel) || 0,
      suggestedReorderQty: Number(row.suggested_reorder_qty ?? row.suggestedReorderQty) || 0,
      unitPrice: Number(row.unit_price ?? row.unitPrice) || 0,
      costPrice: Number(row.cost_price ?? row.costPrice) || 0,
      rackLocation: row.rack_location || row.rackLocation || '',
      velocity: row.velocity || 'moderate',
      daysWithoutMovement: row.days_without_movement || row.daysWithoutMovement || 0,
      supplierName: row.supplier_name || row.supplierName || '',
      batches: Array.isArray(row.batches) ? row.batches : [],
    }));
  }

  const { data } = await supabase.from('inventory').select('*').order('created_at', { ascending: false });
  return (data || []).map((row: any) => ({
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
};

export const insertInventoryItem = async (item: InventoryItem): Promise<void> => {
  await api.itemsApi.create({
    id: item.id,
    name: item.name,
    category: item.category,
    sku: item.sku,
    stockQty: item.stockQty,
    unit: item.unit,
    reorderLevel: item.reorderLevel,
    suggestedReorderQty: item.suggestedReorderQty,
    unitPrice: item.unitPrice,
    costPrice: item.costPrice,
    rackLocation: item.rackLocation,
    velocity: item.velocity,
    daysWithoutMovement: item.daysWithoutMovement,
    supplierName: item.supplierName,
    batches: item.batches,
  });
};

export const updateInventoryItem = async (id: string, updates: Partial<InventoryItem>): Promise<void> => {
  await api.itemsApi.update(id, updates);
  await supabase.from('inventory').update(updates).eq('id', id);
};

// ==============================================================================
// 3. Sales API
// ==============================================================================
export const fetchSales = async (): Promise<SaleRecord[]> => {
  const res = await api.salesApi.list();
  if (res.data) {
    return res.data.map((row: any) => ({
      id: row.id,
      invoiceNo: row.invoice_no || row.invoiceNo,
      customerName: row.customer_name || row.customerName,
      customerPhone: row.customer_phone || row.customerPhone,
      isKhata: Boolean(row.is_khata ?? row.isKhata),
      items: Array.isArray(row.items) ? row.items : [],
      total: Number(row.total) || 0,
      cashPaid: Number(row.cash_paid ?? row.cashPaid) || 0,
      khataAmount: Number(row.khata_amount ?? row.khataAmount) || 0,
      date: row.date || 'Today',
      timestamp: row.timestamp || 'Just now',
      paymentMode: row.payment_mode || row.paymentMode || 'cash',
    }));
  }

  const { data } = await supabase.from('sales').select('*').order('created_at', { ascending: false });
  return (data || []).map((row: any) => ({
    id: row.id,
    invoiceNo: row.invoice_no,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    isKhata: Boolean(row.is_khata),
    items: Array.isArray(row.items) ? row.items : [],
    total: Number(row.total) || 0,
    cashPaid: Number(row.cash_paid) || 0,
    khataAmount: Number(row.khata_amount) || 0,
    date: row.date || 'Today',
    timestamp: row.timestamp || 'Just now',
    paymentMode: row.payment_mode || 'cash',
  }));
};

export const insertSale = async (sale: SaleRecord): Promise<void> => {
  await api.salesApi.create({
    customer_name: sale.customerName,
    customer_phone: sale.customerPhone,
    is_khata: sale.isKhata,
    items: sale.items.map((i: any) => ({ item_id: i.itemId || i.name, qty: i.qty, price: i.price, batch: i.batch })),
    total: sale.total,
    cash_paid: sale.cashPaid,
    khata_amount: sale.khataAmount,
    payment_mode: sale.paymentMode,
  });
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
};

// ==============================================================================
// 4. Khata API
// ==============================================================================
export const fetchKhataLedger = async (): Promise<CustomerKhata[]> => {
  const res = await api.customersApi.list();
  if (res.data) {
    return res.data.map((row: any) => ({
      id: row.id,
      name: row.name,
      phone: row.phone,
      village: row.village,
      totalPurchased: Number(row.total_purchased ?? row.totalPurchased) || 0,
      outstandingBalance: Number(row.outstanding_balance ?? row.outstandingBalance) || 0,
      creditLimit: Number(row.credit_limit ?? row.creditLimit) || 0,
      daysOverdue: Number(row.days_overdue ?? row.daysOverdue) || 0,
      lastPaymentDate: row.last_payment_date || row.lastPaymentDate || 'N/A',
      status: row.status || 'healthy',
      ageing: row.ageing || 'current',
    }));
  }

  const { data } = await supabase.from('khata_ledger').select('*').order('days_overdue', { ascending: false });
  return (data || []).map((row: any) => ({
    id: row.id,
    name: row.name,
    phone: row.phone,
    village: row.village,
    totalPurchased: Number(row.total_purchased) || 0,
    outstandingBalance: Number(row.outstanding_balance) || 0,
    creditLimit: Number(row.credit_limit) || 0,
    daysOverdue: Number(row.days_overdue) || 0,
    lastPaymentDate: row.last_payment_date || 'N/A',
    status: row.status || 'healthy',
    ageing: row.ageing || 'current',
  }));
};

export const updateKhataCustomer = async (id: string, updates: Partial<CustomerKhata>): Promise<void> => {
  await api.customersApi.update(id, updates);
  await supabase.from('khata_ledger').update(updates).eq('id', id);
};

export const insertKhataCustomer = async (cust: CustomerKhata): Promise<void> => {
  await api.customersApi.create(cust);
  await supabase.from('khata_ledger').insert({
    id: cust.id,
    name: cust.name,
    phone: cust.phone,
    village: cust.village,
    total_purchased: cust.totalPurchased,
    outstanding_balance: cust.outstandingBalance,
    credit_limit: cust.creditLimit,
    days_overdue: cust.daysOverdue,
    last_payment_date: cust.lastPaymentDate,
    status: cust.status,
    ageing: cust.ageing,
  });
};

// ==============================================================================
// 5. Purchase Orders API
// ==============================================================================
export const fetchPurchaseOrders = async (): Promise<PurchaseOrder[]> => {
  const res = await api.purchaseOrdersApi.list();
  if (res.data) {
    return res.data.map((row: any) => ({
      id: row.id,
      poNumber: row.po_number || row.poNumber,
      supplierName: row.supplier_name || row.supplierName,
      itemsCount: Number(row.items_count ?? row.itemsCount) || 0,
      totalAmount: Number(row.total_amount ?? row.totalAmount) || 0,
      orderDate: row.order_date || row.orderDate,
      expectedDelivery: row.expected_delivery || row.expectedDelivery,
      status: row.status,
      paymentTerms: row.payment_terms || row.paymentTerms,
      notes: row.notes,
    }));
  }

  const { data } = await supabase.from('purchase_orders').select('*').order('created_at', { ascending: false });
  return (data || []).map((row: any) => ({
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
};

export const insertPurchaseOrder = async (po: PurchaseOrder): Promise<void> => {
  await api.purchaseOrdersApi.create({
    supplier_name: po.supplierName,
    items_count: po.itemsCount,
    total_amount: po.totalAmount,
    payment_terms: po.paymentTerms,
    notes: po.notes,
  });
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
};

// ==============================================================================
// 6. Plant Care API
// ==============================================================================
export const fetchPlantCareTasks = async (): Promise<PlantCareTask[]> => {
  const res = await api.plantCareApi.list();
  if (res.data) {
    return res.data.map((row: any) => ({
      id: row.id,
      title: row.title,
      category: row.category,
      section: row.section,
      timeSlot: row.time_slot || row.timeSlot,
      plantType: row.plant_type || row.plantType,
      quantity: row.quantity,
      isCompleted: Boolean(row.is_completed ?? row.isCompleted),
      notes: row.notes,
    }));
  }

  const { data } = await supabase.from('plant_care_tasks').select('*').order('created_at', { ascending: false });
  return (data || []).map((row: any) => ({
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
};

export const insertPlantCareTask = async (task: PlantCareTask): Promise<void> => {
  await api.plantCareApi.create(task);
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
};

export const updatePlantCareTask = async (id: string, updates: Partial<PlantCareTask>): Promise<void> => {
  await api.plantCareApi.toggleComplete(id, updates.notes);
  await supabase.from('plant_care_tasks').update(updates).eq('id', id);
};

// ==============================================================================
// 7. Sensors API
// ==============================================================================
export const fetchNurserySensors = async (): Promise<NurserySensor[]> => {
  const res = await api.dashboardApi.getSensors();
  if (res.data) return res.data;

  const { data } = await supabase.from('nursery_sensors').select('*').order('created_at', { ascending: true });
  return (data || []).map((row: any) => ({
    id: row.id,
    name: row.name,
    model: row.model,
    type: row.type,
    value: row.value,
    unit: row.unit,
    status: row.status,
    location: row.location,
    lastSync: row.last_sync,
    note: row.note,
  }));
};

// ==============================================================================
// 8. Compliance API
// ==============================================================================
export const fetchComplianceLicenses = async (): Promise<ComplianceLicense[]> => {
  const res = await api.complianceApi.list();
  if (res.data) {
    return res.data.map((row: any) => ({
      id: row.id,
      name: row.name,
      authority: row.authority,
      licenseNumber: row.license_number || row.licenseNumber,
      issueDate: row.issue_date || row.issueDate,
      expiryDate: row.expiry_date || row.expiryDate,
      daysRemaining: Number(row.days_remaining ?? row.daysRemaining) || 0,
      status: row.status,
      requiredDocuments: Array.isArray(row.required_documents ?? row.requiredDocuments) ? (row.required_documents ?? row.requiredDocuments) : [],
    }));
  }

  const { data } = await supabase.from('compliance_licenses').select('*').order('days_remaining', { ascending: true });
  return (data || []).map((row: any) => ({
    id: row.id,
    name: row.name,
    authority: row.authority,
    licenseNumber: row.license_number,
    issueDate: row.issue_date,
    expiryDate: row.expiry_date,
    daysRemaining: Number(row.days_remaining) || 0,
    status: row.status,
    requiredDocuments: Array.isArray(row.required_documents) ? row.required_documents : [],
  }));
};

// ==============================================================================
// 9. Activity Logs API
// ==============================================================================
export const fetchActivityLogs = async (): Promise<ActivityLog[]> => {
  const res = await api.dashboardApi.getActivityLog(1, 20);
  if (res.data) {
    return res.data.map((row: any) => ({
      id: row.id,
      action: row.action,
      details: row.details,
      user: row.user_name || row.user,
      time: row.time,
      tag: row.tag,
      referenceId: row.reference_id || row.referenceId,
    }));
  }

  const { data } = await supabase.from('activity_logs').select('*').order('created_at', { ascending: false }).limit(20);
  return (data || []).map((row: any) => ({
    id: row.id,
    action: row.action,
    details: row.details,
    user: row.user_name,
    time: row.time,
    tag: row.tag,
    referenceId: row.reference_id,
  }));
};

export const insertActivityLog = async (log: Omit<ActivityLog, 'id'>): Promise<void> => {
  await supabase.from('activity_logs').insert({
    id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    action: log.action,
    details: log.details,
    user_name: log.user,
    time: log.time,
    tag: log.tag,
    reference_id: log.referenceId,
  });
};

// ==============================================================================
// 10. Seasonal Agricultural Insights API
// ==============================================================================
export const fetchSeasonalInsight = async (): Promise<SeasonalInsight | null> => {
  const res = await api.dashboardApi.getSeasonalIntelligence();
  if (res.data) return res.data;

  const { data } = await supabase.from('seasonal_insights').select('*').order('created_at', { ascending: false }).limit(1).single();
  if (!data) return null;
  return {
    id: data.id,
    seasonName: data.season_name,
    currentPhase: data.current_phase,
    weatherCondition: data.weather_condition,
    highDemandProducts: Array.isArray(data.high_demand_products) ? data.high_demand_products : [],
    strategicAdvice: data.strategic_advice,
  };
};

// ==============================================================================
// 11. Nursery Cameras
// ==============================================================================
export const fetchNurseryCameras = async (): Promise<NurseryCamera[]> => {
  const { data } = await supabase.from('nursery_cameras').select('*').order('created_at', { ascending: true });
  return (data || []).map((row: any) => ({
    id: row.id,
    title: row.title,
    url: row.url,
    status: row.status,
    sensorsInfo: row.sensors_info,
  }));
};

// ==============================================================================
// 12. Operational Alerts API
// ==============================================================================
export const fetchOperationalAlerts = async (): Promise<OperationalAlert[]> => {
  const res = await api.dashboardApi.getAlerts();
  if (res.data) {
    return res.data.map((row: any) => ({
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

  const { data } = await supabase.from('operational_alerts').select('*').order('created_at', { ascending: false });
  return (data || []).map((row: any) => ({
    id: row.id,
    severity: row.severity,
    title: row.title,
    description: row.description,
    category: row.category,
    countOrValue: row.count_or_value,
    timestamp: row.timestamp,
    actionLabel: row.action_label,
    actionType: row.action_type,
  }));
};

export const deleteOperationalAlert = async (id: string): Promise<void> => {
  await supabase.from('operational_alerts').delete().eq('id', id);
};

// ==============================================================================
// 13. Mortality Records API
// ==============================================================================
export const fetchMortalityRecords = async (): Promise<MortalityRecord[]> => {
  const res = await api.mortalityApi.list();
  if (res.data) {
    return res.data.map((row: any) => ({
      id: row.id,
      date: row.date,
      plantName: row.plant_name || row.plantName,
      quantityLost: Number(row.quantity_lost ?? row.quantityLost) || 0,
      estimatedValue: Number(row.estimated_value ?? row.estimatedValue) || 0,
      reason: row.reason,
      section: row.section,
    }));
  }

  const { data } = await supabase.from('mortality_records').select('*').order('date', { ascending: false });
  return (data || []).map((row: any) => ({
    id: row.id,
    date: row.date,
    plantName: row.plant_name,
    quantityLost: Number(row.quantity_lost) || 0,
    estimatedValue: Number(row.estimated_value) || 0,
    reason: row.reason,
    section: row.section,
  }));
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
