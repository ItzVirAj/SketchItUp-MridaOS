import React from 'react';
import { useApp } from '../context/AppContext';
import {
  ArrowUpRight,
  TrendingUp,
  CreditCard,
  Package,
  Truck,
  Sprout,
  CloudRain,
  MapPin,
  Clock,
} from 'lucide-react';

export const MetricCards: React.FC = () => {
  const {
    sales,
    khataLedger,
    inventory,
    purchaseOrders,
    careTasks,
    mortalityRecords,
    setActiveView,
    setActiveModal,
  } = useApp();

  // 1. Sales Calculations
  const todayDateStr = new Date().toISOString().split('T')[0];
  const todaySalesList = sales.filter((s) => s.date === todayDateStr || !s.date);
  const todayGross = todaySalesList.reduce((sum, s) => sum + s.total, 0);
  const todayCash = todaySalesList.reduce((sum, s) => sum + s.cashPaid, 0);
  const todayKhata = todaySalesList.reduce((sum, s) => sum + s.khataAmount, 0);
  const todayCount = todaySalesList.length;
  const cashPct = todayGross > 0 ? Math.round((todayCash / todayGross) * 100) : 100;
  const khataPct = 100 - cashPct;

  // 2. Khata Calculations
  const totalOutstanding = khataLedger.reduce((sum, k) => sum + k.outstandingBalance, 0);
  const totalOverdue = khataLedger.filter((k) => k.daysOverdue > 60).reduce((sum, k) => sum + k.outstandingBalance, 0);
  const overdueAccountsCount = khataLedger.filter((k) => k.daysOverdue > 60).length;
  const totalPurchasedAll = khataLedger.reduce((sum, k) => sum + k.totalPurchased, 0);
  const recoveryRate = totalPurchasedAll > 0
    ? Math.max(0, Math.min(100, Math.round(((totalPurchasedAll - totalOutstanding) / totalPurchasedAll) * 100)))
    : 100;

  // 3. Inventory Calculations
  const totalInventoryValue = inventory.reduce((sum, item) => sum + item.stockQty * item.costPrice, 0);
  const lowStockCount = inventory.filter((i) => i.stockQty <= i.reorderLevel).length;
  let expiringBatchesCount = 0;
  let totalBatchesCount = 0;
  let expiredBatchesCount = 0;
  inventory.forEach((item) => {
    (item.batches || []).forEach((b) => {
      totalBatchesCount++;
      if (b.daysRemaining <= 30) expiringBatchesCount++;
      if (b.status === 'expired' || b.daysRemaining <= 0) expiredBatchesCount++;
    });
  });
  const fefoCompliancePct = totalBatchesCount > 0
    ? Math.round(((totalBatchesCount - expiredBatchesCount) / totalBatchesCount) * 100)
    : 100;

  // 4. Procurement Calculations
  const activePOs = purchaseOrders.filter((po) => po.status !== 'received');
  const totalOpenPOAmount = activePOs.reduce((sum, po) => sum + po.totalAmount, 0);
  const pendingAckCount = purchaseOrders.filter((po) => po.status === 'pending_acknowledgement').length;
  const inTransitCount = purchaseOrders.filter((po) => po.status === 'dispatched').length;

  // 5. Nursery Calculations
  const totalTasks = careTasks.length;
  const completedTasks = careTasks.filter((t) => t.isCompleted).length;
  const taskPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 100;
  const pendingCareTasks = careTasks.filter((t) => !t.isCompleted);
  const totalMortalityLoss = mortalityRecords.reduce((sum, m) => sum + m.quantityLost, 0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
      {/* 1. Agro Weather & Plot Context Card */}
      <div className="md:col-span-12 lg:col-span-4 bg-white rounded-3xl p-4 sm:p-5 border border-[#E2EAE5] card-shadow flex flex-col justify-between relative overflow-hidden">
        {/* Subtle decorative plot map lines in background */}
        <div className="absolute right-3 top-3 w-32 h-28 opacity-15 pointer-events-none">
          <svg viewBox="0 0 120 100" fill="none" stroke="#079455" strokeWidth="1.5">
            <path d="M10 20 L50 10 L100 30 L80 90 L20 80 Z" strokeDasharray="3 3" />
            <rect x="45" y="35" width="28" height="38" rx="4" fill="#1A1A1A" />
            <circle cx="59" cy="54" r="2.5" fill="white" />
            <rect x="78" y="30" width="26" height="34" rx="4" fill="#E0EAE4" />
            <circle cx="91" cy="47" r="2.5" fill="#079455" />
          </svg>
        </div>

        <div>
          <div className="flex items-center justify-between text-[#68776F] text-xs font-medium mb-2">
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#079455]" />
              <span className="font-semibold text-[#1A1A1A]">Nashik Agri-Zone, MH</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })} • Live</span>
            </div>
          </div>

          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl sm:text-4xl font-bold tracking-tight text-[#1A1A1A]">24°C</span>
            <div className="flex items-center gap-1.5 text-xs text-[#68776F] font-semibold">
              <CloudRain className="w-4 h-4 text-[#079455]" />
              <span>Moderate Monsoon</span>
              <span className="text-[#99A6A0] font-normal">• H:28° L:21°</span>
            </div>
          </div>
        </div>

        {/* Plot and sector detail badge */}
        <div className="mt-4 pt-3 border-t border-[#F0F5F2] flex items-center justify-between">
          <div className="bg-[#F4EDDE] px-3 py-2 rounded-2xl border border-[#EBE0C8] flex items-center justify-between w-full">
            <div>
              <div className="text-[11px] font-bold text-[#4F390D] flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#079455] animate-ping"></span>
                Kharif Sowing Season Active
              </div>
              <div className="text-[10px] text-[#7A602B]">
                {lowStockCount > 0
                  ? `${lowStockCount} SKUs below buffer level. High demand season.`
                  : 'All essential fertilizers and seeds stocked to optimal levels.'}
              </div>
            </div>
            <button
              onClick={() => setActiveView('intelligence')}
              className="p-1 rounded-lg bg-white/80 text-[#4F390D] hover:bg-white text-xs font-bold flex items-center gap-0.5 ml-2 shadow-2xs"
              title="View Seasonal Advisory"
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Signature Green Gradient Hero Card */}
      <div className="md:col-span-6 lg:col-span-4 bg-gradient-to-br from-[#35C56E] to-[#079455] rounded-3xl p-4 sm:p-5 text-white green-card-shadow flex flex-col justify-between relative overflow-hidden group">
        {/* Top Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
            <span className="text-xs sm:text-sm font-semibold tracking-tight text-white/90">
              Today's Gross Sales
            </span>
          </div>
          <button
            id="hero-card-drilldown"
            onClick={() => setActiveView('sales_pos')}
            className="w-7 h-7 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white hover:text-[#079455] transition-colors"
            title="Open Sales POS & GST Invoices"
          >
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>

        {/* Main Metric */}
        <div className="my-3">
          <div className="flex items-baseline gap-2.5">
            <span className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              ₹{todayGross.toLocaleString('en-IN')}
            </span>
            <span className="px-2 py-0.5 rounded-full bg-white text-[#079455] text-xs font-bold shadow-2xs">
              {todayCount} Orders
            </span>
          </div>
          <p className="text-xs text-white/90 mt-1 font-medium">
            {todayCount > 0
              ? `${todayCount} Counter sales • ₹${todayCash.toLocaleString('en-IN')} Cash/UPI & ₹${todayKhata.toLocaleString('en-IN')} Khata`
              : 'No sales recorded yet today. Click + Sale to record counter sale.'}
          </p>
        </div>

        {/* Progress / Cash ratio bar */}
        <div className="pt-2 border-t border-white/20">
          <div className="flex items-center justify-between text-[11px] text-white/90 font-medium mb-1">
            <span>Cash/UPI ({cashPct}%)</span>
            <span>Khata Credit ({khataPct}%)</span>
          </div>
          <div className="w-full h-2 bg-black/15 rounded-full overflow-hidden flex">
            <div className="h-full bg-white rounded-l-full transition-all duration-500" style={{ width: `${cashPct}%` }}></div>
            <div className="h-full bg-[#F9AD19] rounded-r-full transition-all duration-500" style={{ width: `${khataPct}%` }}></div>
          </div>
        </div>
      </div>

      {/* 3. Outstanding Khata Card */}
      <div className="md:col-span-6 lg:col-span-4 bg-white rounded-3xl p-4 sm:p-5 border border-[#E2EAE5] card-shadow flex flex-col justify-between group">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#FEE4E2] text-[#D92D20] flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
            <span className="text-xs sm:text-sm font-bold text-[#1A1A1A]">
              Outstanding Khata
            </span>
          </div>
          <button
            onClick={() => setActiveView('khata_ledger')}
            className="w-7 h-7 rounded-xl bg-[#EFF5F1] text-[#6E7E75] hover:bg-[#1A1A1A] hover:text-white transition-colors flex items-center justify-center"
            title="View Khata Ledger"
          >
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>

        <div className="my-3">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-[#1A1A1A]">
              ₹{totalOutstanding.toLocaleString('en-IN')}
            </span>
            {totalOverdue > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-[#FEE4E2] text-[#D92D20] text-xs font-bold">
                ₹{totalOverdue.toLocaleString('en-IN')} Overdue
              </span>
            )}
          </div>
          <p className="text-xs text-[#68776F] mt-1 font-medium">
            {khataLedger.length} active farmer accounts
            {overdueAccountsCount > 0 ? ` • ${overdueAccountsCount} accounts overdue >60d` : ' • All accounts healthy'}
          </p>
        </div>

        <div className="pt-2 border-t border-[#F0F5F2] flex items-center justify-between">
          <span className="text-[11px] font-semibold text-[#8A9A91]">Recovery Rate: {recoveryRate}%</span>
          <button
            onClick={() => setActiveModal('record_khata')}
            className="text-xs font-bold text-[#079455] hover:underline"
          >
            + Record Payment
          </button>
        </div>
      </div>

      {/* 4. Total Inventory Value & Buffer Stock */}
      <div className="md:col-span-6 lg:col-span-4 bg-white rounded-3xl p-4 sm:p-5 border border-[#E2EAE5] card-shadow flex flex-col justify-between group">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#EFF5F1] text-[#079455] flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
            <span className="text-xs sm:text-sm font-bold text-[#1A1A1A]">
              Inventory Valuation
            </span>
          </div>
          <button
            onClick={() => setActiveView('inventory_fefo')}
            className="w-7 h-7 rounded-xl bg-[#EFF5F1] text-[#6E7E75] hover:bg-[#1A1A1A] hover:text-white transition-colors flex items-center justify-center"
            title="Open Inventory & FEFO Batches"
          >
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>

        <div className="my-3">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-[#1A1A1A]">
              ₹{totalInventoryValue.toLocaleString('en-IN')}
            </span>
            {lowStockCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-[#FEF0C7] text-[#B54708] text-xs font-bold">
                {lowStockCount} Low SKUs
              </span>
            )}
          </div>
          <p className="text-xs text-[#68776F] mt-1 font-medium">
            {inventory.length} Total SKUs • {expiringBatchesCount} batches in FEFO window (&lt;30 days)
          </p>
        </div>

        <div className="pt-2 border-t border-[#F0F5F2] flex items-center justify-between">
          <span className="text-[11px] font-semibold text-[#8A9A91]">FEFO Compliance: {fefoCompliancePct}%</span>
          <button
            onClick={() => setActiveModal('stock_adjust')}
            className="text-xs font-bold text-[#68776F] hover:text-[#1A1A1A]"
          >
            Adjust Stock
          </button>
        </div>
      </div>

      {/* 5. Open Purchase Orders & Inward Pipeline */}
      <div className="md:col-span-6 lg:col-span-4 bg-white rounded-3xl p-4 sm:p-5 border border-[#E2EAE5] card-shadow flex flex-col justify-between group">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#EFF8FF] text-[#175CD3] flex items-center justify-center">
              <Truck className="w-4 h-4" />
            </div>
            <span className="text-xs sm:text-sm font-bold text-[#1A1A1A]">
              Open Procurement Orders
            </span>
          </div>
          <button
            onClick={() => setActiveView('procurement')}
            className="w-7 h-7 rounded-xl bg-[#EFF5F1] text-[#6E7E75] hover:bg-[#1A1A1A] hover:text-white transition-colors flex items-center justify-center"
            title="Open Procurement & POs"
          >
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>

        <div className="my-3">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-[#1A1A1A]">
              ₹{totalOpenPOAmount.toLocaleString('en-IN')}
            </span>
            <span className="px-2 py-0.5 rounded-full bg-[#E0F2FE] text-[#026AA2] text-xs font-bold">
              {activePOs.length} Active POs
            </span>
          </div>
          <p className="text-xs text-[#68776F] mt-1 font-medium">
            {activePOs.length > 0
              ? `${inTransitCount} dispatched in transit • ${pendingAckCount} supplier acknowledgement pending`
              : 'All purchase orders fulfilled and inwarded into godown.'}
          </p>
        </div>

        <div className="pt-2 border-t border-[#F0F5F2] flex items-center justify-between">
          <span className="text-[11px] font-semibold text-[#8A9A91]">
            Total Inward Pipeline: {purchaseOrders.length} POs
          </span>
          <button
            onClick={() => setActiveModal('create_po')}
            className="text-xs font-bold text-[#079455] hover:underline"
          >
            + Create PO
          </button>
        </div>
      </div>

      {/* 6. Nursery Plant Care Compliance Index */}
      <div className="md:col-span-12 lg:col-span-4 bg-white rounded-3xl p-4 sm:p-5 border border-[#E2EAE5] card-shadow flex flex-col justify-between group">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#E0EAE4] text-[#079455] flex items-center justify-center">
              <Sprout className="w-4 h-4" />
            </div>
            <span className="text-xs sm:text-sm font-bold text-[#1A1A1A]">
              Nursery Care Health
            </span>
          </div>
          <button
            onClick={() => setActiveView('nursery_care')}
            className="w-7 h-7 rounded-xl bg-[#EFF5F1] text-[#6E7E75] hover:bg-[#1A1A1A] hover:text-white transition-colors flex items-center justify-center"
            title="Open Nursery Operations"
          >
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>

        <div className="my-3">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-[#1A1A1A]">
              {taskPercentage}%
            </span>
            <span className="px-2 py-0.5 rounded-full bg-[#E0EAE4] text-[#079455] text-xs font-bold">
              {completedTasks}/{totalTasks} Done Today
            </span>
          </div>
          <p className="text-xs text-[#68776F] mt-1 font-medium">
            {pendingCareTasks.length > 0
              ? `${pendingCareTasks.length} tasks scheduled • Next: ${pendingCareTasks[0].title} (${pendingCareTasks[0].timeSlot})`
              : 'All daily plant care & misting tasks completed!'}
          </p>
        </div>

        <div className="pt-2 border-t border-[#F0F5F2] flex items-center justify-between">
          <span className="text-[11px] font-semibold text-[#8A9A91]">
            Mortality Losses: {totalMortalityLoss} plants logged
          </span>
          <button
            onClick={() => setActiveModal('plant_care')}
            className="text-xs font-bold text-[#079455] hover:underline"
          >
            + Add Care Task
          </button>
        </div>
      </div>
    </div>
  );
};
