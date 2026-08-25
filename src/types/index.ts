export type BusinessType = 'hybrid' | 'fertilizer' | 'nursery';

export type UserRole =
  | 'owner'
  | 'counter_staff'
  | 'inventory_manager'
  | 'procurement_user'
  | 'nursery_care_staff'
  | 'accounts_user'
  | 'admin';

export type UserStatus = 'active' | 'revoked';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  branchId?: string | null;
  status: UserStatus;
  createdAt: string;
  lastSignInAt?: string | null;
}

export interface Branch {
  id: string;
  name: string;
  location: string;
  type: BusinessType;
  manager: string;
  licenseNumber: string;
}

export interface MetricCardData {
  id: string;
  title: string;
  value: string;
  subValue?: string;
  change?: string;
  isPositive?: boolean;
  tag?: string;
  tagType?: 'good' | 'warning' | 'critical' | 'neutral';
  description: string;
  isHero?: boolean;
}

export interface OperationalAlert {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  category: 'inventory' | 'khata' | 'compliance' | 'nursery' | 'procurement';
  countOrValue?: string;
  timestamp: string;
  actionLabel: string;
  actionType: 'review_expiry' | 'create_po' | 'view_khata' | 'renew_license' | 'view_tasks' | 'stock_audit';
}

export interface InventoryItem {
  id: string;
  name: string;
  category: 'Fertilizer' | 'Bio-Fertilizer' | 'Pesticide' | 'Seeds' | 'Plant/Sapling' | 'Pot & Soil' | 'Tools';
  sku: string;
  stockQty: number;
  unit: string;
  reorderLevel: number;
  suggestedReorderQty: number;
  unitPrice: number;
  costPrice: number;
  rackLocation: string;
  velocity: 'fast' | 'moderate' | 'slow' | 'dead';
  daysWithoutMovement?: number;
  supplierName: string;
  batches: Batch[];
}

export interface Batch {
  batchNumber: string;
  manufacturingDate: string;
  expiryDate: string;
  daysRemaining: number;
  quantity: number;
  rack: string;
  status: 'healthy' | 'expiring_soon' | 'critical_expiry' | 'expired';
}

export interface CustomerKhata {
  id: string;
  name: string;
  phone: string;
  village: string;
  totalPurchased: number;
  outstandingBalance: number;
  creditLimit: number;
  daysOverdue: number;
  lastPaymentDate: string;
  status: 'healthy' | 'due_soon' | 'overdue' | 'blocked';
  ageing: 'current' | '1-30' | '31-60' | '61-90' | '90+';
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierName: string;
  itemsCount: number;
  totalAmount: number;
  orderDate: string;
  expectedDelivery: string;
  status: 'draft' | 'pending_acknowledgement' | 'dispatched' | 'grn_pending' | 'received';
  paymentTerms: string;
  notes?: string;
}

export interface PlantCareTask {
  id: string;
  title: string;
  category: 'Watering' | 'Fertilizing' | 'Pest Inspection' | 'Pruning' | 'Repotting';
  section: string;
  timeSlot: string;
  plantType: string;
  quantity: string;
  isCompleted: boolean;
  notes?: string;
}

export interface NurserySensor {
  id: string;
  name: string;
  model: string;
  type: 'moisture' | 'temperature' | 'humidity' | 'ph' | 'co2';
  value: string;
  unit: string;
  status: 'optimal' | 'warning' | 'alert';
  location: string;
  lastSync: string;
  note: string;
}

export interface ComplianceLicense {
  id: string;
  name: string;
  authority: string;
  licenseNumber: string;
  issueDate: string;
  expiryDate: string;
  daysRemaining: number;
  status: 'valid' | 'renewal_due' | 'critical' | 'expired';
  requiredDocuments: string[];
}

export interface ActivityLog {
  id: string;
  action: string;
  details: string;
  user: string;
  time: string;
  tag: 'sale' | 'khata' | 'procurement' | 'inventory' | 'nursery' | 'compliance';
  referenceId?: string;
}

export interface SaleItem {
  name: string;
  qty: number;
  price: number;
  batch: string;
}

export interface SaleRecord {
  id: string;
  invoiceNo: string;
  customerName: string;
  customerPhone?: string;
  isKhata: boolean;
  items: SaleItem[];
  total: number;
  cashPaid: number;
  khataAmount: number;
  date: string;
  timestamp: string;
  paymentMode: 'cash' | 'upi' | 'card' | 'khata' | 'split';
}

export interface SeasonalInsight {
  id?: string;
  seasonName: string;
  currentPhase: string;
  weatherCondition: string;
  highDemandProducts: {
    name: string;
    expectedSurge: string;
    stockStatus: 'adequate' | 'needs_procurement' | 'critical';
    category: string;
  }[];
  strategicAdvice: string;
}

export interface MortalityRecord {
  id: string;
  date: string;
  plantName: string;
  quantityLost: number;
  estimatedValue: number;
  reason: 'Pest Infestation' | 'Over-watering' | 'Extreme Heat' | 'Fungal Blight' | 'Root Rot' | 'Transit Damage' | string;
  section: string;
}

export interface NurseryCamera {
  id: string;
  title: string;
  url: string;
  status: string;
  sensorsInfo?: string;
}
