import React, { useState } from 'react';
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
} from 'lucide-react';
import { salesTrends, greenhouseHealthTrends } from '../data/mockData';

export const SalesAnalytics: React.FC = () => {
  const { sales, khataLedger, inventory, alerts, setActiveView, setActiveModal } = useApp();
  const [chartMode, setChartMode] = useState<'sales_cash_khata' | 'category_breakdown' | 'nursery_health'>('sales_cash_khata');

  const totalSalesAmount = sales.reduce((sum, s) => sum + s.total, 0);
  const totalCashAmount = sales.reduce((sum, s) => sum + s.cashPaid, 0);
  const totalKhataAmount = sales.reduce((sum, s) => sum + s.khataAmount, 0);
  const cashRealizationPct = totalSalesAmount > 0
    ? Math.round((totalCashAmount / totalSalesAmount) * 1000) / 10
    : 100;
  const avgTicketSize = sales.length > 0 ? Math.round(totalSalesAmount / sales.length) : 0;
  const khataLockinPct = totalSalesAmount > 0
    ? Math.round((totalKhataAmount / totalSalesAmount) * 1000) / 10
    : 0;

  // Estimated gross margin (~17-20% margin on retail agri-products)
  const estimatedDailyMargin = Math.round(totalSalesAmount * 0.172);

  // Anomalies count
  const anomalyCount = alerts.filter((a) => a.category === 'inventory' || a.category === 'compliance').length;

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
                <BarChart data={salesTrends} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
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
                <AreaChart data={salesTrends} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
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
                <AreaChart data={greenhouseHealthTrends} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
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
          <span>Source: Real-time POS Engine & Warehouse Ledger</span>
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
                <span>• Alert Threshold:</span>
                <strong className="text-[#1A1A1A] font-bold">+15% variance</strong>
              </div>
              <div className="flex items-center justify-between text-[#526058]">
                <span>• Low Stock Warnings:</span>
                <strong className="text-[#B54708] font-bold">{inventory.filter(i => i.stockQty <= i.reorderLevel).length} SKUs</strong>
              </div>
              <div className="flex items-center justify-between text-[#526058]">
                <span>• Active Overdue Accounts:</span>
                <strong className="text-[#D92D20] font-bold">{khataLedger.filter(k => k.daysOverdue > 60).length} Farmers</strong>
              </div>
            </div>

            <p className="text-[11px] text-[#6E7B74] leading-relaxed">
              Detects physical inventory variances, leaking bags, and unexplained nursery mortality spikes.
            </p>
          </div>

          <button
            onClick={() => setActiveModal('stock_adjust')}
            className="mt-3 w-full py-2 bg-[#1A1A1A] text-white hover:bg-black text-xs font-bold rounded-2xl transition-colors flex items-center justify-center gap-1.5"
          >
            <span>Resolve Stock Discrepancy</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Card B: Daily Operational Burn & Khata Velocity */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-[#E2EAE5] card-shadow flex flex-col justify-between flex-1">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs sm:text-sm font-bold text-[#1A1A1A]">
                Operating Margin & Cash Inflow
              </h4>
              <span className="text-[10px] font-bold text-[#079455] bg-[#E0EAE4] px-2 py-0.5 rounded-full">
                Profitable
              </span>
            </div>

            <div className="flex items-baseline gap-2 my-2">
              <span className="text-3xl font-extrabold text-[#1A1A1A]">
                ₹{estimatedDailyMargin.toLocaleString('en-IN')}
              </span>
              <span className="text-xs font-semibold text-[#6E7B74]">net margin estimate</span>
            </div>

            <div className="bg-[#F9FBFA] p-2.5 rounded-2xl border border-[#E5ECE7] text-xs flex flex-col gap-1.5 my-2">
              <div className="flex items-center justify-between text-[#526058]">
                <span>• Estimated Margin %:</span>
                <strong className="text-[#079455] font-bold">17.2% overall</strong>
              </div>
              <div className="flex items-center justify-between text-[#526058]">
                <span>• Khata Lock-in %:</span>
                <strong className="text-[#B54708] font-bold">{khataLockinPct}% of daily volume</strong>
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
            onClick={() => setActiveView('intelligence')}
            className="mt-3 w-full py-2 bg-[#EFF5F1] hover:bg-[#E0EAE4] text-[#079455] text-xs font-bold rounded-2xl transition-colors flex items-center justify-center gap-1.5"
          >
            <span>View Margin Report</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
