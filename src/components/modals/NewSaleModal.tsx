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
  Building2,
  FileSpreadsheet,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { GSTInvoiceModal } from './GSTInvoiceModal';
import { calculateGSTInvoiceSummary, STANDARD_HSN_CODES } from '../../../supabase/functions/_shared/gst';
import { SaleRecord } from '../../types';

export const NewSaleModal: React.FC = () => {
  const { inventory, khataLedger, addNewSale, setActiveModal } = useApp();

  const [customerName, setCustomerName] = useState(khataLedger[0]?.name || 'Walk-in Farmer');
  const [customerPhone, setCustomerPhone] = useState(khataLedger[0]?.phone || '');
  const [customerGstin, setCustomerGstin] = useState('');
  const [customerStateCode, setCustomerStateCode] = useState('27'); // 27 - Maharashtra
  const [isKhata, setIsKhata] = useState(false);
  const [selectedItems, setSelectedItems] = useState<
    { itemId: string; name: string; qty: number; price: number; batch: string; hsnCode: string; gstRate: number }[]
  >(
    inventory.length > 0
      ? [
          {
            itemId: inventory[0].id,
            name: inventory[0].name,
            qty: 1,
            price: inventory[0].unitPrice,
            batch: inventory[0].batches[0]?.batchNumber || 'DEFAULT-BATCH',
            hsnCode: STANDARD_HSN_CODES[inventory[0].name]?.hsn || '3102',
            gstRate: STANDARD_HSN_CODES[inventory[0].name]?.rate ?? 18.0,
          },
        ]
      : []
  );
  const [cashPaidInput, setCashPaidInput] = useState<string>('');
  const [isSaleCompleted, setIsSaleCompleted] = useState(false);
  const [completedSaleRecord, setCompletedSaleRecord] = useState<SaleRecord | null>(null);
  const [completedInvoiceData, setCompletedInvoiceData] = useState<any>(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  // Live GST breakdown computation
  const isInterstate = customerStateCode.trim() !== '27';
  const lineItemInputs = selectedItems.map((it) => ({
    item_id: it.itemId,
    name: it.name,
    qty: it.qty,
    price: it.price,
    batch: it.batch,
    hsn_code: it.hsnCode,
    gst_rate: it.gstRate,
  }));

  const liveGstSummary = calculateGSTInvoiceSummary(lineItemInputs, {
    customerStateCode,
    branchStateCode: '27',
  });

  const grandTotal = liveGstSummary.grand_total;
  const cashPaid = isKhata ? Number(cashPaidInput) || 0 : grandTotal;
  const khataAmount = isKhata ? Math.max(0, grandTotal - cashPaid) : 0;

  const handleAddItem = () => {
    if (inventory.length === 0) return;
    const available = inventory[selectedItems.length % inventory.length] || inventory[0];
    const std = STANDARD_HSN_CODES[available.name] || { hsn: '3102', rate: 18.0 };
    setSelectedItems((prev) => [
      ...prev,
      {
        itemId: available.id,
        name: available.name,
        qty: 1,
        price: available.unitPrice,
        batch: available.batches[0]?.batchNumber || 'DEFAULT-BATCH',
        hsnCode: std.hsn,
        gstRate: std.rate,
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
      const std = STANDARD_HSN_CODES[found.name] || { hsn: '3102', rate: 18.0 };
      setSelectedItems((prev) =>
        prev.map((item, i) =>
          i === index
            ? {
                ...item,
                itemId: found.id,
                name: found.name,
                price: found.unitPrice,
                batch: found.batches[0]?.batchNumber || 'DEFAULT-BATCH',
                hsnCode: std.hsn,
                gstRate: std.rate,
              }
            : item
        )
      );
    }
  };

  const handleSubmitSale = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedItems.length === 0 || !customerName.trim()) return;

    // GST Compliance Check: B2C or B2B > ₹50,000 mandates valid details
    if (grandTotal > 50000 && (!customerName || customerName.toLowerCase() === 'walk-in farmer')) {
      alert('GST Compliance Notice: Outward supplies exceeding ₹50,000 require customer name and contact details.');
      return;
    }

    const nextInvoiceNum = `INV/00${Math.floor(100 + Math.random() * 900)}/2025-26`;

    const newSalePayload: SaleRecord = {
      id: crypto.randomUUID(),
      invoice_no: nextInvoiceNum,
      invoice_number: nextInvoiceNum,
      customer_name: customerName,
      customer_phone: customerPhone,
      customer_gstin: customerGstin || undefined,
      customer_state_code: customerStateCode,
      branch_state_code: '27',
      is_interstate: isInterstate,
      is_khata: isKhata,
      items: selectedItems.map((it) => ({
        itemId: it.itemId,
        name: it.name,
        qty: it.qty,
        price: it.price,
        batch: it.batch,
        hsn_code: it.hsnCode,
      })),
      total: grandTotal,
      total_taxable_amount: liveGstSummary.total_taxable_amount,
      total_cgst: liveGstSummary.total_cgst,
      total_sgst: liveGstSummary.total_sgst,
      total_igst: liveGstSummary.total_igst,
      total_tax: liveGstSummary.total_tax,
      round_off: liveGstSummary.round_off,
      grand_total: grandTotal,
      cashPaid,
      khataAmount,
      date: new Date().toISOString().split('T')[0],
      timestamp: new Date().toISOString(),
      payment_mode: isKhata ? 'khata' : 'cash',
      branch_id: 'nashik-central',
    } as any;

    addNewSale(newSalePayload);
    setCompletedSaleRecord(newSalePayload);
    setCompletedInvoiceData(liveGstSummary);

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
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-[#E2EAE5] overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-[#F9FBF9] border-b border-[#E5ECE7] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[#079455] text-white flex items-center justify-center shadow-2xs">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#1A1A1A]">GST Counter Billing & Tax Invoice</h3>
              <p className="text-xs text-[#6E7B74]">
                Automated CGST/SGST/IGST calculation, HSN mapping & FEFO stock sync
              </p>
            </div>
          </div>

          <button
            onClick={() => setActiveModal('none')}
            className="p-2 rounded-xl text-[#788880] hover:text-[#1A1A1A] hover:bg-[#EFF5F1] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isSaleCompleted ? (
          <div className="p-6 sm:p-8 flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-full bg-[#E0EAE4] text-[#079455] flex items-center justify-center mb-3">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-[#1A1A1A]">GST Tax Invoice Generated!</h3>
            <p className="text-xs text-[#6E7B74] mt-1">
              Invoice <strong>#{completedSaleRecord?.invoice_no}</strong> registered and synchronized with live database.
            </p>

            <div className="w-full max-w-md my-5 p-4 bg-[#F9FBF9] rounded-2xl border border-[#E5ECE7] text-left text-xs space-y-1.5">
              <div className="flex justify-between py-1 border-b border-[#EAEFEA]">
                <span className="text-[#6E7B74]">Customer:</span>
                <strong className="text-[#1A1A1A]">{customerName}</strong>
              </div>
              <div className="flex justify-between py-1 border-b border-[#EAEFEA]">
                <span className="text-[#6E7B74]">Taxable Amount:</span>
                <strong className="text-[#1A1A1A]">₹{liveGstSummary.total_taxable_amount.toFixed(2)}</strong>
              </div>
              <div className="flex justify-between py-1 border-b border-[#EAEFEA]">
                <span className="text-[#6E7B74]">Total GST Tax:</span>
                <strong className="text-[#079455]">₹{liveGstSummary.total_tax.toFixed(2)}</strong>
              </div>
              <div className="flex justify-between py-1 border-b border-[#EAEFEA]">
                <span className="text-[#6E7B74]">Grand Total:</span>
                <strong className="text-[#079455] font-extrabold text-sm">₹{grandTotal.toLocaleString('en-IN')}.00</strong>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-[#6E7B74]">Payment Mode:</span>
                <strong className="text-[#1A1A1A] capitalize">{isKhata ? 'Khata Credit' : 'Cash / UPI'}</strong>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={() => setShowInvoiceModal(true)}
                className="px-4 py-2 bg-[#079455] hover:bg-[#067A46] text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-xs cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>View & Print Tax Invoice</span>
              </button>
              <button
                onClick={() => {
                  setIsSaleCompleted(false);
                  setSelectedItems(inventory.length > 0 ? [{ itemId: inventory[0].id, name: inventory[0].name, qty: 1, price: inventory[0].unitPrice, batch: inventory[0].batches[0]?.batchNumber || 'LOT-1', hsnCode: '3102', gstRate: 18.0 }] : []);
                }}
                className="px-4 py-2 bg-[#EFF5F1] hover:bg-[#E0EAE4] text-[#079455] text-xs font-bold rounded-xl cursor-pointer"
              >
                + Bill Next Customer
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmitSale} className="p-4 sm:p-5 overflow-y-auto flex flex-col gap-4 text-xs">
            {/* Customer Details Block */}
            <div className="p-3 bg-[#F9FBFA] rounded-2xl border border-[#E5ECE7] space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#1A1A1A] mb-1">Customer / Farmer Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter customer name..."
                    value={customerName}
                    onChange={(e) => handleSelectCustomer(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#DCE4DF] rounded-xl font-semibold text-xs focus:ring-2 focus:ring-[#079455]/30 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#1A1A1A] mb-1">Customer Mobile</label>
                  <input
                    type="text"
                    placeholder="+91 98XXX XXXXX"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#DCE4DF] rounded-xl text-xs focus:ring-2 focus:ring-[#079455]/30 focus:outline-none"
                  />
                </div>
              </div>

              {/* B2B GSTIN and State Selector */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#E5ECE7]">
                <div>
                  <label className="block font-bold text-[#1A1A1A] mb-1">Customer GSTIN (B2B Only)</label>
                  <input
                    type="text"
                    placeholder="e.g. 27AAAAA0000A1Z5 (optional)"
                    value={customerGstin}
                    onChange={(e) => setCustomerGstin(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 bg-white border border-[#DCE4DF] rounded-xl text-xs font-mono focus:ring-2 focus:ring-[#079455]/30 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#1A1A1A] mb-1">Place of Supply (State)</label>
                  <select
                    value={customerStateCode}
                    onChange={(e) => setCustomerStateCode(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#DCE4DF] rounded-xl text-xs font-bold focus:ring-2 focus:ring-[#079455]/30 focus:outline-none cursor-pointer"
                  >
                    <option value="27">27 - Maharashtra (Intra-state CGST+SGST)</option>
                    <option value="24">24 - Gujarat (Inter-state IGST)</option>
                    <option value="23">23 - Madhya Pradesh (Inter-state IGST)</option>
                    <option value="29">29 - Karnataka (Inter-state IGST)</option>
                    <option value="36">36 - Telangana (Inter-state IGST)</option>
                    <option value="09">09 - Uttar Pradesh (Inter-state IGST)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Selected Items Line Items */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-bold text-[#1A1A1A]">Invoice Line Items (with HSN & Tax)</h4>
                <button
                  type="button"
                  onClick={handleAddItem}
                  disabled={inventory.length === 0}
                  className="text-xs font-bold text-[#079455] hover:underline flex items-center gap-1 disabled:opacity-50 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Line Item</span>
                </button>
              </div>

              <div className="flex flex-col gap-2">
                {selectedItems.map((item, idx) => (
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
                          {inv.name} (HSN: {STANDARD_HSN_CODES[inv.name]?.hsn || '3102'} • ₹{inv.unitPrice})
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
                        className="p-1.5 rounded-xl text-[#788880] hover:text-[#D92D20] hover:bg-[#FEE4E2] cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
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
                  {isInterstate ? '18% IGST' : '9% CGST + 9% SGST'}
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

            {/* Live GST Tax Breakdown Box */}
            <div className="p-3 bg-[#F9FBFA] rounded-2xl border border-[#E5ECE7] space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-[#6E7B74]">Taxable Value:</span>
                <span className="font-mono font-bold">₹{liveGstSummary.total_taxable_amount.toFixed(2)}</span>
              </div>
              {!isInterstate ? (
                <>
                  <div className="flex justify-between text-[#079455]">
                    <span>Central GST (CGST @ 9%):</span>
                    <span className="font-mono font-bold">₹{liveGstSummary.total_cgst.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-[#079455]">
                    <span>State GST (SGST @ 9%):</span>
                    <span className="font-mono font-bold">₹{liveGstSummary.total_sgst.toFixed(2)}</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between text-[#175CD3]">
                  <span>Integrated GST (IGST @ 18%):</span>
                  <span className="font-mono font-bold">₹{liveGstSummary.total_igst.toFixed(2)}</span>
                </div>
              )}
            </div>

            {/* Footer Calculation & Submit */}
            <div className="pt-3 border-t border-[#E5ECE7] flex items-center justify-between">
              <div>
                <span className="text-[11px] text-[#7A8B82]">Grand Total (incl. GST):</span>
                <div className="text-base sm:text-lg font-black text-[#079455]">
                  ₹{grandTotal.toLocaleString('en-IN')}.00
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveModal('none')}
                  className="px-3.5 py-2 bg-[#EFF5F1] text-[#6E7E75] hover:bg-[#E0EAE4] rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={selectedItems.length === 0}
                  className="px-4 sm:px-5 py-2 bg-[#079455] hover:bg-[#067A46] text-white rounded-xl font-bold shadow-2xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  <Receipt className="w-4 h-4" />
                  <span>Generate GST Invoice</span>
                </button>
              </div>
            </div>
          </form>
        )}
      </div>

      {/* Direct Modal View of Generated Tax Invoice */}
      {showInvoiceModal && completedSaleRecord && (
        <GSTInvoiceModal
          isOpen={showInvoiceModal}
          onClose={() => {
            setShowInvoiceModal(false);
            setActiveModal('none');
          }}
          sale={completedSaleRecord}
          invoiceData={completedInvoiceData}
        />
      )}
    </div>
  );
};
