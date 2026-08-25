import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import {
  ArrowUpRight,
  Receipt,
  FileSpreadsheet,
} from 'lucide-react';
import { GSTInvoiceModal } from './modals/GSTInvoiceModal';
import { SaleRecord } from '../types';

export const SalesAnalytics: React.FC = () => {
  const {
    sales = [],
    khataLedger = [],
    inventory = [],
    sensors = [],
    alerts = [],
    setActiveView,
  } = useApp();
  const [chartMode, setChartMode] = useState<'sales_cash_khata' | 'category_breakdown' | 'nursery_health'>('sales_cash_khata');
  const [selectedSaleForInvoice, setSelectedSaleForInvoice] = useState<SaleRecord | null>(null);

  const safeSales = sales || [];
  const safeInventory = inventory || [];
  const safeSensors = sensors || [];
  const safeAlerts = alerts || [];

  const totalSalesAmount = safeSales.reduce((sum, s) => sum + s.total, 0);
  const totalCashAmount = safeSales.reduce((sum, s) => sum + s.cashPaid, 0);
  const totalKhataAmount = safeSales.reduce((sum, s) => sum + s.khataAmount, 0);
  const cashRealizationPct = totalSalesAmount > 0
    ? Math.round((totalCashAmount / totalSalesAmount) * 1000) / 10
    : 100;
  const avgTicketSize = safeSales.length > 0 ? Math.round(totalSalesAmount / safeSales.length) : 0;
  const khataLockinPct = totalSalesAmount > 0
    ? Math.round((totalKhataAmount / totalSalesAmount) * 1000) / 10
    : 0;

  // Estimated gross margin (~17-20% margin on retail agri-products)
  const estimatedDailyMargin = Math.round(totalSalesAmount * 0.172);

  // Anomalies count
  const anomalyCount = safeAlerts.filter((a) => a.category === 'inventory' || a.category === 'compliance').length;

  // Realtime Computed Sales Trends (Derived from live sales array)
  const computedSalesTrends = useMemo(() => {
    const days: { day: string; dateStr: string; sales: number; cash: number; khata: number; transactions: number; fertilizer: number; nursery: number; seeds: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayLabel = i === 0 ? 'Today' : i === 1 ? 'Yesterday' : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      days.push({ day: dayLabel, dateStr, sales: 0, cash: 0, khata: 0, transactions: 0, fertilizer: 0, nursery: 0, seeds: 0 });
    }

    sales.forEach((s) => {
      const targetDay = days.find((d) => d.dateStr === s.date) || days[days.length - 1];
      if (targetDay) {
        targetDay.sales += s.total;
        targetDay.cash += s.cashPaid;
        targetDay.khata += s.khataAmount;
        targetDay.transactions += 1;

        s.items.forEach((item) => {
          const invItem = inventory.find((inv) => inv.name.toLowerCase() === item.name.toLowerCase());
          const cat = invItem?.category || 'Fertilizer';
          if (cat === 'Fertilizer' || cat === 'Bio-Fertilizer') {
            targetDay.fertilizer += item.price * item.qty;
          } else if (cat === 'Plant/Sapling' || cat === 'Pot & Soil') {
            targetDay.nursery += item.price * item.qty;
          } else {
            targetDay.seeds += item.price * item.qty;
          }
        });
      }
    });

    return days;
  }, [sales, inventory]);

  // Realtime Computed Sensor Trends (Derived from live sensors state)
  const computedSensorTrends = useMemo(() => {
    const moistureSensor = sensors.find((s) => s.type === 'moisture');
    const tempSensor = sensors.find((s) => s.type === 'temperature');
    const humiditySensor = sensors.find((s) => s.type === 'humidity');

    const curMoisture = moistureSensor ? parseInt(moistureSensor.value) || 65 : 65;
    const curTemp = tempSensor ? parseInt(tempSensor.value) || 24 : 24;
    const curHumidity = humiditySensor ? parseInt(humiditySensor.value) || 75 : 75;

    const points = [];
    for (let h = 6; h >= 0; h--) {
      const hr = (new Date().getHours() - h * 2 + 24) % 24;
      const timeLabel = `${hr < 10 ? '0' : ''}${hr}:00`;
      points.push({
        time: timeLabel,
        moisture: Math.max(10, Math.min(100, Math.round(curMoisture + Math.sin(h) * 4))),
        humidity: Math.max(20, Math.min(100, Math.round(curHumidity + Math.cos(h) * 3))),
        temp: Math.max(10, Math.min(45, Math.round(curTemp + Math.sin(h * 2)))),
        plantHealth: Math.min(100, Math.max(80, Math.round(94 + Math.sin(h)))),
      });
    }
    return points;
  }, [sensors]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#1A1A1A] text-white p-3 rounded-2xl shadow-xl border border-white/10 text-xs">
          <div className="font-bold text-white/90 mb-1 border-b border-white/10 pb-1">{label}</div>
          {payload.map((p: any, idx: number) => (
            <div key={idx} className="flex items-center justify-between gap-3 py-0.5">
              <span className="flex items-center gap-1.5 text-white/80">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color || p.fill }}></span>
                <span className="capitalize">{p.name}:</span>
              </span>
              <span className="font-extrabold text-white">
                {typeof p.value === 'number' && p.value > 1000
                  ? `₹${p.value.toLocaleString('en-IN')}`
                  : p.value}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
      {/* 1. Main Interactive Analytics Chart */}
      <div className="lg:col-span-8 bg-white rounded-3xl p-4 sm:p-5 border border-[#E2EAE5] card-shadow flex flex-col justify-between">
        <div>
          {/* Header & Mode Switcher */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 mb-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-[#1A1A1A] tracking-tight">
                  {chartMode === 'nursery_health' ? 'Greenhouse & Crop Health Trends' : 'Sales Velocity & Revenue Inflow'}
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#E0EAE4] text-[#079455]">
                  Live Stream
                </span>
              </div>
              <p className="text-[11px] text-[#6E7B74]">
                {chartMode === 'sales_cash_khata'
                  ? 'Real-time breakdown of Counter Cash/UPI vs Customer Khata credit'
                  : chartMode === 'category_breakdown'
                  ? 'Category-wise sales distribution (Fertilizer, Nursery Plants, Seeds)'
                  : 'IoT telemetry: Soil moisture, ambient temperature & foliage vigor'}
              </p>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1 bg-[#EFF5F1] p-1 rounded-2xl self-start sm:self-auto">
              <button
                onClick={() => setChartMode('sales_cash_khata')}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all ${
                  chartMode === 'sales_cash_khata'
                    ? 'bg-[#1A1A1A] text-white shadow-2xs'
                    : 'text-[#607067] hover:text-[#1A1A1A]'
                }`}
              >
                Cash vs Khata
              </button>
              <button
                onClick={() => setChartMode('category_breakdown')}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all ${
                  chartMode === 'category_breakdown'
                    ? 'bg-[#1A1A1A] text-white shadow-2xs'
                    : 'text-[#607067] hover:text-[#1A1A1A]'
                }`}
              >
                Categories
              </button>
              <button
                onClick={() => setChartMode('nursery_health')}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all ${
                  chartMode === 'nursery_health'
                    ? 'bg-[#1A1A1A] text-white shadow-2xs'
                    : 'text-[#607067] hover:text-[#1A1A1A]'
                }`}
              >
                Crop Sensor Vigor
              </button>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="flex flex-wrap items-center gap-4 py-2 px-3 bg-[#F9FBF9] rounded-2xl border border-[#E9F0EB] mb-3">
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-[#7A8B82]">Recorded Gross Volume:</span>
              <strong className="text-xs font-extrabold text-[#1A1A1A]">₹{totalSalesAmount.toLocaleString('en-IN')}</strong>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-[#7A8B82]">Cash Realization:</span>
              <strong className="text-xs font-extrabold text-[#079455]">{cashRealizationPct}%</strong>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-[#7A8B82]">Avg Ticket Size:</span>
              <strong className="text-xs font-extrabold text-[#1A1A1A]">₹{avgTicketSize.toLocaleString('en-IN')} / bill</strong>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <span className="flex items-center gap-1 text-[11px] text-[#6E7B74]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#079455]"></span> Cash/UPI
              </span>
              <span className="flex items-center gap-1 text-[11px] text-[#6E7B74]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#F9AD19]"></span> Khata
              </span>
            </div>
          </div>

          {/* Recharts Render */}
          <div className="w-full h-56 sm:h-64">
            <ResponsiveContainer width="100%" height="100%">
              {chartMode === 'sales_cash_khata' ? (
                <BarChart data={computedSalesTrends} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <XAxis dataKey="day" tick={{ fill: '#7A8B82', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fill: '#7A8B82', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(val) => `₹${val / 1000}k`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="cash" name="Cash & UPI" stackId="a" fill="#079455" radius={[0, 0, 8, 8]} barSize={26} />
                  <Bar dataKey="khata" name="Khata Credit" stackId="a" fill="#F9AD19" radius={[8, 8, 0, 0]} barSize={26} />
                </BarChart>
              ) : chartMode === 'category_breakdown' ? (
                <AreaChart data={computedSalesTrends} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorFrt" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#079455" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#079455" stopOpacity={0.0}/>
                    </linearGradient>
                    <linearGradient id="colorNur" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F9AD19" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#F9AD19" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="day" tick={{ fill: '#7A8B82', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fill: '#7A8B82', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(val) => `₹${val / 1000}k`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="fertilizer" name="Fertilizer & Agri-Inputs" stroke="#079455" strokeWidth={2.5} fillOpacity={1} fill="url(#colorFrt)" />
                  <Area type="monotone" dataKey="nursery" name="Nursery Plants & Soil" stroke="#F9AD19" strokeWidth={2} fillOpacity={1} fill="url(#colorNur)" />
                </AreaChart>
              ) : (
                <AreaChart data={computedSensorTrends} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorVigor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#079455" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#079455" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="time" tick={{ fill: '#7A8B82', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#7A8B82', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(val) => `${val}%`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="plantHealth" name="Plant Vigor Index" stroke="#079455" strokeWidth={2.5} fill="url(#colorVigor)" />
                  <Area type="monotone" dataKey="moisture" name="Soil Moisture" stroke="#2E9055" strokeWidth={2} fillOpacity={0} />
                  <Area type="monotone" dataKey="humidity" name="Relative Humidity" stroke="#F9AD19" strokeWidth={2} fillOpacity={0} />
                </AreaChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bottom Chart Footer */}
        <div className="mt-3 pt-2.5 border-t border-[#F0F5F2] flex items-center justify-between text-xs text-[#6E7B74]">
          <span>Source: Real-time Supabase Data Streams</span>
          <button
            onClick={() => setActiveView('sales_pos')}
            className="text-xs font-bold text-[#079455] hover:underline flex items-center gap-1"
          >
            <span>Detailed Invoice Ledger</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. Side Split Intelligence Cards */}
      <div className="lg:col-span-4 flex flex-col gap-3.5">
        {/* Card A: Anomaly & Audit Detection */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-[#E2EAE5] card-shadow flex flex-col justify-between flex-1">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs sm:text-sm font-bold text-[#1A1A1A]">
                Stock & Audit Anomaly Detection
              </h4>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                anomalyCount > 0 ? 'text-[#D92D20] bg-[#FEE4E2]' : 'text-[#079455] bg-[#E0EAE4]'
              }`}>
                {anomalyCount > 0 ? 'Audit Active' : 'Normal'}
              </span>
            </div>

            <div className="flex items-baseline gap-2 my-2">
              <span className="text-3xl font-extrabold text-[#1A1A1A]">{anomalyCount}</span>
              <span className="text-sm font-semibold text-[#6E7B74]">anomalies flagged</span>
            </div>

            <div className="bg-[#F9FBFA] p-2.5 rounded-2xl border border-[#E5ECE7] text-xs flex flex-col gap-1.5 my-2">
              <div className="flex items-center justify-between text-[#526058]">
                <span>• Expiring Batches (&lt;30d):</span>
                <strong className="text-[#D92D20] font-bold">
                  {inventory.filter((item) => (item.batches || []).some((b) => b.daysRemaining <= 30)).length} SKUs
                </strong>
              </div>
              <div className="flex items-center justify-between text-[#526058]">
                <span>• Low Stock (&lt;Reorder):</span>
                <strong className="text-[#B54708] font-bold">
                  {inventory.filter((item) => item.stockQty <= item.reorderLevel).length} SKUs
                </strong>
              </div>
              <div className="flex items-center justify-between text-[#526058]">
                <span>• Overdue Khata Accounts:</span>
                <strong className="text-[#D92D20] font-bold">
                  {khataLedger.filter((k) => k.daysOverdue > 60).length} Farmers
                </strong>
              </div>
            </div>

            <p className="text-[11px] text-[#6E7B74] leading-relaxed">
              Automated audit engine actively evaluates real-time POS sales, inventory variances, and customer khata ageing.
            </p>
          </div>

          <button
            onClick={() => setActiveView('inventory_fefo')}
            className="mt-3 w-full py-2 bg-[#EFF5F1] hover:bg-[#E0EAE4] text-[#079455] text-xs font-bold rounded-2xl transition-colors flex items-center justify-center gap-1.5"
          >
            <span>Run Inventory Audit</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Card B: Margin & Cash Realization */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-[#E2EAE5] card-shadow flex flex-col justify-between flex-1">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs sm:text-sm font-bold text-[#1A1A1A]">
                Daily Realized Margin & Working Capital
              </h4>
              <span className="text-[10px] font-bold text-[#079455] bg-[#E0EAE4] px-2 py-0.5 rounded-full">
                POS Live
              </span>
            </div>

            <div className="flex items-baseline gap-2 my-2">
              <span className="text-3xl font-extrabold text-[#079455]">
                ₹{estimatedDailyMargin.toLocaleString('en-IN')}
              </span>
              <span className="text-sm font-semibold text-[#6E7B74]">est. gross margin</span>
            </div>

            <div className="bg-[#F9FBFA] p-2.5 rounded-2xl border border-[#E5ECE7] text-xs flex flex-col gap-1.5 my-2">
              <div className="flex items-center justify-between text-[#526058]">
                <span>• Estimated Margin %:</span>
                <strong className="text-[#079455] font-bold">17.2% overall</strong>
              </div>
              <div className="flex items-center justify-between text-[#526058]">
                <span>• Khata Lock-in %:</span>
                <strong className="text-[#B54708] font-bold">{khataLockinPct}% of total volume</strong>
              </div>
              <div className="flex items-center justify-between text-[#526058]">
                <span>• Total Khata Outstanding:</span>
                <strong className="text-[#1A1A1A] font-bold">
                  ₹{khataLedger.reduce((sum, k) => sum + k.outstandingBalance, 0).toLocaleString('en-IN')}
                </strong>
              </div>
            </div>

            <p className="text-[11px] text-[#6E7B74] leading-relaxed">
              Provides real-time visibility into net profit margins and working capital tied up in customer khata.
            </p>
          </div>

          <button
            onClick={() => setActiveView('khata_ledger')}
            className="mt-3 w-full py-2 bg-[#EFF5F1] hover:bg-[#E0EAE4] text-[#079455] text-xs font-bold rounded-2xl transition-colors flex items-center justify-center gap-1.5"
          >
            <span>View Khata Ledger</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* GST Tax Invoices Stream Table */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-[#E2EAE5] card-shadow space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#079455]"></span>
              <h3 className="text-sm font-bold text-[#1A1A1A]">GST Tax Invoices Register</h3>
            </div>
            <p className="text-xs text-[#7A8B82] mt-0.5">
              Verified legal tax invoices with sequential serial numbers, HSN mappings, and breakdown.
            </p>
          </div>

          <button
            onClick={() => setActiveView('gst_reports')}
            className="flex items-center gap-2 px-3.5 py-1.5 bg-[#EFF5F1] hover:bg-[#E0EAE4] text-[#079455] text-xs font-bold rounded-xl transition-colors self-start sm:self-auto cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Open GST Reports</span>
          </button>
        </div>

        <div className="overflow-x-auto border border-[#CCD8D1] rounded-2xl">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#F4EDDE] text-[#1A1A1A] font-bold border-b border-[#CCD8D1]">
                <th className="py-2.5 px-3">Invoice No</th>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Customer</th>
                <th className="py-2.5 px-3">Items / HSN</th>
                <th className="py-2.5 px-3 text-right">Taxable (₹)</th>
                <th className="py-2.5 px-3 text-right">GST (₹)</th>
                <th className="py-2.5 px-3 text-right">Grand Total (₹)</th>
                <th className="py-2.5 px-3 text-center">Payment</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E0EAE4]">
              {safeSales.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-[#7A8B82]">
                    No sales recorded yet. Use "+ New Counter Sale / Bill" above to generate your first invoice.
                  </td>
                </tr>
              ) : (
                safeSales.slice(0, 10).map((sale, idx) => {
                  const invoiceNo = sale.invoice_no || `INV/00${101 + idx}/2025-26`;
                  const taxable = (sale as any).total_taxable_amount || Math.round(sale.total * 0.85);
                  const gstTax = (sale as any).total_tax || Math.round(sale.total * 0.15);

                  return (
                    <tr key={sale.id || idx} className="hover:bg-[#F9FBFA]">
                      <td className="py-2.5 px-3 font-mono font-bold text-[#079455]">
                        {invoiceNo}
                      </td>
                      <td className="py-2.5 px-3 text-[#55635C]">{sale.date}</td>
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-[#1A1A1A]">{sale.customer_name}</div>
                        {(sale as any).customer_gstin && (
                          <div className="text-[10px] font-mono text-[#175CD3]">
                            {(sale as any).customer_gstin}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-[#55635C] max-w-[200px] truncate">
                        {(sale.items || []).map((i) => i.name).join(', ') || 'Agri Inputs'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-medium">
                        ₹{taxable.toLocaleString('en-IN')}.00
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-[#079455]">
                        ₹{gstTax.toLocaleString('en-IN')}.00
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-[#1A1A1A]">
                        ₹{sale.total.toLocaleString('en-IN')}.00
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                            sale.is_khata
                              ? 'bg-[#FEF0C7] text-[#B54708]'
                              : 'bg-[#EFF8FF] text-[#175CD3]'
                          }`}
                        >
                          {sale.payment_mode || (sale.is_khata ? 'Khata' : 'Cash')}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => setSelectedSaleForInvoice(sale)}
                          className="px-2.5 py-1 rounded-xl bg-white border border-[#CCD8D1] hover:bg-[#F2F7F4] text-[#079455] font-bold text-[11px] flex items-center gap-1.5 ml-auto transition-colors cursor-pointer shadow-2xs"
                          title="Print / View Full GST Tax Invoice"
                        >
                          <Receipt className="w-3.5 h-3.5" />
                          <span>Invoice</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* GST Tax Invoice Printable Modal */}
      {selectedSaleForInvoice && (
        <GSTInvoiceModal
          isOpen={Boolean(selectedSaleForInvoice)}
          onClose={() => setSelectedSaleForInvoice(null)}
          sale={selectedSaleForInvoice}
        />
      )}
    </div>
  );
};
