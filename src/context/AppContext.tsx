import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  Branch,
  BusinessType,
  OperationalAlert,
  InventoryItem,
  CustomerKhata,
  PurchaseOrder,
  PlantCareTask,
  NurserySensor,
  ComplianceLicense,
  ActivityLog,
  MortalityRecord,
  SaleRecord,
  SeasonalInsight,
  NurseryCamera,
} from '../types';
import * as db from '../services/supabaseService';
import { isSupabaseConfigured, checkSupabaseConnection } from '../lib/supabase';

interface AppContextType {
  currentBranch: Branch | null;
  setCurrentBranch: (branch: Branch) => void;
  branches: Branch[];
  businessType: BusinessType;
  setBusinessType: (type: BusinessType) => void;
  activeView: string;
  setActiveView: (view: string) => void;
  isSidebarExpanded: boolean;
  setIsSidebarExpanded: (expanded: boolean) => void;
  
  // Realtime Data State
  sales: SaleRecord[];
  setSales: React.Dispatch<React.SetStateAction<SaleRecord[]>>;
  alerts: OperationalAlert[];
  dismissAlert: (id: string) => Promise<void>;
  inventory: InventoryItem[];
  setInventory: React.Dispatch<React.SetStateAction<InventoryItem[]>>;
  khataLedger: CustomerKhata[];
  setKhataLedger: React.Dispatch<React.SetStateAction<CustomerKhata[]>>;
  purchaseOrders: PurchaseOrder[];
  setPurchaseOrders: React.Dispatch<React.SetStateAction<PurchaseOrder[]>>;
  careTasks: PlantCareTask[];
  setCareTasks: React.Dispatch<React.SetStateAction<PlantCareTask[]>>;
  toggleCareTask: (id: string) => Promise<void>;
  sensors: NurserySensor[];
  licenses: ComplianceLicense[];
  activities: ActivityLog[];
  mortalityRecords: MortalityRecord[];
  cameras: NurseryCamera[];
  seasonalInsight: SeasonalInsight | null;
  
  // Status & Connection
  isLoading: boolean;
  isSupabaseConnected: boolean;
  supabaseErrorMessage: string | null;
  refreshData: () => Promise<void>;
  
  // Filters & State
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  dateRange: 'today' | '7d' | '30d' | 'season';
  setDateRange: (range: 'today' | '7d' | '30d' | 'season') => void;
  
  // Modals
  activeModal: 'none' | 'new_sale' | 'create_po' | 'record_khata' | 'plant_care' | 'stock_adjust' | 'quick_view_alerts' | 'live_camera';
  setActiveModal: (modal: 'none' | 'new_sale' | 'create_po' | 'record_khata' | 'plant_care' | 'stock_adjust' | 'quick_view_alerts' | 'live_camera') => void;
  selectedAlertItem: OperationalAlert | null;
  setSelectedAlertItem: (alert: OperationalAlert | null) => void;
  
  // Realtime Actions
  addNewSale: (sale: { customerName: string; customerPhone?: string; isKhata: boolean; items: { name: string; qty: number; price: number; batch: string }[]; total: number; cashPaid: number; khataAmount: number }) => Promise<void>;
  createPurchaseOrder: (po: { supplierName: string; itemsCount: number; totalAmount: number; paymentTerms: string; notes?: string }) => Promise<void>;
  recordKhataPayment: (customerId: string, amount: number, paymentMode: string) => Promise<void>;
  addPlantCareTask: (task: Omit<PlantCareTask, 'id' | 'isCompleted'>) => Promise<void>;
  adjustStock: (itemId: string, batchNumber: string, varianceQty: number, reason: string) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [currentBranch, setCurrentBranch] = useState<Branch | null>(null);
  const [businessType, setBusinessType] = useState<BusinessType>('hybrid');
  const [activeView, setActiveView] = useState<string>('command_center');
  const [isSidebarExpanded, setIsSidebarExpanded] = useState<boolean>(false);
  
