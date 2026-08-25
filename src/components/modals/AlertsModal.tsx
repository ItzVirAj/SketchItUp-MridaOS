import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  X,
  Bell,
  AlertTriangle,
  Clock,
  ArrowUpRight,
  CheckCircle2,
} from 'lucide-react';

export const AlertsModal: React.FC = () => {
  const { alerts, dismissAlert, setActiveModal, setActiveView } = useApp();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-[#E2EAE5] overflow-hidden flex flex-col max-h-[85vh]">
        <div className="p-4 sm:p-5 bg-[#1A1A1A] text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
              <Bell className="w-4 h-4 text-[#F9AD19]" />
            </div>
            <div>
              <h3 className="text-base font-bold">Operational Alerts Radar</h3>
              <p className="text-xs text-white/70">{alerts.length} critical issues & pending reminders</p>
            </div>
          </div>

          <button
            onClick={() => setActiveModal('none')}
            className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-5 overflow-y-auto flex-1 flex flex-col gap-3">
          {alerts.map((alert) => {
            const isCritical = alert.severity === 'critical';
            const isWarning = alert.severity === 'warning';

            return (
              <div
                key={alert.id}
                className={`p-3.5 rounded-2xl border flex items-start justify-between gap-3 ${
                  isCritical
                    ? 'bg-[#FEF3F2] border-[#FECDCA]'
                    : isWarning
                    ? 'bg-[#FFFAEB] border-[#FEDF89]'
                    : 'bg-[#F4EDDE]/50 border-[#E8DCC2]'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <div
                    className={`p-2 rounded-xl mt-0.5 ${
                      isCritical
                        ? 'bg-[#FEE4E2] text-[#D92D20]'
                        : isWarning
                        ? 'bg-[#FEF0C7] text-[#B54708]'
                        : 'bg-[#E0EAE4] text-[#079455]'
                    }`}
                  >
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs sm:text-sm font-bold text-[#1A1A1A]">{alert.title}</h4>
                      {alert.countOrValue && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white border border-black/10">
                          {alert.countOrValue}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#55635C] mt-1">{alert.description}</p>
                    <span className="text-[10px] text-[#7A8B82] mt-1 block flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {alert.timestamp}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => {
                      setActiveModal('none');
                      if (alert.actionType === 'review_expiry') setActiveView('inventory_fefo');
                      if (alert.actionType === 'create_po') setActiveModal('create_po');
                      if (alert.actionType === 'view_khata') setActiveView('khata_ledger');
                      if (alert.actionType === 'renew_license') setActiveView('compliance');
                      if (alert.actionType === 'view_tasks') setActiveView('nursery_care');
                      if (alert.actionType === 'stock_audit') setActiveModal('stock_adjust');
                    }}
                    className="px-3 py-1 bg-[#1A1A1A] text-white hover:bg-black text-xs font-bold rounded-xl flex items-center gap-1"
                  >
                    <span>{alert.actionLabel}</span>
                    <ArrowUpRight className="w-3 h-3" />
                  </button>

                  <button
                    onClick={() => dismissAlert(alert.id)}
                    className="text-[11px] text-[#7A8B82] hover:text-[#1A1A1A] font-semibold text-right"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
