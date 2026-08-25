import React, { createContext, useContext, useState, useEffect } from 'react';
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
} from '../types';
import {
  initialBranches,
  initialAlerts,
  initialInventory,
  initialKhataLedger,
  initialPurchaseOrders,
  initialCareTasks,
  initialSensors,
  initialLicenses,
  initialActivities,
  initialMortalityRecords,
  initialSales,
} from '../data/mockData';

interface AppContextType {
  currentBranch: Branch;
  setCurrentBranch: (branch: Branch) => void;
  branches: Branch[];
  businessType: BusinessType;
  setBusinessType: (type: BusinessType) => void;
  activeView: string;
  setActiveView: (view: string) => void;
  isSidebarExpanded: boolean;
  setIsSidebarExpanded: (expanded: boolean) => void;
  
  // Data state
  sales: SaleRecord[];
  setSales: React.Dispatch<React.SetStateAction<SaleRecord[]>>;
  alerts: OperationalAlert[];
  dismissAlert: (id: string) => void;
  inventory: InventoryItem[];
  setInventory: React.Dispatch<React.SetStateAction<InventoryItem[]>>;
  khataLedger: CustomerKhata[];
  setKhataLedger: React.Dispatch<React.SetStateAction<CustomerKhata[]>>;
  purchaseOrders: PurchaseOrder[];
  setPurchaseOrders: React.Dispatch<React.SetStateAction<PurchaseOrder[]>>;
  careTasks: PlantCareTask[];
  setCareTasks: React.Dispatch<React.SetStateAction<PlantCareTask[]>>;
  toggleCareTask: (id: string) => void;
  sensors: NurserySensor[];
  licenses: ComplianceLicense[];
  activities: ActivityLog[];
  mortalityRecords: MortalityRecord[];
  
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
  
  // Actions
  addNewSale: (sale: { customerName: string; isKhata: boolean; items: { name: string; qty: number; price: number; batch: string }[]; total: number; cashPaid: number; khataAmount: number }) => void;
  createPurchaseOrder: (po: { supplierName: string; itemsCount: number; totalAmount: number; paymentTerms: string; notes?: string }) => void;
  recordKhataPayment: (customerId: string, amount: number, paymentMode: string) => void;
  addPlantCareTask: (task: Omit<PlantCareTask, 'id' | 'isCompleted'>) => void;
  adjustStock: (itemId: string, batchNumber: string, varianceQty: number, reason: string) => void;
  
