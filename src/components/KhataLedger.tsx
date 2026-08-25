import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  BookOpen,
  Phone,
  Send,
  ArrowUpRight,
  IndianRupee,
  UserPlus,
} from 'lucide-react';
import { CustomerKhata } from '../types';

export const KhataLedger: React.FC = () => {
  const { khataLedger = [], setActiveModal, setActiveView } = useApp();
  const safeKhata = khataLedger || [];
  const [selectedAgeingFilter, setSelectedAgeingFilter] = useState<string>('all');
  const [copiedPhoneId, setCopiedPhoneId] = useState<string | null>(null);

  const totalOutstanding = safeKhata.reduce((sum, k) => sum + k.outstandingBalance, 0);
  const totalOverdue = safeKhata
    .filter((k) => k.daysOverdue > 60)
    .reduce((sum, k) => sum + k.outstandingBalance, 0);
  const dueSoon = safeKhata
    .filter((k) => k.daysOverdue > 0 && k.daysOverdue <= 30)
    .reduce((sum, k) => sum + k.outstandingBalance, 0);

  // Dynamic Ageing Buckets calculation
  const bucketDefs = [
    { label: 'Current', key: 'current', color: '#079455' },
    { label: '1–30 Days', key: '1-30', color: '#2E9055' },
    { label: '31–60 Days', key: '31-60', color: '#F9AD19' },
    { label: '61–90 Days', key: '61-90', color: '#F79009' },
    { label: '90+ Days', key: '90+', color: '#D92D20' },
  ];

  const ageingBuckets = bucketDefs.map((b) => {
    const matching = safeKhata.filter((k) => k.ageing === b.key);
    const amount = matching.reduce((sum, k) => sum + k.outstandingBalance, 0);
    const percent = totalOutstanding > 0 ? Math.round((amount / totalOutstanding) * 100) : 0;
    return { ...b, amount, percent, count: matching.length };
  });

  const filteredCustomers = khataLedger.filter((c) => {
    if (selectedAgeingFilter === 'all') return true;
    return c.ageing === selectedAgeingFilter;
  });

  const handleSendReminder = (customer: CustomerKhata) => {
    setCopiedPhoneId(customer.id);
    const message = `Namaste ${customer.name} ji, this is a reminder from Nashik Agro-Hub regarding your outstanding khata balance of ₹${customer.outstandingBalance.toLocaleString('en-IN')}. Kindly clear at earliest via UPI / Counter. Thank you.`;
    navigator.clipboard.writeText(message);
    setTimeout(() => setCopiedPhoneId(null), 3000);
  };

  return (
    <div className="bg-white rounded-3xl p-4 sm:p-5 border border-[#E2EAE5] card-shadow">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#FEE4E2] text-[#D92D20] flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-[#1A1A1A] tracking-tight">
                Khata & Customer Credit Health
              </h3>
              <p className="text-[11px] text-[#6E7B74]">
                Farmer credit ledgers, ageing recovery brackets & automated collection triggers
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveModal('record_khata')}
            className="px-3.5 py-1.5 rounded-2xl bg-[#079455] hover:bg-[#067A46] text-white text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5"
          >
            <IndianRupee className="w-3.5 h-3.5" />
            <span>Record Payment</span>
          </button>
        </div>
      </div>

      {/* 4-Stat Summary Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 mb-4">
        <div className="p-3 bg-[#F9FBF9] rounded-2xl border border-[#E5ECE7]">
          <span className="text-[11px] font-semibold text-[#7A8B82]">Total Outstanding</span>
          <div className="text-lg sm:text-xl font-extrabold text-[#1A1A1A] mt-0.5">
            ₹{totalOutstanding.toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-[#079455] font-semibold">{khataLedger.length} Farmer Accounts</span>
        </div>

        <div className="p-3 bg-[#FEF3F2] rounded-2xl border border-[#FECDCA]">
          <span className="text-[11px] font-semibold text-[#D92D20]">Critical Overdue (&gt;60d)</span>
          <div className="text-lg sm:text-xl font-extrabold text-[#D92D20] mt-0.5">
            ₹{totalOverdue.toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-[#B42318] font-bold">
            {khataLedger.filter((k) => k.daysOverdue > 60).length} High Risk Accounts
          </span>
        </div>

        <div className="p-3 bg-[#FFFAEB] rounded-2xl border border-[#FEDF89]">
          <span className="text-[11px] font-semibold text-[#B54708]">Due in 1–30 Days</span>
          <div className="text-lg sm:text-xl font-extrabold text-[#B54708] mt-0.5">
            ₹{dueSoon.toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-[#7A540E] font-medium">
            {khataLedger.filter((k) => k.daysOverdue > 0 && k.daysOverdue <= 30).length} Post-Harvest Settlements
          </span>
        </div>

        <div className="p-3 bg-[#EFF8FF] rounded-2xl border border-[#B9E6FE]">
          <span className="text-[11px] font-semibold text-[#026AA2]">Active Credit Accounts</span>
          <div className="text-lg sm:text-xl font-extrabold text-[#026AA2] mt-0.5">
            {khataLedger.filter((k) => k.outstandingBalance > 0).length}
          </div>
          <span className="text-[10px] text-[#175CD3] font-medium">Within 45d limit policy</span>
        </div>
      </div>

      {/* Ageing Visualizer Bar */}
      <div className="mb-4 p-3.5 bg-[#F9FBFA] rounded-2xl border border-[#E5ECE7]">
        <div className="flex items-center justify-between text-xs font-bold text-[#1A1A1A] mb-2">
          <span>Khata Ageing Distribution</span>
          <span className="text-[11px] text-[#6E7B74] font-normal">Click bucket to filter customer table</span>
        </div>

        {/* Stacked colored segment bar */}
        <div className="w-full h-3 bg-[#E5ECE7] rounded-full overflow-hidden flex gap-0.5 mb-2.5">
          {totalOutstanding > 0 ? (
            ageingBuckets.map((b) => (
              <div
                key={b.key}
                style={{ width: `${b.percent}%`, backgroundColor: b.color }}
                className="h-full cursor-pointer hover:opacity-80 transition-opacity"
                title={`${b.label}: ₹${b.amount.toLocaleString('en-IN')} (${b.percent}%)`}
                onClick={() => setSelectedAgeingFilter(selectedAgeingFilter === b.key ? 'all' : b.key)}
              ></div>
            ))
          ) : (
            <div className="w-full h-full bg-[#E0EAE4]"></div>
          )}
        </div>

        {/* Bucket Chips */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setSelectedAgeingFilter('all')}
            className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all ${
              selectedAgeingFilter === 'all' ? 'bg-[#1A1A1A] text-white' : 'bg-white border border-[#E0EAE4] text-[#55635C]'
            }`}
          >
            All Ageing ({khataLedger.length})
          </button>
          {ageingBuckets.map((b) => (
            <button
              key={b.key}
              onClick={() => setSelectedAgeingFilter(selectedAgeingFilter === b.key ? 'all' : b.key)}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1.5 ${
                selectedAgeingFilter === b.key
                  ? 'bg-[#1A1A1A] text-white shadow-2xs'
                  : 'bg-white border border-[#E0EAE4] text-[#55635C] hover:bg-[#F2F7F4]'
              }`}
            >
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: b.color }}></span>
              <span>{b.label}</span>
              <span className="font-extrabold text-[#1A1A1A]">{b.percent}%</span>
            </button>
          ))}
        </div>
      </div>

      {/* Ranked Customer Table */}
      {filteredCustomers.length === 0 ? (
        <div className="py-12 px-4 text-center bg-[#F9FBF9] rounded-2xl border border-dashed border-[#CCD8D0]">
          <BookOpen className="w-8 h-8 text-[#8C9C93] mx-auto mb-2 opacity-50" />
          <p className="text-sm font-bold text-[#1A1A1A]">No Khata Records Found</p>
          <p className="text-xs text-[#6E7B74] mt-1 max-w-sm mx-auto">
            {khataLedger.length === 0
              ? 'There are no active customer credit ledgers in this workspace.'
              : 'No customers match the selected ageing bracket filter.'}
          </p>
          {khataLedger.length === 0 && (
            <button
              onClick={() => setActiveModal('new_sale')}
              className="mt-3 px-3.5 py-1.5 rounded-xl bg-[#079455] text-white text-xs font-bold shadow-2xs inline-flex items-center gap-1.5"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Record Sale with Khata</span>
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#E5ECE7] text-[#7A8B82] font-semibold">
                <th className="py-2.5 px-3">Farmer / Customer Name</th>
                <th className="py-2.5 px-3">Village / Cluster</th>
                <th className="py-2.5 px-3">Outstanding Balance</th>
                <th className="py-2.5 px-3">Days Overdue</th>
                <th className="py-2.5 px-3">Credit Limit Utilization</th>
                <th className="py-2.5 px-3">Khata Status</th>
                <th className="py-2.5 px-3 text-right">Quick Collection</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0F5F2]">
              {filteredCustomers.map((cust) => {
                const utilPercent = cust.creditLimit > 0
                  ? Math.min(100, Math.round((cust.outstandingBalance / cust.creditLimit) * 100))
                  : 0;
                const isBlocked = cust.status === 'blocked';
                const isOverdue = cust.status === 'overdue';

                return (
                  <tr key={cust.id} className="hover:bg-[#F9FBF9] transition-colors group">
                    <td className="py-3 px-3">
                      <div className="font-bold text-[#1A1A1A] group-hover:text-[#079455] transition-colors">
                        {cust.name}
                      </div>
                      <div className="text-[10px] text-[#7A8B82] flex items-center gap-1.5 mt-0.5">
                        <Phone className="w-3 h-3" />
                        <span>{cust.phone}</span>
                      </div>
                    </td>

                    <td className="py-3 px-3 font-medium text-[#54625A]">
                      {cust.village}
                    </td>

                    <td className="py-3 px-3">
                      <span className="font-extrabold text-sm text-[#1A1A1A]">
                        ₹{cust.outstandingBalance.toLocaleString('en-IN')}
                      </span>
                      <span className="text-[10px] text-[#8C9C93] block">
                        Total Life: ₹{cust.totalPurchased.toLocaleString('en-IN')}
                      </span>
                    </td>

                    <td className="py-3 px-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full font-bold text-[10px] ${
                          cust.daysOverdue > 60
                            ? 'bg-[#FEE4E2] text-[#D92D20]'
                            : cust.daysOverdue > 30
                            ? 'bg-[#FEF0C7] text-[#B54708]'
                            : 'bg-[#E0EAE4] text-[#079455]'
                        }`}
                      >
                        {cust.daysOverdue} Days
                      </span>
                    </td>

                    <td className="py-3 px-3">
                      <div className="w-28">
                        <div className="flex items-center justify-between text-[10px] font-bold text-[#1A1A1A] mb-0.5">
                          <span>{utilPercent}%</span>
                          <span className="text-[#8C9C93] font-normal">₹{cust.creditLimit / 1000}k Limit</span>
                        </div>
                        <div className="w-full h-1.5 bg-[#EFF5F1] rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              utilPercent > 80 ? 'bg-[#D92D20]' : utilPercent > 50 ? 'bg-[#F9AD19]' : 'bg-[#079455]'
                            }`}
                            style={{ width: `${utilPercent}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                          isBlocked
                            ? 'bg-[#FEE4E2] text-[#D92D20]'
                            : isOverdue
                            ? 'bg-[#FEF0C7] text-[#B54708]'
                            : cust.status === 'due_soon'
                            ? 'bg-[#EFF8FF] text-[#175CD3]'
                            : 'bg-[#E0EAE4] text-[#079455]'
                        }`}
                      >
                        {cust.status.replace('_', ' ')}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleSendReminder(cust)}
                          className={`p-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1 ${
                            copiedPhoneId === cust.id
                              ? 'bg-[#079455] text-white border-[#079455]'
                              : 'bg-white border-[#E0EAE4] text-[#55635C] hover:bg-[#F2F7F4]'
                          }`}
                          title="Send WhatsApp SMS Balance Reminder"
                        >
                          {copiedPhoneId === cust.id ? (
                            <span className="text-[10px]">Reminder Copied!</span>
                          ) : (
                            <>
                              <Send className="w-3 h-3 text-[#25D366]" />
                              <span className="hidden sm:inline text-[11px]">WhatsApp</span>
                            </>
                          )}
                        </button>

                        <button
                          onClick={() => {
                            setActiveModal('record_khata');
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-[#1A1A1A] hover:bg-black text-white text-xs font-bold transition-all shadow-2xs"
                        >
                          Collect
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer */}
      <div className="mt-4 pt-3 border-t border-[#F0F5F2] flex items-center justify-between">
        <div className="text-xs text-[#6E7B74]">
          Automatic credit block applied to accounts crossing 90 days overdue or 100% credit limit.
        </div>
        <button
          onClick={() => setActiveView('khata_ledger')}
          className="text-xs font-bold text-[#079455] hover:underline flex items-center gap-1"
        >
          <span>View Complete Ledger & Statement PDF</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
