-- ==============================================================================
-- MRIDAOS: GST TAX MASTER DATA, INVOICE SERIES & TAX ENGINE
-- Compliance with Central Goods and Services Tax (CGST), SGST & IGST Acts
-- ==============================================================================

-- 1. Update items table with HSN codes and GST rates
ALTER TABLE IF EXISTS inventory 
  ADD COLUMN IF NOT EXISTS hsn_code TEXT DEFAULT '3102',
  ADD COLUMN IF NOT EXISTS gst_rate NUMERIC DEFAULT 18.0,
  ADD COLUMN IF NOT EXISTS is_gst_exempt BOOLEAN DEFAULT false;

-- 2. Update branches table with GSTIN and State Code
ALTER TABLE IF EXISTS branches 
  ADD COLUMN IF NOT EXISTS gstin TEXT DEFAULT '27AABCU9603R1ZX',
  ADD COLUMN IF NOT EXISTS legal_name TEXT DEFAULT 'MridaOS Agro Retail Pvt Ltd',
  ADD COLUMN IF NOT EXISTS address_line1 TEXT DEFAULT 'Shop 14-16, APMC Market Yard',
  ADD COLUMN IF NOT EXISTS address_line2 TEXT DEFAULT 'Dindori Road',
  ADD COLUMN IF NOT EXISTS city TEXT DEFAULT 'Nashik',
  ADD COLUMN IF NOT EXISTS state TEXT DEFAULT 'Maharashtra',
  ADD COLUMN IF NOT EXISTS state_code TEXT DEFAULT '27',
  ADD COLUMN IF NOT EXISTS pincode TEXT DEFAULT '422003';

-- 3. Update customers (khata_ledger) with GSTIN and Customer Type
ALTER TABLE IF EXISTS khata_ledger 
  ADD COLUMN IF NOT EXISTS gstin TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS customer_type TEXT DEFAULT 'retail' CHECK (customer_type IN ('retail', 'b2b_registered', 'b2b_unregistered')),
  ADD COLUMN IF NOT EXISTS state_code TEXT DEFAULT '27',
  ADD COLUMN IF NOT EXISTS billing_address JSONB DEFAULT '{"line1":"Main Road","city":"Nashik","state":"Maharashtra","state_code":"27","pincode":"422003"}';

-- 4. Sequential GST Invoice Series Table (Enforces sequential numbering without gaps per branch per FY)
CREATE TABLE IF NOT EXISTS gst_invoice_series (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id TEXT NOT NULL DEFAULT 'nashik-central',
  financial_year TEXT NOT NULL DEFAULT '2025-26',
  prefix TEXT NOT NULL DEFAULT 'INV',
  current_number INTEGER NOT NULL DEFAULT 100,
  last_generated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(branch_id, financial_year, prefix)
);

-- Seed initial sequence for Nashik Central
INSERT INTO gst_invoice_series (branch_id, financial_year, prefix, current_number)
VALUES ('nashik-central', '2025-26', 'INV', 100)
ON CONFLICT (branch_id, financial_year, prefix) DO NOTHING;

-- 5. Sales Line Items with granular tax breakdown
CREATE TABLE IF NOT EXISTS sales_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID REFERENCES sales(id) ON DELETE CASCADE,
  item_id UUID REFERENCES inventory(id) ON DELETE SET NULL,
  item_name TEXT NOT NULL,
  batch_id TEXT,
  quantity NUMERIC NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC NOT NULL CHECK (unit_price >= 0),
  hsn_code TEXT NOT NULL DEFAULT '3102',
  gst_rate NUMERIC NOT NULL DEFAULT 18.0,
  is_gst_exempt BOOLEAN NOT NULL DEFAULT false,
  taxable_amount NUMERIC NOT NULL,
  cgst_rate NUMERIC NOT NULL DEFAULT 0,
  cgst_amount NUMERIC NOT NULL DEFAULT 0,
  sgst_rate NUMERIC NOT NULL DEFAULT 0,
  sgst_amount NUMERIC NOT NULL DEFAULT 0,
  igst_rate NUMERIC NOT NULL DEFAULT 0,
  igst_amount NUMERIC NOT NULL DEFAULT 0,
  total_tax NUMERIC NOT NULL DEFAULT 0,
  total_amount NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Add GST Summary totals to sales table
