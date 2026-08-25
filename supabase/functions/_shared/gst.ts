/**
 * MridaOS Indian GST Tax Calculation & Invoicing Engine
 * Handles Intra-state (CGST + SGST) vs Inter-state (IGST), Exemptions, HSN Codes, and Amount-in-Words
 */

export interface GSTLineItemInput {
  item_id?: string;
  name: string;
  qty: number;
  price: number;
  batch?: string;
  hsn_code?: string;
  gst_rate?: number;
  is_gst_exempt?: boolean;
}

export interface GSTLineItemBreakdown {
  item_id?: string;
  name: string;
  batch?: string;
  qty: number;
  price: number;
  hsn_code: string;
  gst_rate: number;
  is_gst_exempt: boolean;
  taxable_amount: number;
  cgst_rate: number;
  cgst_amount: number;
  sgst_rate: number;
  sgst_amount: number;
  igst_rate: number;
  igst_amount: number;
  total_tax: number;
  total_amount: number;
}

export interface GSTInvoiceSummary {
  invoice_number: string;
  invoice_date: string;
  financial_year: string;
  customer_state_code: string;
  branch_state_code: string;
  is_interstate: boolean;
  line_items: GSTLineItemBreakdown[];
  total_taxable_amount: number;
  total_cgst: number;
  total_sgst: number;
  total_igst: number;
  total_tax: number;
  round_off: number;
  grand_total: number;
  amount_in_words: string;
}

/**
 * Standard HSN Codes mapping for Agriculture and Retail items
 */
export const STANDARD_HSN_CODES: Record<string, { hsn: string; rate: number; exempt: boolean }> = {
  // Fertilizers
  'Urea': { hsn: '3102', rate: 5.0, exempt: false },
  'DAP': { hsn: '3105', rate: 5.0, exempt: false },
  'MOP (Potash)': { hsn: '3104', rate: 5.0, exempt: false },
  'NPK 19:19:19': { hsn: '3105', rate: 5.0, exempt: false },
  'Zinc Sulfate': { hsn: '2833', rate: 12.0, exempt: false },
  'Organic Vermicompost': { hsn: '3101', rate: 0.0, exempt: true },
  'Neem Cake': { hsn: '3101', rate: 0.0, exempt: true },

  // Pesticides & Fungicides
  'Chlorpyrifos 20% EC': { hsn: '3808', rate: 18.0, exempt: false },
  'Mancozeb 75% WP': { hsn: '3808', rate: 18.0, exempt: false },
  'Glyphosate 41% SL': { hsn: '3808', rate: 18.0, exempt: false },

  // Seeds & Nursery Plants
  'Hybrid Tomato Seeds': { hsn: '1209', rate: 0.0, exempt: true },
  'Marigold Sapling Tray': { hsn: '0602', rate: 0.0, exempt: true },
  'Rose Plant (Grafted)': { hsn: '0602', rate: 5.0, exempt: false },
  'Areca Palm (Ceramic Pot)': { hsn: '0602', rate: 12.0, exempt: false },

  // Tools & Pots
  'Garden Pruner Secateur': { hsn: '8201', rate: 18.0, exempt: false },
  'Plastic Planter 10 Inch': { hsn: '3926', rate: 18.0, exempt: false },
};

/**
 * Calculate tax breakdown for an individual line item
 */
export function calculateGSTLineItem(
  item: GSTLineItemInput,
  customerStateCode: string = '27',
  branchStateCode: string = '27'
): GSTLineItemBreakdown {
  const isExempt = item.is_gst_exempt ?? false;
  const gstRate = isExempt ? 0 : (item.gst_rate !== undefined ? item.gst_rate : 18.0);
  const hsnCode = item.hsn_code || '3102';

  const taxableAmount = Math.round(item.qty * item.price * 100) / 100;
  const isInterstate = customerStateCode.trim() !== branchStateCode.trim();

  let cgstRate = 0;
  let sgstRate = 0;
  let igstRate = 0;
  let cgstAmount = 0;
  let sgstAmount = 0;
  let igstAmount = 0;

  if (!isExempt) {
    if (!isInterstate) {
      // Intra-state (Maharashtra to Maharashtra) -> CGST + SGST (50% each)
      cgstRate = Math.round((gstRate / 2) * 100) / 100;
      sgstRate = Math.round((gstRate / 2) * 100) / 100;
      cgstAmount = Math.round(taxableAmount * (cgstRate / 100) * 100) / 100;
      sgstAmount = Math.round(taxableAmount * (sgstRate / 100) * 100) / 100;
    } else {
      // Inter-state (e.g. Maharashtra to Gujarat) -> IGST (100%)
      igstRate = gstRate;
      igstAmount = Math.round(taxableAmount * (igstRate / 100) * 100) / 100;
    }
  }

  const totalTax = Math.round((cgstAmount + sgstAmount + igstAmount) * 100) / 100;
  const totalAmount = Math.round((taxableAmount + totalTax) * 100) / 100;

  return {
    item_id: item.item_id,
    name: item.name,
    batch: item.batch,
    qty: item.qty,
    price: item.price,
    hsn_code: hsnCode,
    gst_rate: gstRate,
    is_gst_exempt: isExempt,
    taxable_amount: taxableAmount,
    cgst_rate: cgstRate,
    cgst_amount: cgstAmount,
    sgst_rate: sgstRate,
    sgst_amount: sgstAmount,
    igst_rate: igstRate,
    igst_amount: igstAmount,
    total_tax: totalTax,
    total_amount: totalAmount,
  };
}

