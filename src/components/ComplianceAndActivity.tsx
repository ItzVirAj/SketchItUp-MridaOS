import React from 'react';
import { useApp } from '../context/AppContext';
import {
  ShieldCheck,
  ArrowUpRight,
  Activity,
  Receipt,
  Truck,
  CreditCard,
  Sprout,
  CheckCircle2,
} from 'lucide-react';
import { ActivityLog } from '../types';

export const ComplianceAndActivity: React.FC = () => {
  const { licenses = [], activities = [], setActiveView } = useApp();
  const safeLicenses = licenses || [];
  const safeActivities = activities || [];

  const getActivityIcon = (tag: ActivityLog['tag']) => {
    switch (tag) {
      case 'sale':
        return <Receipt className="w-3.5 h-3.5 text-[#079455]" />;
      case 'khata':
        return <CreditCard className="w-3.5 h-3.5 text-[#D92D20]" />;
      case 'procurement':
        return <Truck className="w-3.5 h-3.5 text-[#175CD3]" />;
      case 'nursery':
        return <Sprout className="w-3.5 h-3.5 text-[#079455]" />;
      default:
        return <Activity className="w-3.5 h-3.5 text-[#6E7B74]" />;
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
      {/* 1. Regulatory Compliance & Licenses Widget */}
      <div className="lg:col-span-6 bg-white rounded-3xl p-4 sm:p-5 border border-[#E2EAE5] card-shadow flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#E0EAE4] text-[#079455] flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-[#1A1A1A]">
                  Statutory Licenses & Legal Compliance
                </h3>
                <p className="text-[11px] text-[#6E7B74]">
                  Fertilizer Control Order (FCO) & Insecticides Act renewals
                </p>
              </div>
            </div>

            <button
              onClick={() => setActiveView('compliance')}
              className="text-[#788880] hover:text-[#1A1A1A]"
            >
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-col gap-2.5">
            {safeLicenses.length === 0 ? (
              <div className="p-4 text-center text-xs text-[#7A8B82] bg-[#F9FBF9] rounded-2xl border border-dashed border-[#DDE5E0]">
                No compliance licenses registered in database yet.
              </div>
            ) : (
              safeLicenses.map((lic) => {
                const isDue = lic.status === 'renewal_due';
                return (
                  <div
                    key={lic.id}
                    className={`p-3 rounded-2xl border transition-all ${
                      isDue
                        ? 'bg-[#FFFAEB]/70 border-[#FEDF89]'
                        : 'bg-[#F9FBFA] border-[#E8EFEA]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-[#1A1A1A]">{lic.name}</h4>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              isDue ? 'bg-[#FEF0C7] text-[#B54708]' : 'bg-[#E0EAE4] text-[#079455]'
                            }`}
                          >
                            {isDue ? `${lic.daysRemaining}d to Renewal` : 'Valid & Active'}
                          </span>
                        </div>
                        <div className="text-[10px] text-[#7A8B82] font-mono mt-0.5">
                          Lic No: {lic.licenseNumber}
                        </div>
                        <div className="text-[10px] text-[#55635C] mt-1 font-medium">
                          Authority: {lic.authority}
                        </div>
                      </div>

                      <button
                        onClick={() => setActiveView('compliance')}
                        className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all ${
                          isDue
                            ? 'bg-[#1A1A1A] text-white hover:bg-black'
                            : 'bg-[#EFF5F1] text-[#079455] hover:bg-[#E0EAE4]'
                        }`}
                      >
                        {isDue ? 'Renew Now' : 'View Form'}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="mt-3 pt-2 border-t border-[#F0F5F2] flex items-center justify-between text-xs text-[#6E7B74]">
          <span>FCO Batch Register: Compliant</span>
          <span className="font-bold text-[#079455] flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Audit Ready
          </span>
        </div>
      </div>

      {/* 2. Operational Activity Audit Trail */}
      <div className="lg:col-span-6 bg-white rounded-3xl p-4 sm:p-5 border border-[#E2EAE5] card-shadow flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#EFF5F1] text-[#1A1A1A] flex items-center justify-center">
                <Activity className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-[#1A1A1A]">
                  Operational Audit Trail
                </h3>
                <p className="text-[11px] text-[#6E7B74]">
                  Immutable ledger of sales, GRNs, khata settlements & stock updates
                </p>
              </div>
            </div>

            <span className="text-[10px] font-bold text-[#079455] bg-[#E0EAE4] px-2 py-0.5 rounded-full">
              Live Sync
            </span>
          </div>

          <div className="flex flex-col gap-2">
            {safeActivities.length === 0 ? (
              <div className="p-4 text-center text-xs text-[#7A8B82] bg-[#F9FBF9] rounded-2xl border border-dashed border-[#DDE5E0]">
                No recent activity logged yet. Operations will stream here in real-time.
              </div>
            ) : (
              safeActivities.slice(0, 4).map((act) => (
                <div
                  key={act.id}
                  className="p-2.5 rounded-2xl bg-[#F9FBFA] hover:bg-[#F2F7F4] border border-[#E8EFEA] transition-all flex items-start justify-between gap-3"
                >
                  <div className="flex items-start gap-2.5">
                    <div className="p-1.5 rounded-xl bg-white border border-[#E0EAE4] shadow-2xs mt-0.5 flex-shrink-0">
                      {getActivityIcon(act.tag)}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[#1A1A1A] line-clamp-1">{act.action}</div>
                      <div className="text-[11px] text-[#55635C] line-clamp-1">{act.details}</div>
                      <div className="text-[10px] text-[#8C9C93] mt-0.5">
                        By <strong>{act.user}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <span className="text-[10px] font-semibold text-[#7A8B82] block">{act.time}</span>
                    {act.referenceId && (
                      <span className="text-[9px] font-mono text-[#079455] bg-[#E0EAE4] px-1.5 py-0.2 rounded font-bold">
                        {act.referenceId}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="mt-3 pt-2 border-t border-[#F0F5F2] flex items-center justify-between text-xs text-[#6E7B74]">
          <span>Realtime Supabase Activity Feed</span>
          <button
            onClick={() => setActiveView('intelligence')}
            className="text-xs font-bold text-[#079455] hover:underline"
          >
            Export Audit Trail (CSV) →
          </button>
        </div>
      </div>
    </div>
  );
};
