import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  X,
  Plus,
  Trash2,
  Receipt,
  CreditCard,
  IndianRupee,
  CheckCircle2,
  Printer,
  Sparkles,
  ShoppingBag,
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const NewSaleModal: React.FC = () => {
  const { inventory, khataLedger, addNewSale, setActiveModal } = useApp();

  const [customerName, setCustomerName] = useState('Ramesh Balasaheb Patil');
  const [isKhata, setIsKhata] = useState(false);
  const [selectedItems, setSelectedItems] = useState<
    { itemId: string; name: string; qty: number; price: number; batch: string }[]
  >([
    {
      itemId: inventory[0]?.id || '1',
      name: inventory[0]?.name || 'IFFCO Neem Coated Urea',
      qty: 2,
      price: inventory[0]?.unitPrice || 266.5,
      batch: inventory[0]?.batches[0]?.batchNumber || 'IFC-2025-U89',
    },
  ]);
  const [cashPaidInput, setCashPaidInput] = useState<string>('');
  const [isSaleCompleted, setIsSaleCompleted] = useState(false);
  const [lastInvoiceNumber, setLastInvoiceNumber] = useState('');

  const subtotal = selectedItems.reduce((sum, item) => sum + item.qty * item.price, 0);
  const gstAmount = Math.round(subtotal * 0.05); // 5% GST on agri inputs
  const grandTotal = subtotal + gstAmount;

  const cashPaid = isKhata ? Number(cashPaidInput) || 0 : grandTotal;
  const khataAmount = isKhata ? Math.max(0, grandTotal - cashPaid) : 0;

  const handleAddItem = () => {
    const available = inventory[selectedItems.length % inventory.length];
    if (available) {
      setSelectedItems((prev) => [
        ...prev,
        {
          itemId: available.id,
          name: available.name,
          qty: 1,
          price: available.unitPrice,
          batch: available.batches[0]?.batchNumber || 'DEFAULT-LOT',
        },
      ]);
    }
  };

  const handleRemoveItem = (index: number) => {
    setSelectedItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleQtyChange = (index: number, qty: number) => {
    setSelectedItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, qty: Math.max(1, qty) } : item))
    );
  };

  const handleItemSelect = (index: number, itemId: string) => {
    const found = inventory.find((i) => i.id === itemId);
    if (found) {
      setSelectedItems((prev) =>
        prev.map((item, i) =>
          i === index
            ? {
                ...item,
                itemId: found.id,
                name: found.name,
                price: found.unitPrice,
                batch: found.batches[0]?.batchNumber || 'LOT-1',
              }
            : item
        )
      );
    }
  };

  const handleSubmitSale = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedItems.length === 0) return;

    const invNum = `INV-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    setLastInvoiceNumber(invNum);

    addNewSale({
      customerName,
      isKhata,
      items: selectedItems,
      total: grandTotal,
      cashPaid,
      khataAmount,
    });

    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.6 },
    });

    setIsSaleCompleted(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-[#E2EAE5] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-[#F9FBF9] border-b border-[#E5ECE7] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[#079455] text-white flex items-center justify-center shadow-2xs">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#1A1A1A]">Counter Sale & GST Invoice</h3>
              <p className="text-xs text-[#6E7B74]">High-speed POS billing with FEFO batch assignment & Khata credit</p>
            </div>
          </div>

          <button
            onClick={() => setActiveModal('none')}
            className="p-2 rounded-xl text-[#788880] hover:text-[#1A1A1A] hover:bg-[#EFF5F1] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        {isSaleCompleted ? (
          <div className="p-8 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-3xl bg-[#E0EAE4] text-[#079455] flex items-center justify-center mb-4">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <h3 className="text-xl font-extrabold text-[#1A1A1A]">Sale Successfully Billed!</h3>
            <p className="text-xs text-[#55635C] mt-1 max-w-sm">
              GST Invoice <strong>#{lastInvoiceNumber}</strong> generated for <strong>{customerName}</strong>. Total billed: <strong>₹{grandTotal.toLocaleString('en-IN')}</strong>.
            </p>

            {isKhata && (
              <div className="mt-3 p-3 bg-[#FEF3F2] border border-[#FECDCA] rounded-2xl text-xs font-semibold text-[#B42318]">
                ₹{khataAmount.toLocaleString('en-IN')} recorded in {customerName}'s Khata account.
              </div>
            )}

            <div className="mt-6 flex items-center gap-3">
              <button
                onClick={() => {
                  window.print();
                }}
                className="px-4 py-2 bg-[#1A1A1A] text-white hover:bg-black rounded-2xl text-xs font-bold flex items-center gap-2 shadow-2xs"
              >
                <Printer className="w-4 h-4" />
                <span>Print GST Thermal Receipt</span>
              </button>
              <button
                onClick={() => {
                  setIsSaleCompleted(false);
                  setSelectedItems([]);
                  setActiveModal('none');
                }}
                className="px-4 py-2 bg-[#079455] text-white hover:bg-[#067A46] rounded-2xl text-xs font-bold shadow-2xs"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmitSale} className="p-4 sm:p-5 overflow-y-auto flex-1 flex flex-col gap-4">
            {/* Customer Selector */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#1A1A1A] mb-1">Customer / Farmer Name</label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#DCE6DF] text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#079455]/30 focus:border-[#079455]"
                  placeholder="Enter farmer name or select..."
                />
              </div>

              {/* Payment Mode Selector */}
              <div>
                <label className="block text-xs font-bold text-[#1A1A1A] mb-1">Billing Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setIsKhata(false)}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                      !isKhata
                        ? 'bg-[#079455] text-white border-[#079455] shadow-2xs'
                        : 'bg-[#F9FBFA] border-[#DCE6DF] text-[#55635C]'
                    }`}
                  >
                    Cash / UPI Immediate
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsKhata(true)}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                      isKhata
                        ? 'bg-[#1A1A1A] text-white border-[#1A1A1A] shadow-2xs'
                        : 'bg-[#F9FBFA] border-[#DCE6DF] text-[#55635C]'
                    }`}
                  >
                    Khata Credit / Split
                  </button>
                </div>
              </div>
            </div>

            {/* Line Items List */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-[#1A1A1A]">Line Items & FEFO Batches</label>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="text-xs font-bold text-[#079455] hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Line Item</span>
                </button>
              </div>

              <div className="flex flex-col gap-2">
                {selectedItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-[#F9FBF9] rounded-2xl border border-[#E5ECE7] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                  >
                    {/* Item Select */}
                    <div className="flex-1 min-w-[160px]">
                      <select
                        value={item.itemId}
                        onChange={(e) => handleItemSelect(idx, e.target.value)}
                        className="w-full px-2 py-1.5 rounded-lg border border-[#DCE6DF] bg-white font-semibold text-[#1A1A1A]"
                      >
                        {inventory.map((inv) => (
                          <option key={inv.id} value={inv.id}>
                            {inv.name} (Stock: {inv.stockQty} {inv.unit})
                          </option>
                        ))}
                      </select>
                      <div className="text-[10px] text-[#7A8B82] mt-0.5 font-mono">
                        Assigned FEFO Batch: {item.batch}
                      </div>
                    </div>

                    {/* Qty & Price */}
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-[#7A8B82]">Qty:</span>
                        <input
                          type="number"
                          min="1"
                          value={item.qty}
                          onChange={(e) => handleQtyChange(idx, parseInt(e.target.value) || 1)}
                          className="w-14 px-2 py-1 rounded-lg border border-[#DCE6DF] bg-white text-center font-bold"
                        />
                      </div>

                      <div className="text-right min-w-[70px]">
                        <span className="font-extrabold text-[#1A1A1A] block">
                          ₹{(item.qty * item.price).toLocaleString('en-IN')}
                        </span>
                        <span className="text-[10px] text-[#8C9C93]">₹{item.price}/unit</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="p-1 rounded-lg text-[#98A2B3] hover:text-[#D92D20] hover:bg-[#FEE4E2]"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Split Details if Khata */}
            {isKhata && (
              <div className="p-3 bg-[#FFFAEB] rounded-2xl border border-[#FEDF89] text-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-[#47300B]">Khata Credit Settlement Split</span>
                  <span className="text-[10px] text-[#7A540E]">Farmer Limit: ₹50,000</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-[#55635C] block mb-1">Cash Paid Upfront (₹):</label>
                    <input
                      type="number"
                      value={cashPaidInput}
                      onChange={(e) => setCashPaidInput(e.target.value)}
                      placeholder="0"
                      className="w-full px-3 py-1.5 rounded-xl border border-[#DCE6DF] bg-white text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-[#55635C] block mb-1">Balance added to Khata (₹):</label>
                    <div className="px-3 py-1.5 rounded-xl bg-white border border-[#FEDF89] text-xs font-extrabold text-[#D92D20]">
                      ₹{khataAmount.toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Bill Summary */}
            <div className="p-3 bg-[#F2F7F4] rounded-2xl border border-[#D5E5DB] text-xs flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-[#55635C]">
                <span>Taxable Value:</span>
                <span>₹{subtotal.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex items-center justify-between text-[#55635C]">
                <span>Agri-GST (5% FCO Standard):</span>
                <span>₹{gstAmount.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-[#D5E5DB] font-extrabold text-sm text-[#1A1A1A]">
                <span>Grand Total:</span>
                <span className="text-[#079455]">₹{grandTotal.toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* Action Buttons */}
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
                disabled={selectedItems.length === 0}
                className="px-5 py-2 rounded-2xl bg-[#079455] hover:bg-[#067A46] text-white text-xs font-bold shadow-sm transition-all"
              >
                Generate GST Invoice (₹{grandTotal.toLocaleString('en-IN')})
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
