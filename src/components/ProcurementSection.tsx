import React from 'react';
import { useApp } from '../context/AppContext';
import {
  Truck,
  ArrowUpRight,
  Plus,
  Clock,
  CheckCircle2,
  PackageCheck,
} from 'lucide-react';
import { PurchaseOrder } from '../types';

export const ProcurementSection: React.FC = () => {
  const { purchaseOrders, setActiveModal, setActiveView } = useApp();

  const getStatusBadge = (status: PurchaseOrder['status']) => {
    switch (status) {
      case 'dispatched':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#E0F2FE] text-[#026AA2] flex items-center gap-1">
            <Truck className="w-3 h-3" />
            <span>Dispatched / In Transit</span>
          </span>
        );
      case 'grn_pending':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FEF0C7] text-[#B54708] flex items-center gap-1">
            <PackageCheck className="w-3 h-3" />
            <span>GRN Inward Pending</span>
          </span>
        );
      case 'pending_acknowledgement':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#F4EDDE] text-[#6E4F18] flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>Supplier Ack Pending</span>
          </span>
        );
      case 'received':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#E0EAE4] text-[#079455] flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>Fully Inwarded</span>
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#EFF5F1] text-[#55635C]">
            Draft
          </span>
        );
    }
  };

  return (
    <div className="bg-white rounded-3xl p-4 sm:p-5 border border-[#E2EAE5] card-shadow">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#EFF8FF] text-[#175CD3] flex items-center justify-center">
              <Truck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-[#1A1A1A] tracking-tight">
                Procurement & Inward Stock Inflow
              </h3>
              <p className="text-[11px] text-[#6E7B74]">
                Active distributor purchase orders, supplier rate contracts & GRN goods receipt
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveModal('create_po')}
            className="px-3.5 py-1.5 rounded-2xl bg-[#1A1A1A] hover:bg-black text-white text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Create Purchase Order</span>
          </button>
        </div>
      </div>

      {/* Grid of Purchase Orders */}
      {purchaseOrders.length === 0 ? (
        <div className="py-12 px-4 text-center bg-[#F9FBF9] rounded-2xl border border-dashed border-[#CCD8D0]">
          <Truck className="w-8 h-8 text-[#8C9C93] mx-auto mb-2 opacity-50" />
          <p className="text-sm font-bold text-[#1A1A1A]">No Purchase Orders</p>
          <p className="text-xs text-[#6E7B74] mt-1 max-w-sm mx-auto">
            You have no active or historical procurement purchase orders.
          </p>
          <button
            onClick={() => setActiveModal('create_po')}
            className="mt-3 px-3.5 py-1.5 rounded-xl bg-[#1A1A1A] text-white text-xs font-bold shadow-2xs inline-flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Issue Purchase Order</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {purchaseOrders.map((po) => (
            <div
              key={po.id}
              className="p-3.5 bg-[#F9FBF9] hover:bg-white rounded-2xl border border-[#E5ECE7] hover:border-[#079455] transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono font-bold text-xs text-[#1A1A1A]">
                    {po.poNumber}
                  </span>
                  {getStatusBadge(po.status)}
                </div>

                <h4 className="font-bold text-xs text-[#1A1A1A] line-clamp-1 group-hover:text-[#079455] transition-colors">
                  {po.supplierName}
                </h4>

                <div className="mt-2.5 p-2 bg-white rounded-xl border border-[#EBEFEA] text-xs flex flex-col gap-1">
                  <div className="flex items-center justify-between text-[#68776F]">
                    <span>Total Amount:</span>
                    <strong className="text-[#1A1A1A] font-extrabold">
                      ₹{po.totalAmount.toLocaleString('en-IN')}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between text-[#68776F]">
                    <span>Line Items:</span>
                    <span className="font-semibold text-[#1A1A1A]">{po.itemsCount} SKUs</span>
                  </div>
                  <div className="flex items-center justify-between text-[#68776F]">
                    <span>Expected Arrival:</span>
                    <span className="font-semibold text-[#079455]">{po.expectedDelivery}</span>
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-[#EBEFEA] flex items-center justify-between text-[10px] text-[#7A8B82]">
                <span>Terms: {po.paymentTerms}</span>
                <button
                  onClick={() => setActiveView('procurement')}
                  className="text-xs font-bold text-[#079455] hover:underline flex items-center gap-0.5"
                >
                  <span>Track GRN</span>
                  <ArrowUpRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