  // Data management
  clearAllData: () => void;
  loadDemoData: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

function getInitialState<T>(key: string, fallback: T): T {
  try {
    const saved = localStorage.getItem(`mridaos_${key}`);
    if (saved !== null) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error(`Error loading state for ${key}`, e);
  }
  return fallback;
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [branches] = useState<Branch[]>(initialBranches);
  const [currentBranch, setCurrentBranch] = useState<Branch>(initialBranches[0]);
  const [businessType, setBusinessType] = useState<BusinessType>('hybrid');
  const [activeView, setActiveView] = useState<string>('command_center');
  const [isSidebarExpanded, setIsSidebarExpanded] = useState<boolean>(false);
  
  const [sales, setSales] = useState<SaleRecord[]>(() => getInitialState('sales', initialSales));
  const [alerts, setAlerts] = useState<OperationalAlert[]>(() => getInitialState('alerts', initialAlerts));
  const [inventory, setInventory] = useState<InventoryItem[]>(() => getInitialState('inventory', initialInventory));
  const [khataLedger, setKhataLedger] = useState<CustomerKhata[]>(() => getInitialState('khata', initialKhataLedger));
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(() => getInitialState('purchase_orders', initialPurchaseOrders));
  const [careTasks, setCareTasks] = useState<PlantCareTask[]>(() => getInitialState('care_tasks', initialCareTasks));
  const [sensors] = useState<NurserySensor[]>(initialSensors);
  const [licenses] = useState<ComplianceLicense[]>(initialLicenses);
  const [activities, setActivities] = useState<ActivityLog[]>(() => getInitialState('activities', initialActivities));
  const [mortalityRecords, setMortalityRecords] = useState<MortalityRecord[]>(() => getInitialState('mortality', initialMortalityRecords));
  
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

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem('mridaos_sales', JSON.stringify(sales));
  }, [sales]);
  useEffect(() => {
    localStorage.setItem('mridaos_inventory', JSON.stringify(inventory));
  }, [inventory]);
  useEffect(() => {
    localStorage.setItem('mridaos_khata', JSON.stringify(khataLedger));
  }, [khataLedger]);
  useEffect(() => {
    localStorage.setItem('mridaos_purchase_orders', JSON.stringify(purchaseOrders));
  }, [purchaseOrders]);
  useEffect(() => {
    localStorage.setItem('mridaos_care_tasks', JSON.stringify(careTasks));
  }, [careTasks]);
  useEffect(() => {
    localStorage.setItem('mridaos_alerts', JSON.stringify(alerts));
  }, [alerts]);
  useEffect(() => {
    localStorage.setItem('mridaos_activities', JSON.stringify(activities));
  }, [activities]);
  useEffect(() => {
    localStorage.setItem('mridaos_mortality', JSON.stringify(mortalityRecords));
  }, [mortalityRecords]);

  const clearAllData = () => {
    setSales([]);
    setInventory([]);
    setKhataLedger([]);
    setPurchaseOrders([]);
    setCareTasks([]);
    setAlerts([]);
    setActivities([
      {
        id: 'act-' + Date.now(),
        action: 'Workspace Cleared',
        details: 'All temporary demo data removed. System ready for live store input.',
        user: 'Owner (You)',
        time: 'Just now',
        tag: 'compliance',
      },
    ]);
    setMortalityRecords([]);
  };

  const loadDemoData = () => {
    setSales(initialSales);
    setInventory(initialInventory);
    setKhataLedger(initialKhataLedger);
    setPurchaseOrders(initialPurchaseOrders);
    setCareTasks(initialCareTasks);
    setAlerts(initialAlerts);
    setActivities(initialActivities);
    setMortalityRecords(initialMortalityRecords);
  };

  const dismissAlert = (id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  const toggleCareTask = (id: string) => {
    setCareTasks((prev) =>
      prev.map((task) => {
        if (task.id === id) {
          const updatedState = !task.isCompleted;
          if (updatedState) {
            const newAct: ActivityLog = {
              id: 'act-' + Date.now(),
              action: `Completed Task: ${task.title}`,
              details: `${task.section} (${task.plantType}) verified & marked done.`,
              user: 'Current User',
              time: 'Just now',
              tag: 'nursery',
              referenceId: task.id,
            };
            setActivities((acts) => [newAct, ...acts]);
          }
          return { ...task, isCompleted: updatedState };
        }
        return task;
      })
    );
  };

  const addNewSale = (saleData: {
    customerName: string;
    isKhata: boolean;
    items: { name: string; qty: number; price: number; batch: string }[];
    total: number;
    cashPaid: number;
    khataAmount: number;
  }) => {
    const invNumber = `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    
    // Create new Sale record
    const newSaleRecord: SaleRecord = {
      id: 'sal-' + Date.now(),
      invoiceNo: invNumber,
      customerName: saleData.customerName,
      isKhata: saleData.isKhata,
      items: saleData.items,
      total: saleData.total,
      cashPaid: saleData.cashPaid,
      khataAmount: saleData.khataAmount,
      date: new Date().toISOString().split('T')[0],
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      paymentMode: saleData.khataAmount > 0 && saleData.cashPaid > 0 ? 'split' : saleData.khataAmount > 0 ? 'khata' : 'cash',
    };
    setSales((prev) => [newSaleRecord, ...prev]);

    // Add activity
    const newAct: ActivityLog = {
      id: 'act-' + Date.now(),
      action: `Counter Sale #${invNumber} Completed`,
      details: `₹${saleData.total.toLocaleString('en-IN')} billed to ${saleData.customerName} (${saleData.isKhata ? `Khata ₹${saleData.khataAmount.toLocaleString('en-IN')}` : 'Cash/UPI'}).`,
      user: 'Counter 1 (You)',
      time: 'Just now',
      tag: 'sale',
      referenceId: invNumber,
    };
    setActivities((acts) => [newAct, ...acts]);

    // If Khata involved, update or add to Khata Ledger
    if (saleData.khataAmount > 0) {
      setKhataLedger((prev) => {
        const existing = prev.find((k) => k.name.toLowerCase().includes(saleData.customerName.toLowerCase()));
        if (existing) {
          return prev.map((k) =>
            k.id === existing.id
              ? {
                  ...k,
                  outstandingBalance: k.outstandingBalance + saleData.khataAmount,
                  totalPurchased: k.totalPurchased + saleData.total,
                }
              : k
          );
        } else {
          const newKhata: CustomerKhata = {
            id: 'kht-' + Date.now(),
            name: saleData.customerName,
            phone: '+91 98' + Math.floor(10000000 + Math.random() * 90000000),
            village: 'Nashik Agro Zone',
            totalPurchased: saleData.total,
            outstandingBalance: saleData.khataAmount,
            creditLimit: 50000,
            daysOverdue: 1,
            lastPaymentDate: new Date().toISOString().split('T')[0],
            status: 'healthy',
            ageing: 'current',
          };
          return [newKhata, ...prev];
        }
      });
    }

    // Deduct stock from inventory
    setInventory((prev) =>
      prev.map((item) => {
        const matched = saleData.items.find((si) => si.name === item.name);
        if (matched) {
          const newQty = Math.max(0, item.stockQty - matched.qty);
          return { ...item, stockQty: newQty };
        }
        return item;
      })
    );
  };

  const createPurchaseOrder = (poData: {
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
    };
    setPurchaseOrders((prev) => [newPO, ...prev]);

    const newAct: ActivityLog = {
      id: 'act-' + Date.now(),
      action: `Purchase Order #${poNum} Issued`,
      details: `₹${poData.totalAmount.toLocaleString('en-IN')} ordered from ${poData.supplierName} (${poData.itemsCount} line items).`,
      user: 'Owner (You)',
      time: 'Just now',
      tag: 'procurement',
      referenceId: poNum,
    };
    setActivities((acts) => [newAct, ...acts]);
  };

  const recordKhataPayment = (customerId: string, amount: number, paymentMode: string) => {
    setKhataLedger((prev) =>
      prev.map((customer) => {
        if (customer.id === customerId) {
          const newBalance = Math.max(0, customer.outstandingBalance - amount);
          const newStatus = newBalance === 0 ? 'healthy' : customer.status;
          return {
            ...customer,
            outstandingBalance: newBalance,
            lastPaymentDate: new Date().toISOString().split('T')[0],
            status: newStatus,
          };
        }
        return customer;
      })
    );

    const customer = khataLedger.find((c) => c.id === customerId);
    const newAct: ActivityLog = {
      id: 'act-' + Date.now(),
      action: `Khata Payment Recorded ₹${amount.toLocaleString('en-IN')}`,
      details: `Collected from ${customer ? customer.name : 'Customer'} via ${paymentMode}. Settlement logged.`,
      user: 'Accountant (You)',
      time: 'Just now',
      tag: 'khata',
    };
    setActivities((acts) => [newAct, ...acts]);
  };

  const addPlantCareTask = (taskData: Omit<PlantCareTask, 'id' | 'isCompleted'>) => {
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
    setActivities((acts) => [newAct, ...acts]);
  };

  const adjustStock = (itemId: string, batchNumber: string, varianceQty: number, reason: string) => {
    setInventory((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          const newQty = Math.max(0, item.stockQty + varianceQty);
          return { ...item, stockQty: newQty };
        }
        return item;
      })
    );

    const item = inventory.find((i) => i.id === itemId);
    const newAct: ActivityLog = {
      id: 'act-' + Date.now(),
      action: `Stock Adjustment (${varianceQty > 0 ? '+' : ''}${varianceQty})`,
      details: `${item ? item.name : 'Item'} (Batch ${batchNumber}) adjusted. Reason: ${reason}.`,
      user: 'Store Manager',
      time: 'Just now',
      tag: 'inventory',
    };
    setActivities((acts) => [newAct, ...acts]);
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
        clearAllData,
        loadDemoData,
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
