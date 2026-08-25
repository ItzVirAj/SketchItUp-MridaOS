import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  X,
  RefreshCw,
  AlertTriangle,
  Boxes,
  CheckCircle2,
} from 'lucide-react';

export const StockAdjustModal: React.FC = () => {
  const { inventory, adjustStock, setActiveModal } = useApp();

  const [selectedItemId, setSelectedItemId] = useState(inventory[0]?.id || '');
  const [batchNumber, setBatchNumber] = useState('CRM-24-9921');
  const [varianceQty, setVarianceQty] = useState<number>(-2);
  const [reason, setReason] = useState('Bag Leakage / Transit Moisture Damage');

  const selectedItem = inventory.find((i) => i.id === selectedItemId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemId) return;
    adjustStock(selectedItemId, batchNumber, varianceQty, reason);
    setActiveModal('none');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-[#E2EAE5] overflow-hidden flex flex-col">
        <div className="p-4 sm:p-5 bg-[#F9FBF9] border-b border-[#E5ECE7] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[#1A1A1A] text-white flex items-center justify-center shadow-2xs">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#1A1A1A]">Stock Adjustment & FEFO Write-Off</h3>
              <p className="text-xs text-[#6E7B74]">Reconcile physical variance or expired batch write-down</p>
            </div>
          </div>

          <button
            onClick={() => setActiveModal('none')}
            className="p-2 rounded-xl text-[#788880] hover:text-[#1A1A1A] hover:bg-[#EFF5F1] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-5 flex flex-col gap-3.5 text-xs">
          <div>
            <label className="block font-bold text-[#1A1A1A] mb-1">Select Inventory Item</label>
            <select
              value={selectedItemId}
              onChange={(e) => {
                setSelectedItemId(e.target.value);
                const found = inventory.find((i) => i.id === e.target.value);
                if (found && found.batches[0]) {
                  setBatchNumber(found.batches[0].batchNumber);
                }
              }}
              className="w-full px-3 py-2 rounded-xl border border-[#DCE6DF] bg-white font-semibold"
            >
              {inventory.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name} (Current Stock: {i.stockQty} {i.unit})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block font-bold text-[#1A1A1A] mb-1">Batch Number</label>
              <input
                type="text"
                value={batchNumber}
                onChange={(e) => setBatchNumber(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#DCE6DF] font-mono font-bold"
              />
            </div>

            <div>
              <label className="block font-bold text-[#1A1A1A] mb-1">Adjustment Quantity (+ / -)</label>
              <input
                type="number"
                value={varianceQty}
                onChange={(e) => setVarianceQty(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-xl border border-[#DCE6DF] font-extrabold text-center"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-[#1A1A1A] mb-1">Adjustment Reason</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[#DCE6DF] bg-white font-medium"
            >
              <option value="Bag Leakage / Transit Moisture Damage">Bag Leakage / Transit Moisture Damage</option>
              <option value="Expired Batch FEFO Write-Off">Expired Batch FEFO Write-Off</option>
              <option value="Physical Audit Discrepancy Found">Physical Audit Discrepancy Found</option>
              <option value="Return to Vendor (RTV) Rejected Stock">Return to Vendor (RTV) Rejected Stock</option>
              <option value="Nursery Plant Mortality / Wilted">Nursery Plant Mortality / Wilted</option>
            </select>
          </div>

          <div className="p-3 bg-[#FFFAEB] rounded-2xl border border-[#FEDF89] text-[11px] text-[#7A540E]">
            ⚠️ This will record an immutable variance audit log and adjust current book inventory.
          </div>

          <div className="mt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setActiveModal('none')}
              className="px-4 py-2 rounded-2xl border border-[#DCE6DF] font-bold text-[#55635C] hover:bg-[#F2F7F4]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-2xl bg-[#1A1A1A] hover:bg-black text-white font-bold shadow-sm transition-all"
            >
              Post Adjustment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