  // Live Data States
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [alerts, setAlerts] = useState<OperationalAlert[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [khataLedger, setKhataLedger] = useState<CustomerKhata[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [careTasks, setCareTasks] = useState<PlantCareTask[]>([]);
  const [sensors, setSensors] = useState<NurserySensor[]>([]);
  const [licenses, setLicenses] = useState<ComplianceLicense[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [mortalityRecords, setMortalityRecords] = useState<MortalityRecord[]>([]);
  const [cameras, setCameras] = useState<NurseryCamera[]>([]);
  const [seasonalInsight, setSeasonalInsight] = useState<SeasonalInsight | null>(null);
  
  // Connection and Loading State
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSupabaseConnected, setIsSupabaseConnected] = useState<boolean>(false);
  const [supabaseErrorMessage, setSupabaseErrorMessage] = useState<string | null>(null);
  
  // Filter and Modal States
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [dateRange, setDateRange] = useState<'today' | '7d' | '30d' | 'season'>('today');
  const [activeModal, setActiveModal] = useState<'none' | 'new_sale' | 'create_po' | 'record_khata' | 'plant_care' | 'stock_adjust' | 'quick_view_alerts' | 'live_camera'>('none');
  const [selectedAlertItem, setSelectedAlertItem] = useState<OperationalAlert | null>(null);

  // Sync business type when branch changes
  useEffect(() => {
    if (currentBranch) {
      setBusinessType(currentBranch.type);
    }
  }, [currentBranch]);

  // Comprehensive Data Fetcher from Supabase
  const loadAllData = useCallback(async () => {
    setIsLoading(true);
    const conn = await checkSupabaseConnection();
    setIsSupabaseConnected(conn.ok);
    setSupabaseErrorMessage(conn.ok ? null : (conn.message || 'Connection failed'));

    if (conn.ok) {
      try {
        const [
          fetchedBranches,
          fetchedInventory,
          fetchedSales,
          fetchedKhata,
          fetchedPO,
          fetchedTasks,
          fetchedSensors,
          fetchedLicenses,
          fetchedActivities,
          fetchedMortality,
          fetchedCameras,
          fetchedAlerts,
          fetchedSeason,
        ] = await Promise.all([
          db.fetchBranches(),
          db.fetchInventory(),
          db.fetchSales(),
          db.fetchKhataLedger(),
          db.fetchPurchaseOrders(),
          db.fetchPlantCareTasks(),
          db.fetchNurserySensors(),
          db.fetchComplianceLicenses(),
          db.fetchActivityLogs(),
          db.fetchMortalityRecords(),
          db.fetchNurseryCameras(),
          db.fetchOperationalAlerts(),
          db.fetchSeasonalInsights(),
        ]);

        setBranches(fetchedBranches);
        if (fetchedBranches.length > 0) {
          setCurrentBranch((prev) => prev || fetchedBranches[0]);
        }
        setInventory(fetchedInventory);
        setSales(fetchedSales);
        setKhataLedger(fetchedKhata);
        setPurchaseOrders(fetchedPO);
        setCareTasks(fetchedTasks);
        setSensors(fetchedSensors);
        setLicenses(fetchedLicenses);
        setActivities(fetchedActivities);
        setMortalityRecords(fetchedMortality);
        setCameras(fetchedCameras);
        setAlerts(fetchedAlerts);
        setSeasonalInsight(fetchedSeason);
      } catch (err: any) {
        console.error('Error fetching live data from Supabase:', err);
      }
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Setup Realtime PostgreSQL Change Listeners
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const unsubscribe = db.subscribeToRealtimeChanges((tableName) => {
      // Refresh relevant data slices in background when database changes occur
      if (tableName === 'sales') db.fetchSales().then(setSales);
      if (tableName === 'inventory') db.fetchInventory().then(setInventory);
      if (tableName === 'khata_ledger') db.fetchKhataLedger().then(setKhataLedger);
      if (tableName === 'purchase_orders') db.fetchPurchaseOrders().then(setPurchaseOrders);
      if (tableName === 'plant_care_tasks') db.fetchPlantCareTasks().then(setCareTasks);
      if (tableName === 'nursery_sensors') db.fetchNurserySensors().then(setSensors);
      if (tableName === 'activity_logs') db.fetchActivityLogs().then(setActivities);
      if (tableName === 'operational_alerts') db.fetchOperationalAlerts().then(setAlerts);
      if (tableName === 'mortality_records') db.fetchMortalityRecords().then(setMortalityRecords);
      if (tableName === 'branches') db.fetchBranches().then(setBranches);
      if (tableName === 'compliance_licenses') db.fetchComplianceLicenses().then(setLicenses);
      if (tableName === 'seasonal_insights') db.fetchSeasonalInsights().then(setSeasonalInsight);
      if (tableName === 'nursery_cameras') db.fetchNurseryCameras().then(setCameras);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const refreshData = async () => {
    await loadAllData();
  };

  const dismissAlert = async (id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
    await db.deleteOperationalAlert(id);
  };

  const toggleCareTask = async (id: string) => {
    const task = careTasks.find((t) => t.id === id);
    if (!task) return;
    const newStatus = !task.isCompleted;

    setCareTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isCompleted: newStatus } : t))
    );

    await db.updatePlantCareTaskStatus(id, newStatus);

    if (newStatus) {
      const newAct: ActivityLog = {
        id: 'act-' + Date.now(),
        action: `Completed Task: ${task.title}`,
        details: `${task.section} (${task.plantType}) verified & marked done.`,
        user: 'Current User',
        time: 'Just now',
        tag: 'nursery',
        referenceId: task.id,
      };
      setActivities((prev) => [newAct, ...prev]);
      await db.insertActivityLog(newAct);
    }
  };

  const addNewSale = async (saleData: {
    customerName: string;
    customerPhone?: string;
    isKhata: boolean;
    items: { name: string; qty: number; price: number; batch: string }[];
    total: number;
    cashPaid: number;
    khataAmount: number;
  }) => {
    const invNumber = `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const newSaleRecord: SaleRecord = {
      id: 'sal-' + Date.now(),
      invoiceNo: invNumber,
      customerName: saleData.customerName,
      customerPhone: saleData.customerPhone,
      isKhata: saleData.isKhata,
      items: saleData.items,
      total: saleData.total,
      cashPaid: saleData.cashPaid,
      khataAmount: saleData.khataAmount,
      date: new Date().toISOString().split('T')[0],
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      paymentMode: saleData.khataAmount > 0 && saleData.cashPaid > 0 ? 'split' : saleData.khataAmount > 0 ? 'khata' : 'cash',
    };

    // Optimistic state updates
    setSales((prev) => [newSaleRecord, ...prev]);

    const newAct: ActivityLog = {
      id: 'act-' + Date.now(),
      action: `Counter Sale #${invNumber} Completed`,
      details: `₹${saleData.total.toLocaleString('en-IN')} billed to ${saleData.customerName} (${saleData.isKhata ? `Khata ₹${saleData.khataAmount.toLocaleString('en-IN')}` : 'Cash/UPI'}).`,
      user: 'Counter POS',
      time: 'Just now',
      tag: 'sale',
      referenceId: invNumber,
    };
    setActivities((prev) => [newAct, ...prev]);

    // Save sale and activity log to Supabase
    await Promise.all([
      db.insertSaleRecord(newSaleRecord),
      db.insertActivityLog(newAct),
    ]);

    // If Khata credit involved, update Customer Khata Ledger
    if (saleData.khataAmount > 0) {
      const existing = khataLedger.find((k) => k.name.toLowerCase().includes(saleData.customerName.toLowerCase()));
      if (existing) {
        const updatedKhata: CustomerKhata = {
          ...existing,
          outstandingBalance: existing.outstandingBalance + saleData.khataAmount,
          totalPurchased: existing.totalPurchased + saleData.total,
          lastPaymentDate: new Date().toISOString().split('T')[0],
        };
        setKhataLedger((prev) => prev.map((k) => (k.id === existing.id ? updatedKhata : k)));
        await db.upsertKhataRecord(updatedKhata);
      } else {
        const newKhata: CustomerKhata = {
          id: 'kht-' + Date.now(),
          name: saleData.customerName,
          phone: saleData.customerPhone || '+91 98000 00000',
          village: 'Agri Zone',
          totalPurchased: saleData.total,
          outstandingBalance: saleData.khataAmount,
          creditLimit: 50000,
          daysOverdue: 1,
          lastPaymentDate: new Date().toISOString().split('T')[0],
          status: 'healthy',
          ageing: 'current',
        };
        setKhataLedger((prev) => [newKhata, ...prev]);
        await db.upsertKhataRecord(newKhata);
      }
    }

    // Deduct stock quantities in inventory
    for (const item of saleData.items) {
      const found = inventory.find((i) => i.name === item.name);
      if (found) {
        const newQty = Math.max(0, found.stockQty - item.qty);
        setInventory((prev) =>
          prev.map((inv) => (inv.id === found.id ? { ...inv, stockQty: newQty } : inv))
        );
        await db.updateInventoryItem(found.id, { stockQty: newQty });
      }
    }
  };

  const createPurchaseOrder = async (poData: {
    supplierName: string;
    itemsCount: number;
    totalAmount: number;
    paymentTerms: string;
    notes?: string;
  }) => {
    const poNum = `PO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const newPO: PurchaseOrder = {
      id: 'po-' + Date.now(),
      poNumber: poNum,
      supplierName: poData.supplierName,
      itemsCount: poData.itemsCount,
      totalAmount: poData.totalAmount,
      orderDate: new Date().toISOString().split('T')[0],
      expectedDelivery: 'In 3 Days',
      status: 'pending_acknowledgement',
      paymentTerms: poData.paymentTerms,
      notes: poData.notes,
    };

    setPurchaseOrders((prev) => [newPO, ...prev]);

    const newAct: ActivityLog = {
      id: 'act-' + Date.now(),
      action: `Purchase Order #${poNum} Issued`,
      details: `₹${poData.totalAmount.toLocaleString('en-IN')} ordered from ${poData.supplierName} (${poData.itemsCount} items).`,
      user: 'Procurement',
      time: 'Just now',
      tag: 'procurement',
      referenceId: poNum,
    };
    setActivities((prev) => [newAct, ...prev]);

    await Promise.all([
      db.insertPurchaseOrder(newPO),
      db.insertActivityLog(newAct),
    ]);
  };

  const recordKhataPayment = async (customerId: string, amount: number, paymentMode: string) => {
    const customer = khataLedger.find((c) => c.id === customerId);
    if (!customer) return;

    const newBalance = Math.max(0, customer.outstandingBalance - amount);
    const newStatus = newBalance === 0 ? 'healthy' : customer.status;
    const updatedCustomer: CustomerKhata = {
      ...customer,
      outstandingBalance: newBalance,
      lastPaymentDate: new Date().toISOString().split('T')[0],
      status: newStatus,
    };

    setKhataLedger((prev) =>
      prev.map((c) => (c.id === customerId ? updatedCustomer : c))
    );

    const newAct: ActivityLog = {
      id: 'act-' + Date.now(),
      action: `Khata Payment Recorded ₹${amount.toLocaleString('en-IN')}`,
      details: `Collected from ${customer.name} via ${paymentMode}. Settlement logged.`,
      user: 'Accounts',
      time: 'Just now',
      tag: 'khata',
    };
    setActivities((prev) => [newAct, ...prev]);

    await Promise.all([
      db.upsertKhataRecord(updatedCustomer),
      db.insertActivityLog(newAct),
    ]);
  };

  const addPlantCareTask = async (taskData: Omit<PlantCareTask, 'id' | 'isCompleted'>) => {
    const newTask: PlantCareTask = {
      id: 'tsk-' + Date.now(),
      ...taskData,
      isCompleted: false,
    };
    setCareTasks((prev) => [newTask, ...prev]);

    const newAct: ActivityLog = {
      id: 'act-' + Date.now(),
      action: `Care Task Scheduled: ${taskData.title}`,
      details: `${taskData.section} scheduled for ${taskData.timeSlot}.`,
      user: 'Nursery Tech',
      time: 'Just now',
      tag: 'nursery',
    };
    setActivities((prev) => [newAct, ...prev]);

    await Promise.all([
      db.insertPlantCareTask(newTask),
      db.insertActivityLog(newAct),
    ]);
  };

  const adjustStock = async (itemId: string, batchNumber: string, varianceQty: number, reason: string) => {
    const item = inventory.find((i) => i.id === itemId);
    if (!item) return;

    const newQty = Math.max(0, item.stockQty + varianceQty);
    const updatedItem = { ...item, stockQty: newQty };

    setInventory((prev) =>
      prev.map((i) => (i.id === itemId ? updatedItem : i))
    );

    const newAct: ActivityLog = {
      id: 'act-' + Date.now(),
      action: `Stock Adjustment (${varianceQty > 0 ? '+' : ''}${varianceQty})`,
      details: `${item.name} (Batch ${batchNumber}) adjusted. Reason: ${reason}.`,
      user: 'Warehouse',
      time: 'Just now',
      tag: 'inventory',
    };
    setActivities((prev) => [newAct, ...prev]);

    await Promise.all([
      db.updateInventoryItem(itemId, { stockQty: newQty }),
      db.insertActivityLog(newAct),
    ]);
  };

  return (
    <AppContext.Provider
      value={{
        currentBranch,
        setCurrentBranch,
        branches,
        businessType,
        setBusinessType,
        activeView,
        setActiveView,
        isSidebarExpanded,
        setIsSidebarExpanded,
        sales,
        setSales,
        alerts,
        dismissAlert,
        inventory,
        setInventory,
        khataLedger,
        setKhataLedger,
        purchaseOrders,
        setPurchaseOrders,
        careTasks,
        setCareTasks,
        toggleCareTask,
        sensors,
        licenses,
        activities,
        mortalityRecords,
        cameras,
        seasonalInsight,
        isLoading,
        isSupabaseConnected,
        supabaseErrorMessage,
        refreshData,
        searchQuery,
        setSearchQuery,
        dateRange,
        setDateRange,
        activeModal,
        setActiveModal,
        selectedAlertItem,
        setSelectedAlertItem,
        addNewSale,
        createPurchaseOrder,
        recordKhataPayment,
        addPlantCareTask,
        adjustStock,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
