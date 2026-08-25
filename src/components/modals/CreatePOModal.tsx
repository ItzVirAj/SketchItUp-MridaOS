import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  X,
  Truck,
  Plus,
  Trash2,
  CheckCircle2,
  FileCheck,
  Building2,
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const CreatePOModal: React.FC = () => {
  const { inventory, createPurchaseOrder, setActiveModal } = useApp();

  const [supplierName, setSupplierName] = useState('IFFCO State Distributor');
  const [paymentTerms, setPaymentTerms] = useState('Credit 30 Days');
  const [lineItems, setLineItems] = useState([
    { name: 'IFFCO Neem Coated Urea (45kg)', qty: 150, cost: 242 },
    { name: 'Coromandel Gromor 10:26:26 (50kg)', qty: 60, cost: 1350 },
  ]);

  const totalAmount = lineItems.reduce((sum, item) => sum + item.qty * item.cost, 0);

  const handleAddLine = () => {
    const defaultItem = inventory[0];
    setLineItems((prev) => [
      ...prev,
      {
        name: defaultItem ? defaultItem.name : 'Agri-Input Product',
        qty: 50,
        cost: defaultItem ? defaultItem.costPrice : 350,
      },
    ]);
  };

  const handleRemoveLine = (idx: number) => {
    setLineItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (lineItems.length === 0) return;

    createPurchaseOrder({
      supplierName,
      itemsCount: lineItems.length,
      totalAmount,
      paymentTerms,
    });

    confetti({
      particleCount: 40,
      spread: 50,
      origin: { y: 0.6 },
    });

    setActiveModal('none');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-[#E2EAE5] overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 sm:p-5 bg-[#F9FBF9] border-b border-[#E5ECE7] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[#1A1A1A] text-white flex items-center justify-center shadow-2xs">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#1A1A1A]">Create Purchase Order</h3>
              <p className="text-xs text-[#6E7B74]">Issue official supplier PO under active rate contracts</p>
            </div>
          </div>

          <button
            onClick={() => setActiveModal('none')}
            className="p-2 rounded-xl text-[#788880] hover:text-[#1A1A1A] hover:bg-[#EFF5F1] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-5 overflow-y-auto flex-1 flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#1A1A1A] mb-1">Select Supplier Partner</label>
              <select
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#DCE6DF] bg-white text-xs font-semibold"
              >
                <option value="IFFCO State Distributor">IFFCO State Distributor</option>
                <option value="Coromandel International Ltd">Coromandel International Ltd</option>
                <option value="Bayer CropScience India">Bayer CropScience India</option>
                <option value="Syngenta India">Syngenta India</option>
                <option value="Sahyadri Foliage Farm">Sahyadri Foliage Farm</option>
                <option value="Kisan Organic Bio-Hub">Kisan Organic Bio-Hub</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1A1A1A] mb-1">Payment & Delivery Terms</label>
              <select
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#DCE6DF] bg-white text-xs font-semibold"
              >
                <option value="Credit 30 Days">Credit 30 Days (Standard)</option>
                <option value="Credit 45 Days">Credit 45 Days</option>
                <option value="50% Advance, 50% on Delivery">50% Advance, 50% on Delivery</option>
                <option value="Immediate UPI/Cash on Delivery">Immediate UPI/Cash on Delivery</option>
              </select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-[#1A1A1A]">Procurement Order Items</label>
              <button
                type="button"
                onClick={handleAddLine}
                className="text-xs font-bold text-[#079455] hover:underline flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Item</span>
              </button>
            </div>

            <div className="flex flex-col gap-2">
              {lineItems.map((item, idx) => (
                <div key={idx} className="p-3 bg-[#F9FBF9] rounded-2xl border border-[#E5ECE7] flex items-center justify-between gap-2 text-xs">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => {
                        const val = e.target.value;
                        setLineItems((prev) => prev.map((l, i) => (i === idx ? { ...l, name: val } : l)));
                      }}
                      className="w-full px-2 py-1 rounded-lg border border-[#DCE6DF] bg-white font-bold"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <span className="text-[11px] text-[#7A8B82]">Qty:</span>
                      <input
                        type="number"
                        min="1"
                        value={item.qty}
                        onChange={(e) => {
                          const q = parseInt(e.target.value) || 1;
                          setLineItems((prev) => prev.map((l, i) => (i === idx ? { ...l, qty: q } : l)));
                        }}
                        className="w-14 px-2 py-1 rounded-lg border border-[#DCE6DF] bg-white text-center font-bold"
                      />
                    </div>

                    <div className="flex items-center gap-1">
                      <span className="text-[11px] text-[#7A8B82]">Rate:</span>
                      <input
                        type="number"
                        value={item.cost}
                        onChange={(e) => {
                          const c = parseFloat(e.target.value) || 0;
                          setLineItems((prev) => prev.map((l, i) => (i === idx ? { ...l, cost: c } : l)));
                        }}
                        className="w-16 px-2 py-1 rounded-lg border border-[#DCE6DF] bg-white text-right font-bold"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveLine(idx)}
                      className="p-1 rounded-lg text-[#98A2B3] hover:text-[#D92D20]"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-3 bg-[#EFF5F1] rounded-2xl border border-[#D5E5DB] flex items-center justify-between text-xs font-bold text-[#1A1A1A]">
            <span>Total Purchase Order Value:</span>
            <span className="text-sm font-extrabold text-[#079455]">₹{totalAmount.toLocaleString('en-IN')}</span>
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
              className="px-5 py-2 rounded-2xl bg-[#1A1A1A] hover:bg-black text-white text-xs font-bold shadow-sm transition-all"
            >
              Issue Purchase Order
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
