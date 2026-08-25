import React, { useRef } from 'react';
import {
  FileText,
  Printer,
  Download,
  X,
  Building2,
  CheckCircle2,
  Receipt,
  ShieldCheck,
} from 'lucide-react';
import { SaleRecord } from '../../types';

interface GSTInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: SaleRecord | null;
  invoiceData?: any;
}

export const GSTInvoiceModal: React.FC<GSTInvoiceModalProps> = ({
  isOpen,
  onClose,
  sale,
  invoiceData,
}) => {
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !sale) return null;

  const invoice = invoiceData || {
    seller: {
      legal_name: 'MridaOS Agro Retail Pvt Ltd',
      gstin: '27AABCU9603R1ZX',
      address: 'Shop 14-16, APMC Market Yard, Dindori Road, Nashik, Maharashtra - 422003',
      state: 'Maharashtra',
      state_code: '27',
    },
    buyer: {
      name: sale.customer_name || 'Walk-in Customer',
      phone: sale.customer_phone || '-',
      gstin: (sale as any).customer_gstin || 'Unregistered',
      state_code: (sale as any).customer_state_code || '27',
    },
    invoice_number: sale.invoice_no || `INV/00${sale.id.slice(0, 4)}/2025-26`,
    invoice_date: sale.date || new Date().toISOString().split('T')[0],
    is_interstate: (sale as any).is_interstate ?? false,
    line_items: (sale.items || []).map((item, idx) => {
      const taxable = item.qty * item.price;
      const rate = 18.0;
      const isInter = (sale as any).is_interstate ?? false;
      return {
        name: item.name,
        hsn_code: (item as any).hsn_code || '3102',
        qty: item.qty,
        price: item.price,
        taxable_amount: taxable,
        cgst_rate: isInter ? 0 : rate / 2,
        cgst_amount: isInter ? 0 : Math.round(taxable * (rate / 200) * 100) / 100,
        sgst_rate: isInter ? 0 : rate / 2,
        sgst_amount: isInter ? 0 : Math.round(taxable * (rate / 200) * 100) / 100,
        igst_rate: isInter ? rate : 0,
        igst_amount: isInter ? Math.round(taxable * (rate / 100) * 100) / 100 : 0,
        total_amount: Math.round(taxable * 1.18 * 100) / 100,
      };
    }),
    total_taxable_amount: (sale as any).total_taxable_amount || Math.round(sale.total * 0.847 * 100) / 100,
    total_cgst: (sale as any).total_cgst || Math.round(sale.total * 0.076 * 100) / 100,
    total_sgst: (sale as any).total_sgst || Math.round(sale.total * 0.076 * 100) / 100,
    total_igst: (sale as any).total_igst || 0,
    total_tax: (sale as any).total_tax || Math.round(sale.total * 0.153 * 100) / 100,
    round_off: (sale as any).round_off || 0,
    grand_total: sale.total,
    amount_in_words: (sale as any).amount_in_words || 'Tax Invoice Total Rupees Only',
    payment_mode: sale.payment_mode || 'cash',
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white">
      <div className="bg-white rounded-3xl max-w-4xl w-full border border-[#D5E5DB] shadow-2xl overflow-hidden flex flex-col max-h-[92vh] print:max-h-none print:shadow-none print:border-none print:rounded-none">
        {/* Header Bar */}
        <div className="bg-[#F0F5F2] px-6 py-4 border-b border-[#D5E5DB] flex items-center justify-between print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#079455] text-white flex items-center justify-center shadow-2xs">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#1A1A1A]">GST Tax Invoice Preview</h2>
              <p className="text-xs text-[#55635C]">
                Official Indian GST Compliant Invoice • {invoice.invoice_number}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-[#079455] hover:bg-[#067A46] text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Download PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-[#6E7B74] hover:text-[#1A1A1A] hover:bg-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Tax Invoice Content */}
        <div
          ref={printRef}
          className="p-6 md:p-8 overflow-y-auto space-y-6 text-[#1A1A1A] print:p-0 print:overflow-visible print:space-y-4"
        >
          {/* Invoice Header Block */}
          <div className="border border-[#CCD8D1] rounded-2xl p-5 bg-[#FBFCFB] flex flex-col md:flex-row justify-between gap-4">
            <div className="space-y-1.5">
              <span className="inline-block px-2.5 py-0.5 rounded-md bg-[#079455] text-white text-[10px] font-black uppercase tracking-wider">
                TAX INVOICE
              </span>
              <h1 className="text-xl font-black text-[#1A1A1A] tracking-tight">
                {invoice.seller.legal_name}
              </h1>
              <p className="text-xs text-[#55635C] leading-relaxed max-w-md">
                {invoice.seller.address}
              </p>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs pt-1">
                <span className="font-semibold text-[#1A1A1A]">
                  GSTIN: <span className="font-mono text-[#079455]">{invoice.seller.gstin}</span>
                </span>
                <span className="text-[#55635C]">
                  State Code: <strong className="text-[#1A1A1A]">{invoice.seller.state_code}</strong> ({invoice.seller.state})
                </span>
              </div>
            </div>

            <div className="space-y-1 md:text-right border-t md:border-t-0 pt-3 md:pt-0 border-[#CCD8D1]">
              <div className="text-xs text-[#55635C]">Invoice Number:</div>
              <div className="text-lg font-black text-[#079455] font-mono tracking-tight">
                {invoice.invoice_number}
              </div>
              <div className="text-xs text-[#55635C] pt-1">Invoice Date:</div>
              <div className="text-sm font-bold text-[#1A1A1A]">{invoice.invoice_date}</div>
              <div className="text-xs text-[#55635C] pt-1">Supply Type:</div>
              <span
                className={`inline-block text-[11px] font-bold px-2 py-0.5 rounded-full ${
                  invoice.is_interstate
                    ? 'bg-[#EFF8FF] text-[#175CD3] border border-[#B2DDFF]'
                    : 'bg-[#ECFDF3] text-[#027A48] border border-[#A6F4C5]'
                }`}
              >
                {invoice.is_interstate ? 'Inter-State (IGST)' : 'Intra-State (CGST + SGST)'}
              </span>
            </div>
          </div>

          {/* Buyer Details Block */}
          <div className="border border-[#CCD8D1] rounded-2xl p-4 bg-white grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#7A8B82] mb-1">
                Bill To (Customer Details):
              </div>
              <div className="text-sm font-bold text-[#1A1A1A]">{invoice.buyer.name}</div>
              <div className="text-xs text-[#55635C] mt-0.5">Phone: {invoice.buyer.phone}</div>
              <div className="text-xs text-[#55635C] mt-0.5">
                GSTIN:{' '}
                <span className="font-mono font-bold text-[#1A1A1A]">{invoice.buyer.gstin}</span>
              </div>
            </div>

            <div className="md:text-right">
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#7A8B82] mb-1">
                Place of Supply:
              </div>
              <div className="text-xs text-[#1A1A1A] font-semibold">
                State Code: {invoice.buyer.state_code}
              </div>
              <div className="text-xs text-[#55635C] mt-0.5">
                Payment Mode: <strong className="capitalize text-[#1A1A1A]">{invoice.payment_mode}</strong>
              </div>
              <div className="text-xs text-[#55635C] mt-0.5">
                Dispatch Date: {invoice.invoice_date}
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="border border-[#CCD8D1] rounded-2xl overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#F4EDDE] text-[#1A1A1A] font-bold border-b border-[#CCD8D1]">
                  <th className="py-2.5 px-3">#</th>
                  <th className="py-2.5 px-3">Item Description</th>
                  <th className="py-2.5 px-3 text-center">HSN</th>
                  <th className="py-2.5 px-3 text-right">Qty</th>
                  <th className="py-2.5 px-3 text-right">Rate (₹)</th>
                  <th className="py-2.5 px-3 text-right">Taxable (₹)</th>
                  {!invoice.is_interstate ? (
                    <>
                      <th className="py-2.5 px-2 text-right">CGST</th>
                      <th className="py-2.5 px-2 text-right">SGST</th>
                    </>
                  ) : (
                    <th className="py-2.5 px-3 text-right">IGST</th>
                  )}
                  <th className="py-2.5 px-3 text-right">Total (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E0EAE4]">
                {invoice.line_items.map((li: any, index: number) => (
                  <tr key={index} className="hover:bg-[#F9FBFA]">
                    <td className="py-2.5 px-3 font-mono text-[#7A8B82]">{index + 1}</td>
                    <td className="py-2.5 px-3 font-bold text-[#1A1A1A]">{li.name}</td>
                    <td className="py-2.5 px-3 text-center font-mono text-[#55635C]">{li.hsn_code}</td>
                    <td className="py-2.5 px-3 text-right font-medium">{li.qty}</td>
                    <td className="py-2.5 px-3 text-right font-mono">₹{li.price.toFixed(2)}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-medium">₹{li.taxable_amount.toFixed(2)}</td>
                    {!invoice.is_interstate ? (
                      <>
                        <td className="py-2.5 px-2 text-right font-mono text-[11px]">
                          ₹{li.cgst_amount.toFixed(2)} <span className="text-[9px] text-[#7A8B82]">({li.cgst_rate}%)</span>
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono text-[11px]">
                          ₹{li.sgst_amount.toFixed(2)} <span className="text-[9px] text-[#7A8B82]">({li.sgst_rate}%)</span>
                        </td>
                      </>
                    ) : (
                      <td className="py-2.5 px-3 text-right font-mono text-[11px]">
                        ₹{li.igst_amount.toFixed(2)} <span className="text-[9px] text-[#7A8B82]">({li.igst_rate}%)</span>
                      </td>
                    )}
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-[#1A1A1A]">
                      ₹{li.total_amount.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Tax Summary & Totals Block */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            <div className="space-y-3">
              <div className="border border-[#CCD8D1] rounded-2xl p-4 bg-[#FBFCFB]">
                <div className="text-[11px] font-bold text-[#7A8B82] uppercase tracking-wider mb-1">
                  Amount in Words:
                </div>
                <div className="text-xs font-bold text-[#1A1A1A] italic">
                  {invoice.amount_in_words}
                </div>
              </div>

              <div className="text-[11px] text-[#7A8B82] space-y-1">
                <div>• Terms & Conditions: Goods once sold will not be returned after 48 hours.</div>
                <div>• Declaration: We declare that this invoice shows the actual price of the goods.</div>
                <div>• This is a computer-generated tax invoice verified under Indian GST laws.</div>
              </div>
            </div>

            <div className="border border-[#CCD8D1] rounded-2xl p-4 bg-white space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-[#E0EAE4]">
                <span className="text-[#55635C]">Total Taxable Amount:</span>
                <span className="font-mono font-bold text-[#1A1A1A]">
                  ₹{invoice.total_taxable_amount.toFixed(2)}
                </span>
              </div>

              {!invoice.is_interstate ? (
                <>
                  <div className="flex justify-between py-1 border-b border-[#E0EAE4]">
                    <span className="text-[#55635C]">Central GST (CGST):</span>
                    <span className="font-mono font-bold text-[#1A1A1A]">
                      ₹{invoice.total_cgst.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#E0EAE4]">
                    <span className="text-[#55635C]">State GST (SGST):</span>
                    <span className="font-mono font-bold text-[#1A1A1A]">
                      ₹{invoice.total_sgst.toFixed(2)}
                    </span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between py-1 border-b border-[#E0EAE4]">
                  <span className="text-[#55635C]">Integrated GST (IGST):</span>
                  <span className="font-mono font-bold text-[#1A1A1A]">
                    ₹{invoice.total_igst.toFixed(2)}
                  </span>
                </div>
              )}

              <div className="flex justify-between py-1 border-b border-[#E0EAE4]">
                <span className="text-[#55635C]">Total Tax Amount:</span>
                <span className="font-mono font-bold text-[#1A1A1A]">
                  ₹{invoice.total_tax.toFixed(2)}
                </span>
              </div>

              {invoice.round_off !== 0 && (
                <div className="flex justify-between py-1 border-b border-[#E0EAE4]">
                  <span className="text-[#55635C]">Round Off:</span>
                  <span className="font-mono font-bold text-[#1A1A1A]">
                    ₹{invoice.round_off.toFixed(2)}
                  </span>
                </div>
              )}

              <div className="flex justify-between pt-2 text-sm font-black text-[#079455]">
                <span>GRAND TOTAL:</span>
                <span className="font-mono text-base">₹{invoice.grand_total.toLocaleString('en-IN')}.00</span>
              </div>
            </div>
          </div>

          {/* Signatory Footer */}
          <div className="pt-4 flex justify-between items-end border-t border-[#CCD8D1] text-xs">
            <div className="text-[11px] text-[#7A8B82]">
              Powered by <strong>MridaOS</strong> • Agri Retail Operating System
            </div>
            <div className="text-center space-y-8">
              <div className="text-xs font-bold text-[#1A1A1A]">
                For {invoice.seller.legal_name}
              </div>
              <div className="border-t border-dashed border-[#CCD8D1] pt-1 text-[11px] font-semibold text-[#55635C]">
                Authorized Signatory
              </div>
            </div>
          </div>
        </div>

        {/* Modal Bottom Close Bar */}
        <div className="bg-[#F0F5F2] px-6 py-3.5 border-t border-[#D5E5DB] flex justify-end print:hidden">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-white border border-[#D5E5DB] text-xs font-bold text-[#1A1A1A] hover:bg-[#E0EAE4] transition-colors cursor-pointer"
          >
            Close Invoice
          </button>
        </div>
      </div>
    </div>
  );
};