/**
 * Calculate complete GST invoice summary across all line items
 */
export function calculateGSTInvoiceSummary(
  items: GSTLineItemInput[],
  options: {
    invoiceNumber?: string;
    invoiceDate?: string;
    financialYear?: string;
    customerStateCode?: string;
    branchStateCode?: string;
  } = {}
): GSTInvoiceSummary {
  const customerStateCode = options.customerStateCode || '27';
  const branchStateCode = options.branchStateCode || '27';
  const isInterstate = customerStateCode.trim() !== branchStateCode.trim();
  const invoiceDate = options.invoiceDate || new Date().toISOString().split('T')[0];
  const financialYear = options.financialYear || '2025-26';
  const invoiceNumber = options.invoiceNumber || `INV/${Math.floor(100 + Math.random() * 900)}/${financialYear}`;

  const lineItems = items.map((item) =>
    calculateGSTLineItem(item, customerStateCode, branchStateCode)
  );

  let totalTaxable = 0;
  let totalCgst = 0;
  let totalSgst = 0;
  let totalIgst = 0;
  let rawGrandTotal = 0;

  lineItems.forEach((li) => {
    totalTaxable += li.taxable_amount;
    totalCgst += li.cgst_amount;
    totalSgst += li.sgst_amount;
    totalIgst += li.igst_amount;
    rawGrandTotal += li.total_amount;
  });

  totalTaxable = Math.round(totalTaxable * 100) / 100;
  totalCgst = Math.round(totalCgst * 100) / 100;
  totalSgst = Math.round(totalSgst * 100) / 100;
  totalIgst = Math.round(totalIgst * 100) / 100;
  const totalTax = Math.round((totalCgst + totalSgst + totalIgst) * 100) / 100;

  const roundedGrandTotal = Math.round(rawGrandTotal);
  const roundOff = Math.round((roundedGrandTotal - rawGrandTotal) * 100) / 100;
  const grandTotal = roundedGrandTotal;

  const amountInWords = numberToIndianRupeeWords(grandTotal);

  return {
    invoice_number: invoiceNumber,
    invoice_date: invoiceDate,
    financial_year: financialYear,
    customer_state_code: customerStateCode,
    branch_state_code: branchStateCode,
    is_interstate: isInterstate,
    line_items: lineItems,
    total_taxable_amount: totalTaxable,
    total_cgst: totalCgst,
    total_sgst: totalSgst,
    total_igst: totalIgst,
    total_tax: totalTax,
    round_off: roundOff,
    grand_total: grandTotal,
    amount_in_words: amountInWords,
  };
}

/**
 * Convert numeric amount into Indian Rupee Words
 * e.g., 11396 -> "Eleven Thousand Three Hundred Ninety-Six Rupees Only"
 */
export function numberToIndianRupeeWords(num: number): string {
  if (num === 0) return 'Zero Rupees Only';

  const a = [
    '',
    'One',
    'Two',
    'Three',
    'Four',
    'Five',
    'Six',
    'Seven',
    'Eight',
    'Nine',
    'Ten',
    'Eleven',
    'Twelve',
    'Thirteen',
    'Fourteen',
    'Fifteen',
    'Sixteen',
    'Seventeen',
    'Eighteen',
    'Nineteen',
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function inWords(n: number): string {
    if (n === 0) return '';
    if (n < 20) return a[n] + ' ';
    if (n < 100) return b[Math.floor(n / 10)] + ' ' + a[n % 10] + ' ';
    if (n < 1000) return a[Math.floor(n / 100)] + ' Hundred ' + inWords(n % 100);
    if (n < 100000) return inWords(Math.floor(n / 1000)) + 'Thousand ' + inWords(n % 1000);
    if (n < 10000000) return inWords(Math.floor(n / 100000)) + 'Lakh ' + inWords(n % 100000);
    return inWords(Math.floor(n / 10000000)) + 'Crore ' + inWords(n % 10000000);
  }

  const intPart = Math.floor(Math.abs(num));
  const words = inWords(intPart).trim().replace(/\s+/g, ' ');
  return `${words} Rupees Only`;
}