ALTER TABLE IF EXISTS sales
  ADD COLUMN IF NOT EXISTS invoice_number TEXT,
  ADD COLUMN IF NOT EXISTS customer_gstin TEXT,
  ADD COLUMN IF NOT EXISTS customer_state_code TEXT DEFAULT '27',
  ADD COLUMN IF NOT EXISTS branch_state_code TEXT DEFAULT '27',
  ADD COLUMN IF NOT EXISTS is_interstate BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS total_taxable_amount NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_cgst NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_sgst NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_igst NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_tax NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS round_off NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS grand_total NUMERIC DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_sales_invoice_number ON sales(invoice_number);
CREATE INDEX IF NOT EXISTS idx_sales_line_items_sale_id ON sales_line_items(sale_id);

-- 7. PostgreSQL Function: calculate_gst_breakdown
CREATE OR REPLACE FUNCTION calculate_gst_breakdown(
  p_item_id UUID,
  p_quantity NUMERIC,
  p_unit_price NUMERIC,
  p_customer_state_code TEXT DEFAULT '27',
  p_branch_state_code TEXT DEFAULT '27'
) RETURNS TABLE (
  taxable_amount NUMERIC,
  cgst_rate NUMERIC,
  cgst_amount NUMERIC,
  sgst_rate NUMERIC,
  sgst_amount NUMERIC,
  igst_rate NUMERIC,
  igst_amount NUMERIC,
  total_tax NUMERIC,
  total_amount NUMERIC
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_gst_rate NUMERIC := 18.0;
  v_is_exempt BOOLEAN := false;
  v_taxable NUMERIC;
  v_cgst_r NUMERIC := 0;
  v_sgst_r NUMERIC := 0;
  v_igst_r NUMERIC := 0;
  v_cgst_a NUMERIC := 0;
  v_sgst_a NUMERIC := 0;
  v_igst_a NUMERIC := 0;
  v_total_t NUMERIC := 0;
  v_total_a NUMERIC := 0;
BEGIN
  -- 1. Fetch item GST details if item_id provided
  IF p_item_id IS NOT NULL THEN
    SELECT COALESCE(i.gst_rate, 18.0), COALESCE(i.is_gst_exempt, false)
    INTO v_gst_rate, v_is_exempt
    FROM inventory i
    WHERE i.id = p_item_id;
  END IF;

  -- 2. Calculate taxable amount
  v_taxable := ROUND(p_quantity * p_unit_price, 2);

  -- 3. Calculate tax based on exemption and state code
  IF v_is_exempt THEN
    v_cgst_r := 0; v_sgst_r := 0; v_igst_r := 0;
    v_cgst_a := 0; v_sgst_a := 0; v_igst_a := 0;
  ELSIF COALESCE(p_customer_state_code, '27') = COALESCE(p_branch_state_code, '27') THEN
    -- Intra-state sale (CGST + SGST)
    v_cgst_r := ROUND(v_gst_rate / 2.0, 2);
    v_sgst_r := ROUND(v_gst_rate / 2.0, 2);
    v_igst_r := 0.0;
    v_cgst_a := ROUND(v_taxable * (v_cgst_r / 100.0), 2);
    v_sgst_a := ROUND(v_taxable * (v_sgst_r / 100.0), 2);
    v_igst_a := 0.0;
  ELSE
    -- Inter-state sale (IGST)
    v_cgst_r := 0.0;
    v_sgst_r := 0.0;
    v_igst_r := v_gst_rate;
    v_cgst_a := 0.0;
    v_sgst_a := 0.0;
    v_igst_a := ROUND(v_taxable * (v_igst_r / 100.0), 2);
  END IF;

  v_total_t := v_cgst_a + v_sgst_a + v_igst_a;
  v_total_a := v_taxable + v_total_t;

  RETURN QUERY SELECT 
    v_taxable,
    v_cgst_r,
    v_cgst_a,
    v_sgst_r,
    v_sgst_a,
    v_igst_r,
    v_igst_a,
    v_total_t,
    v_total_a;
END;
$$;
