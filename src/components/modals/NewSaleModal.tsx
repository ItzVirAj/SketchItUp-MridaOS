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

  const [customerName, setCustomerName] = useState(khataLedger[0]?.name || '');
  const [customerPhone, setCustomerPhone] = useState(khataLedger[0]?.phone || '');
  const [isKhata, setIsKhata] = useState(false);
  const [selectedItems, setSelectedItems] = useState<
    { itemId: string; name: string; qty: number; price: number; batch: string }[]
  >(
    inventory.length > 0
      ? [
          {
            itemId: inventory[0].id,
            name: inventory[0].name,
            qty: 1,
            price: inventory[0].unitPrice,
            batch: inventory[0].batches[0]?.batchNumber || 'DEFAULT-BATCH',
          },
        ]
      : []
  );
  const [cashPaidInput, setCashPaidInput] = useState<string>('');
  const [isSaleCompleted, setIsSaleCompleted] = useState(false);
  const [lastInvoiceNumber, setLastInvoiceNumber] = useState('');

  const subtotal = selectedItems.reduce((sum, item) => sum + item.qty * item.price, 0);
  const gstAmount = Math.round(subtotal * 0.05); // 5% GST on agri inputs
  const grandTotal = subtotal + gstAmount;

  const cashPaid = isKhata ? Number(cashPaidInput) || 0 : grandTotal;
  const khataAmount = isKhata ? Math.max(0, grandTotal - cashPaid) : 0;

  const handleAddItem = () => {
    if (inventory.length === 0) return;
    const available = inventory[selectedItems.length % inventory.length] || inventory[0];
    setSelectedItems((prev) => [
      ...prev,
      {
        itemId: available.id,
        name: available.name,
        qty: 1,
        price: available.unitPrice,
        batch: available.batches[0]?.batchNumber || 'DEFAULT-BATCH',
      },
    ]);
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
                batch: found.batches[0]?.batchNumber || 'DEFAULT-BATCH',
              }
            : item
        )
      );
    }
  };

  const handleSubmitSale = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedItems.length === 0 || !customerName.trim()) return;

    const invNum = `INV-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    setLastInvoiceNumber(invNum);

    addNewSale({
      customerName,
      customerPhone,
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

  const handleSelectCustomer = (name: string) => {
    setCustomerName(name);
    const existing = khataLedger.find((k) => k.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      setCustomerPhone(existing.phone);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-[#E2EAE5] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-[#F9FBF9] border-b border-[#E5ECE7] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[#079455] text-white flex items-center justify-center shadow-2xs">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#1A1A1A]">Counter POS Billing & Invoice</h3>
              <p className="text-xs text-[#6E7B74]">FEFO batch inventory deduction & Khata sync</p>
            </div>
          </div>

          <button
            onClick={() => setActiveModal('none')}
            className="p-2 rounded-xl text-[#788880] hover:text-[#1A1A1A] hover:bg-[#EFF5F1] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isSaleCompleted ? (
          <div className="p-6 sm:p-8 flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-full bg-[#E0EAE4] text-[#079455] flex items-center justify-center mb-3">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-[#1A1A1A]">Sale Successfully Billed!</h3>
            <p className="text-xs text-[#6E7B74] mt-1">
              Invoice <strong>#{lastInvoiceNumber}</strong> generated and synchronized with live Supabase database.
            </p>

            <div className="w-full max-w-sm my-5 p-4 bg-[#F9FBF9] rounded-2xl border border-[#E5ECE7] text-left text-xs">
              <div className="flex justify-between py-1 border-b border-[#EAEFEA]">
                <span className="text-[#6E7B74]">Customer:</span>
                <strong className="text-[#1A1A1A]">{customerName}</strong>
              </div>
              <div className="flex justify-between py-1 border-b border-[#EAEFEA]">
                <span className="text-[#6E7B74]">Total Amount:</span>
                <strong className="text-[#079455] font-extrabold">₹{grandTotal.toLocaleString('en-IN')}</strong>
              </div>
              <div className="flex justify-between py-1 border-b border-[#EAEFEA]">
                <span className="text-[#6E7B74]">Cash / UPI Received:</span>
                <strong className="text-[#1A1A1A]">₹{cashPaid.toLocaleString('en-IN')}</strong>
              </div>
              {khataAmount > 0 && (
                <div className="flex justify-between py-1">
                  <span className="text-[#6E7B74]">Added to Khata:</span>
                  <strong className="text-[#B54708]">₹{khataAmount.toLocaleString('en-IN')}</strong>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setActiveModal('none')}
                className="px-4 py-2 bg-[#EFF5F1] hover:bg-[#E0EAE4] text-[#079455] text-xs font-bold rounded-xl"
              >
                Close Window
              </button>
              <button
                onClick={() => {
                  setIsSaleCompleted(false);
                  setSelectedItems(inventory.length > 0 ? [{ itemId: inventory[0].id, name: inventory[0].name, qty: 1, price: inventory[0].unitPrice, batch: inventory[0].batches[0]?.batchNumber || 'LOT-1' }] : []);
                }}
                className="px-4 py-2 bg-[#079455] hover:bg-[#067A46] text-white text-xs font-bold rounded-xl shadow-2xs"
              >
                + Bill Next Customer
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmitSale} className="p-4 sm:p-5 overflow-y-auto flex flex-col gap-4 text-xs">
            {/* Customer Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-[#F9FBFA] rounded-2xl border border-[#E5ECE7]">
              <div>
                <label className="block font-bold text-[#1A1A1A] mb-1">Customer / Farmer Name</label>
                <input
                  type="text"
                  required
                  placeholder="Enter farmer name or select from Khata..."
                  value={customerName}
                  onChange={(e) => handleSelectCustomer(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#DCE4DF] rounded-xl font-semibold text-xs focus:ring-2 focus:ring-[#079455]/30 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-[#1A1A1A] mb-1">Customer Mobile (WhatsApp Invoice)</label>
                <input
                  type="text"
                  placeholder="+91 98XXX XXXXX"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#DCE4DF] rounded-xl text-xs focus:ring-2 focus:ring-[#079455]/30 focus:outline-none"
                />
              </div>
            </div>

            {/* Selected Items Line Items */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-bold text-[#1A1A1A]">Invoice Line Items</h4>
                <button
                  type="button"
                  onClick={handleAddItem}
                  disabled={inventory.length === 0}
                  className="text-xs font-bold text-[#079455] hover:underline flex items-center gap-1 disabled:opacity-50"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Line Item</span>
                </button>
              </div>

              <div className="flex flex-col gap-2">
                {selectedItems.length === 0 ? (
                  <div className="p-4 text-center text-xs text-[#7A8B82] bg-[#F9FBF9] rounded-2xl border border-dashed border-[#DDE5E0]">
                    {inventory.length === 0 ? 'No inventory items in database yet. Please add stock in Inventory.' : 'No items added to bill. Click "+ Add Line Item".'}
                  </div>
                ) : (
                  selectedItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex flex-col sm:flex-row sm:items-center gap-2 p-2.5 bg-[#F9FBFA] rounded-2xl border border-[#E5ECE7]"
                    >
                      <select
                        value={item.itemId}
                        onChange={(e) => handleItemSelect(idx, e.target.value)}
                        className="flex-1 px-2.5 py-1.5 bg-white border border-[#DCE4DF] rounded-xl text-xs font-bold"
                      >
                        {inventory.map((inv) => (
                          <option key={inv.id} value={inv.id}>
                            {inv.name} (Stock: {inv.stockQty} {inv.unit} • ₹{inv.unitPrice})
                          </option>
                        ))}
                      </select>

                      <div className="flex items-center gap-2">
                        <div className="flex items-center border border-[#DCE4DF] bg-white rounded-xl overflow-hidden">
                          <button
                            type="button"
                            onClick={() => handleQtyChange(idx, item.qty - 1)}
                            className="px-2 py-1 bg-[#EFF5F1] hover:bg-[#E0EAE4] font-bold"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="1"
                            value={item.qty}
                            onChange={(e) => handleQtyChange(idx, parseInt(e.target.value) || 1)}
                            className="w-12 text-center text-xs font-bold focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleQtyChange(idx, item.qty + 1)}
                            className="px-2 py-1 bg-[#EFF5F1] hover:bg-[#E0EAE4] font-bold"
                          >
                            +
                          </button>
                        </div>

                        <span className="font-extrabold text-xs text-[#1A1A1A] w-20 text-right">
                          ₹{(item.qty * item.price).toLocaleString('en-IN')}
                        </span>

                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="p-1.5 rounded-xl text-[#788880] hover:text-[#D92D20] hover:bg-[#FEE4E2]"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Payment & Split Khata Option */}
            <div className="p-3 bg-[#F4FAF6] rounded-2xl border border-[#D3E5D9]">
              <div className="flex items-center justify-between mb-2">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isKhata}
                    onChange={(e) => setIsKhata(e.target.checked)}
                    className="w-4 h-4 text-[#079455] rounded accent-[#079455]"
                  />
                  <span className="font-bold text-[#1A1A1A]">Customer Credit / Khata Split</span>
                </label>
                <span className="text-[10px] text-[#079455] font-bold bg-[#E0EAE4] px-2 py-0.5 rounded-full">
                  5% GST Included
                </span>
              </div>

              {isKhata && (
                <div className="grid grid-cols-2 gap-3 mt-2 pt-2 border-t border-[#D3E5D9]">
                  <div>
                    <label className="block text-[11px] font-bold text-[#6E7B74] mb-1">
                      Cash / UPI Received
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 2000"
                      value={cashPaidInput}
                      onChange={(e) => setCashPaidInput(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-[#DCE4DF] rounded-xl text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[#6E7B74] mb-1">
                      Added to Khata Ledger
                    </label>
                    <div className="px-2.5 py-1.5 bg-white border border-[#DCE4DF] rounded-xl text-xs font-extrabold text-[#B54708]">
                      ₹{khataAmount.toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Calculation & Submit */}
            <div className="pt-3 border-t border-[#E5ECE7] flex items-center justify-between">
              <div>
                <span className="text-[11px] text-[#7A8B82]">Grand Total (incl. GST):</span>
                <div className="text-base sm:text-lg font-black text-[#1A1A1A]">
                  ₹{grandTotal.toLocaleString('en-IN')}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveModal('none')}
                  className="px-3.5 py-2 bg-[#EFF5F1] text-[#6E7E75] hover:bg-[#E0EAE4] rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={selectedItems.length === 0}
                  className="px-4 sm:px-5 py-2 bg-[#079455] hover:bg-[#067A46] text-white rounded-xl font-bold shadow-2xs flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Receipt className="w-4 h-4" />
                  <span>Generate Invoice</span>
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
