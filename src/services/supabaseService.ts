import { supabase } from '../lib/supabase';
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
} from '../types';

// ==============================================================================
// 1. Branches
// ==============================================================================
export const fetchBranches = async (): Promise<Branch[]> => {
  const { data, error } = await supabase.from('branches').select('*').order('created_at', { ascending: true });
  if (error) {
    console.error('Error fetching branches:', error);
    return [];
  }
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
// 2. Inventory
// ==============================================================================
export const fetchInventory = async (): Promise<InventoryItem[]> => {
  const { data, error } = await supabase.from('inventory').select('*').order('created_at', { ascending: false });
  if (error) {
    console.error('Error fetching inventory:', error);
    return [];
  }
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
    days_without_movement: item.daysWithoutMovement || 0,
    supplier_name: item.supplierName,
    batches: item.batches,
  });
};

export const updateInventoryItem = async (id: string, updates: Partial<InventoryItem>): Promise<void> => {
  const dbUpdates: any = {};
  if (updates.name !== undefined) dbUpdates.name = updates.name;
  if (updates.category !== undefined) dbUpdates.category = updates.category;
  if (updates.sku !== undefined) dbUpdates.sku = updates.sku;
  if (updates.stockQty !== undefined) dbUpdates.stock_qty = updates.stockQty;
  if (updates.unit !== undefined) dbUpdates.unit = updates.unit;
  if (updates.reorderLevel !== undefined) dbUpdates.reorder_level = updates.reorderLevel;
  if (updates.suggestedReorderQty !== undefined) dbUpdates.suggested_reorder_qty = updates.suggestedReorderQty;
  if (updates.unitPrice !== undefined) dbUpdates.unit_price = updates.unitPrice;
  if (updates.costPrice !== undefined) dbUpdates.cost_price = updates.costPrice;
  if (updates.rackLocation !== undefined) dbUpdates.rack_location = updates.rackLocation;
  if (updates.velocity !== undefined) dbUpdates.velocity = updates.velocity;
  if (updates.daysWithoutMovement !== undefined) dbUpdates.days_without_movement = updates.daysWithoutMovement;
  if (updates.supplierName !== undefined) dbUpdates.supplier_name = updates.supplierName;
  if (updates.batches !== undefined) dbUpdates.batches = updates.batches;

  await supabase.from('inventory').update(dbUpdates).eq('id', id);
};

// ==============================================================================
// 3. Sales
// ==============================================================================
export const fetchSales = async (): Promise<SaleRecord[]> => {
  const { data, error } = await supabase.from('sales').select('*').order('created_at', { ascending: false });
  if (error) {
    console.error('Error fetching sales:', error);
    return [];
  }
  return (data || []).map((row: any) => ({
    id: row.id,
    invoiceNo: row.invoice_no,
    customerName: row.customer_name,
    customerPhone: row.customer_phone || undefined,
    isKhata: Boolean(row.is_khata),
    items: Array.isArray(row.items) ? row.items : [],
    total: Number(row.total) || 0,
    cashPaid: Number(row.cash_paid) || 0,
    khataAmount: Number(row.khata_amount) || 0,
    date: row.date,
    timestamp: row.timestamp || '',
    paymentMode: row.payment_mode || 'cash',
  }));
};

