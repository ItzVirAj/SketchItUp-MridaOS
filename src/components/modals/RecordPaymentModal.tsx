import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  X,
  CreditCard,
  IndianRupee,
  CheckCircle2,
  Phone,
  Send,
  Building,
  QrCode,
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const RecordPaymentModal: React.FC = () => {
  const { khataLedger, recordKhataPayment, setActiveModal } = useApp();

  const [selectedCustomerId, setSelectedCustomerId] = useState(khataLedger[0]?.id || '');
  const [paymentAmount, setPaymentAmount] = useState<number>(10000);
  const [paymentMode, setPaymentMode] = useState<string>('UPI (PhonePe / GPay)');
  const [receiptNote, setReceiptNote] = useState('Crop harvest part settlement');

  const selectedCustomer = khataLedger.find((k) => k.id === selectedCustomerId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId || paymentAmount <= 0) return;

    recordKhataPayment(selectedCustomerId, paymentAmount, paymentMode);

    confetti({
      particleCount: 40,
      spread: 50,
      origin: { y: 0.6 },
    });

    setActiveModal('none');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-[#E2EAE5] overflow-hidden flex flex-col">
        <div className="p-4 sm:p-5 bg-[#F9FBF9] border-b border-[#E5ECE7] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[#079455] text-white flex items-center justify-center shadow-2xs">
              <IndianRupee className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#1A1A1A]">Record Khata Payment</h3>
              <p className="text-xs text-[#6E7B74]">Settle farmer credit balances & generate receipt</p>
            </div>
          </div>

          <button
            onClick={() => setActiveModal('none')}
            className="p-2 rounded-xl text-[#788880] hover:text-[#1A1A1A] hover:bg-[#EFF5F1] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-5 flex flex-col gap-4">
          <div>
            <label className="block text-xs font-bold text-[#1A1A1A] mb-1">Select Farmer / Customer</label>
            <select
              value={selectedCustomerId}
              onChange={(e) => {
                setSelectedCustomerId(e.target.value);
                const found = khataLedger.find((k) => k.id === e.target.value);
                if (found) setPaymentAmount(found.outstandingBalance);
              }}
              className="w-full px-3 py-2 rounded-xl border border-[#DCE6DF] bg-white text-xs font-semibold"
            >
              {khataLedger.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} — Outstanding: ₹{c.outstandingBalance.toLocaleString('en-IN')} ({c.village})
                </option>
              ))}
            </select>
          </div>

          {selectedCustomer && (
            <div className="p-3 bg-[#F9FBF9] rounded-2xl border border-[#E5ECE7] flex items-center justify-between text-xs">
              <div>
                <span className="text-[#7A8B82] block text-[11px]">Current Outstanding:</span>
                <span className="text-base font-extrabold text-[#D92D20]">
                  ₹{selectedCustomer.outstandingBalance.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[#7A8B82] block text-[11px]">Days Overdue:</span>
                <span className="font-bold text-[#1A1A1A]">{selectedCustomer.daysOverdue} Days</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#1A1A1A] mb-1">Payment Amount (₹)</label>
              <input
                type="number"
                required
                min="1"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-xl border border-[#DCE6DF] text-xs font-extrabold text-[#1A1A1A]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1A1A1A] mb-1">Payment Mode</label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#DCE6DF] bg-white text-xs font-semibold"
              >
                <option value="UPI (PhonePe / GPay)">UPI (PhonePe / GPay)</option>
                <option value="Cash at Counter">Cash at Counter</option>
                <option value="Direct Bank NEFT/RTGS">Direct Bank NEFT/RTGS</option>
                <option value="Post-Dated Cheque (PDC)">Post-Dated Cheque (PDC)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#1A1A1A] mb-1">Remarks / Note</label>
            <input
              type="text"
              value={receiptNote}
              onChange={(e) => setReceiptNote(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[#DCE6DF] text-xs font-medium text-[#1A1A1A]"
              placeholder="e.g. Tomato harvest crop settlement"
            />
          </div>

          <div className="mt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setActiveModal('none')}
              className="px-4 py-2 rounded-2xl border border-[#DCE6DF] text-xs font-bold text-[#55635C] hover:bg-[#F2F7F4]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-2xl bg-[#079455] hover:bg-[#067A46] text-white text-xs font-bold shadow-sm transition-all"
            >
              Confirm & Settle ₹{paymentAmount.toLocaleString('en-IN')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
