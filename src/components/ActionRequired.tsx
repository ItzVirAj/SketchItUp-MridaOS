import React from 'react';
import { useApp } from '../context/AppContext';
import {
  AlertTriangle,
  Clock,
  ArrowUpRight,
  CheckCircle2,
  X,
  ShieldAlert,
  Boxes,
  CreditCard,
  Sprout,
  FileCheck,
} from 'lucide-react';
import { OperationalAlert } from '../types';

export const ActionRequired: React.FC = () => {
  const { alerts = [], dismissAlert, setActiveModal, setActiveView } = useApp();
  const safeAlerts = alerts || [];

  const handleActionClick = (alert: OperationalAlert) => {
    switch (alert.actionType) {
      case 'review_expiry':
        setActiveView('inventory_fefo');
        break;
      case 'create_po':
        setActiveModal('create_po');
        break;
      case 'view_khata':
        setActiveView('khata_ledger');
        break;
      case 'renew_license':
        setActiveView('compliance');
        break;
      case 'view_tasks':
        setActiveView('nursery_care');
        break;
      case 'stock_audit':
        setActiveModal('stock_adjust');
        break;
      default:
        break;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'inventory':
        return <Boxes className="w-4 h-4" />;
      case 'khata':
        return <CreditCard className="w-4 h-4" />;
      case 'compliance':
        return <FileCheck className="w-4 h-4" />;
      case 'nursery':
        return <Sprout className="w-4 h-4" />;
      default:
        return <AlertTriangle className="w-4 h-4" />;
    }
  };

  if (safeAlerts.length === 0) {
    return (
      <div className="bg-white rounded-3xl p-6 border border-[#E2EAE5] card-shadow flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#E0EAE4] text-[#079455] flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#1A1A1A]">Operational Deck is Clear</h3>
            <p className="text-xs text-[#6E7B74]">No overdue khata, expiring batches, or pending statutory compliance actions.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl p-4 sm:p-5 border border-[#E2EAE5] card-shadow">
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-[#FEF0C7] text-[#B54708] flex items-center justify-center">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-[#1A1A1A] tracking-tight">
              Action Required Today
            </h2>
            <p className="text-[11px] text-[#6E7B74]">
              High-priority operational decisions requiring owner / store manager action
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-[#B54708] bg-[#FEF0C7] px-2.5 py-0.5 rounded-full">
            {safeAlerts.length} Pending Actions
          </span>
        </div>
      </div>

      {/* Grid of Alert Cards (styled like Reference Image 1 & 5 alerts) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {safeAlerts.map((alert) => {
          const isCritical = alert.severity === 'critical';
          const isWarning = alert.severity === 'warning';

          return (
            <div
              key={alert.id}
              className={`p-3.5 rounded-2xl border transition-all duration-200 flex flex-col justify-between relative group ${
                isCritical
                  ? 'bg-[#FEF3F2]/60 border-[#FECDCA] hover:border-[#F04438]'
                  : isWarning
                  ? 'bg-[#FFFAEB]/60 border-[#FEDF89] hover:border-[#F79009]'
                  : 'bg-[#F4EDDE]/50 border-[#E8DCC2] hover:border-[#B57C1E]'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`p-1 rounded-lg text-xs font-bold flex items-center gap-1 ${
                        isCritical
                          ? 'bg-[#FEE4E2] text-[#D92D20]'
                          : isWarning
                          ? 'bg-[#FEF0C7] text-[#B54708]'
                          : 'bg-[#E0EAE4] text-[#079455]'
                      }`}
                    >
                      {getCategoryIcon(alert.category)}
                      <span className="capitalize text-[10px]">{alert.category}</span>
                    </span>

                    {alert.countOrValue && (
                      <span className="text-[10px] font-bold text-[#1A1A1A] bg-white/80 px-2 py-0.5 rounded-md border border-black/5">
                        {alert.countOrValue}
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => dismissAlert(alert.id)}
                    className="p-1 rounded-md text-[#98A2B3] hover:text-[#1A1A1A] hover:bg-black/5 transition-colors"
                    title="Acknowledge / Dismiss"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <h4 className="text-xs sm:text-[13px] font-bold text-[#1A1A1A] line-clamp-1 leading-snug">
                  {alert.title}
                </h4>
                <p className="text-[11px] text-[#55635C] mt-1 line-clamp-2 leading-relaxed">
                  {alert.description}
                </p>
              </div>

              {/* Bottom Action Button & Timestamp */}
              <div className="mt-3 pt-2.5 border-t border-black/5 flex items-center justify-between">
                <div className="flex items-center gap-1 text-[10px] text-[#7A8B82]">
                  <Clock className="w-3 h-3" />
                  <span>{alert.timestamp}</span>
                </div>

                <button
                  onClick={() => handleActionClick(alert)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1 transition-all ${
                    isCritical
                      ? 'bg-[#D92D20] text-white hover:bg-[#B42318] shadow-2xs'
                      : isWarning
                      ? 'bg-[#1A1A1A] text-white hover:bg-black shadow-2xs'
                      : 'bg-[#079455] text-white hover:bg-[#067A46] shadow-2xs'
                  }`}
                >
                  <span>{alert.actionLabel}</span>
                  <ArrowUpRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