export const insertSaleRecord = async (sale: SaleRecord): Promise<void> => {
  await supabase.from('sales').insert({
    id: sale.id,
    invoice_no: sale.invoiceNo,
    customer_name: sale.customerName,
    customer_phone: sale.customerPhone || null,
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
// 4. Khata Ledger
// ==============================================================================
export const fetchKhataLedger = async (): Promise<CustomerKhata[]> => {
  const { data, error } = await supabase.from('khata_ledger').select('*').order('created_at', { ascending: false });
  if (error) {
    console.error('Error fetching khata ledger:', error);
    return [];
  }
  return (data || []).map((row: any) => ({
    id: row.id,
    name: row.name,
    phone: row.phone || '',
    village: row.village || '',
    totalPurchased: Number(row.total_purchased) || 0,
    outstandingBalance: Number(row.outstanding_balance) || 0,
    creditLimit: Number(row.credit_limit) || 50000,
    daysOverdue: Number(row.days_overdue) || 0,
    lastPaymentDate: row.last_payment_date || '',
    status: row.status || 'healthy',
    ageing: row.ageing || 'current',
  }));
};

export const upsertKhataRecord = async (khata: CustomerKhata): Promise<void> => {
  await supabase.from('khata_ledger').upsert({
    id: khata.id,
    name: khata.name,
    phone: khata.phone,
    village: khata.village,
    total_purchased: khata.totalPurchased,
    outstanding_balance: khata.outstandingBalance,
    credit_limit: khata.creditLimit,
    days_overdue: khata.daysOverdue,
    last_payment_date: khata.lastPaymentDate || null,
    status: khata.status,
    ageing: khata.ageing,
  });
};

// ==============================================================================
// 5. Purchase Orders
// ==============================================================================
export const fetchPurchaseOrders = async (): Promise<PurchaseOrder[]> => {
  const { data, error } = await supabase.from('purchase_orders').select('*').order('created_at', { ascending: false });
  if (error) {
    console.error('Error fetching purchase orders:', error);
    return [];
  }
  return (data || []).map((row: any) => ({
    id: row.id,
    poNumber: row.po_number,
    supplierName: row.supplier_name,
    itemsCount: Number(row.items_count) || 1,
    totalAmount: Number(row.total_amount) || 0,
    orderDate: row.order_date,
    expectedDelivery: row.expected_delivery || '',
    status: row.status || 'pending_acknowledgement',
    paymentTerms: row.payment_terms || '',
    notes: row.notes || undefined,
  }));
};

export const insertPurchaseOrder = async (po: PurchaseOrder): Promise<void> => {
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
    notes: po.notes || null,
  });
};

// ==============================================================================
// 6. Plant Care Tasks
// ==============================================================================
export const fetchPlantCareTasks = async (): Promise<PlantCareTask[]> => {
  const { data, error } = await supabase.from('plant_care_tasks').select('*').order('created_at', { ascending: true });
  if (error) {
    console.error('Error fetching care tasks:', error);
    return [];
  }
  return (data || []).map((row: any) => ({
    id: row.id,
    title: row.title,
    category: row.category,
    section: row.section,
    timeSlot: row.time_slot,
    plantType: row.plant_type,
    quantity: row.quantity || '',
    isCompleted: Boolean(row.is_completed),
    notes: row.notes || undefined,
  }));
};

export const insertPlantCareTask = async (task: PlantCareTask): Promise<void> => {
  await supabase.from('plant_care_tasks').insert({
    id: task.id,
    title: task.title,
    category: task.category,
    section: task.section,
    time_slot: task.timeSlot,
    plant_type: task.plantType,
    quantity: task.quantity,
    is_completed: task.isCompleted,
    notes: task.notes || null,
  });
};

export const updatePlantCareTaskStatus = async (id: string, isCompleted: boolean): Promise<void> => {
  await supabase.from('plant_care_tasks').update({ is_completed: isCompleted }).eq('id', id);
};

// ==============================================================================
// 7. Nursery Sensors
// ==============================================================================
export const fetchNurserySensors = async (): Promise<NurserySensor[]> => {
  const { data, error } = await supabase.from('nursery_sensors').select('*').order('created_at', { ascending: true });
  if (error) {
    console.error('Error fetching sensors:', error);
    return [];
  }
  return (data || []).map((row: any) => ({
    id: row.id,
    name: row.name,
    model: row.model || '',
    type: row.type,
    value: row.value,
    unit: row.unit,
    status: row.status || 'optimal',
    location: row.location,
    lastSync: row.last_sync || 'Live',
    note: row.note || '',
  }));
};

// ==============================================================================
// 8. Compliance Licenses
// ==============================================================================
export const fetchComplianceLicenses = async (): Promise<ComplianceLicense[]> => {
  const { data, error } = await supabase.from('compliance_licenses').select('*').order('created_at', { ascending: true });
  if (error) {
    console.error('Error fetching compliance licenses:', error);
    return [];
  }
  return (data || []).map((row: any) => ({
    id: row.id,
    name: row.name,
    authority: row.authority,
    licenseNumber: row.license_number,
    issueDate: row.issue_date,
    expiryDate: row.expiry_date,
    daysRemaining: Number(row.days_remaining) || 0,
    status: row.status || 'valid',
    requiredDocuments: Array.isArray(row.required_documents) ? row.required_documents : [],
  }));
};

// ==============================================================================
// 9. Activity Logs
// ==============================================================================
export const fetchActivityLogs = async (): Promise<ActivityLog[]> => {
  const { data, error } = await supabase.from('activity_logs').select('*').order('created_at', { ascending: false }).limit(50);
  if (error) {
    console.error('Error fetching activity logs:', error);
    return [];
  }
  return (data || []).map((row: any) => ({
    id: row.id,
    action: row.action,
    details: row.details,
    user: row.user_name,
    time: row.time,
    tag: row.tag || 'inventory',
    referenceId: row.reference_id || undefined,
  }));
};

export const insertActivityLog = async (log: ActivityLog): Promise<void> => {
  await supabase.from('activity_logs').insert({
    id: log.id,
    action: log.action,
    details: log.details,
    user_name: log.user,
    time: log.time,
    tag: log.tag,
    reference_id: log.referenceId || null,
  });
};

// ==============================================================================
// 10. Seasonal Insights
// ==============================================================================
export const fetchSeasonalInsights = async (): Promise<SeasonalInsight | null> => {
  const { data, error } = await supabase.from('seasonal_insights').select('*').order('created_at', { ascending: false }).limit(1);
  if (error || !data || data.length === 0) {
    return null;
  }
  const row = data[0];
  return {
    id: row.id,
    seasonName: row.season_name,
    currentPhase: row.current_phase,
    weatherCondition: row.weather_condition,
    strategicAdvice: row.strategic_advice,
    highDemandProducts: Array.isArray(row.high_demand_products) ? row.high_demand_products : [],
  };
};

// ==============================================================================
// 11. Nursery Cameras
// ==============================================================================
export const fetchNurseryCameras = async (): Promise<NurseryCamera[]> => {
  const { data, error } = await supabase.from('nursery_cameras').select('*').order('created_at', { ascending: true });
  if (error) {
    console.error('Error fetching nursery cameras:', error);
    return [];
  }
  return (data || []).map((row: any) => ({
    id: row.id,
    title: row.title,
    url: row.url,
    status: row.status || 'Live 1080p',
    sensorsInfo: row.sensors_info || '',
  }));
};

// ==============================================================================
// 12. Operational Alerts
// ==============================================================================
export const fetchOperationalAlerts = async (): Promise<OperationalAlert[]> => {
  const { data, error } = await supabase.from('operational_alerts').select('*').order('created_at', { ascending: false });
  if (error) {
    console.error('Error fetching alerts:', error);
    return [];
  }
  return (data || []).map((row: any) => ({
    id: row.id,
    severity: row.severity,
    title: row.title,
    description: row.description,
    category: row.category,
    countOrValue: row.count_or_value || undefined,
    timestamp: row.timestamp,
    actionLabel: row.action_label || '',
    actionType: row.action_type || 'stock_audit',
  }));
};

export const deleteOperationalAlert = async (id: string): Promise<void> => {
  await supabase.from('operational_alerts').delete().eq('id', id);
};

// ==============================================================================
// 13. Mortality Records
// ==============================================================================
export const fetchMortalityRecords = async (): Promise<MortalityRecord[]> => {
  const { data, error } = await supabase.from('mortality_records').select('*').order('created_at', { ascending: false });
  if (error) {
    console.error('Error fetching mortality records:', error);
    return [];
  }
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
// Realtime Subscription Setup for all Tables
// ==============================================================================
export const subscribeToRealtimeChanges = (onTableChange: (tableName: string, payload: any) => void) => {
  const channel = supabase
    .channel('public:mridaos_realtime')
    .on('postgres_changes', { event: '*', schema: 'public' }, (payload) => {
      onTableChange(payload.table, payload);
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};
