-- ==============================================================================
-- MridaOS Database Schema for Supabase (Storage & Realtime Core - No Auth)
-- Run this complete script in your Supabase Project's SQL Editor
-- ==============================================================================

-- 1. Branches Table
CREATE TABLE IF NOT EXISTS public.branches (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    location TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('fertilizer', 'nursery', 'hybrid')),
    manager TEXT,
    license_number TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Inventory Table
CREATE TABLE IF NOT EXISTS public.inventory (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    sku TEXT UNIQUE NOT NULL,
    stock_qty NUMERIC DEFAULT 0 NOT NULL,
    unit TEXT NOT NULL,
    reorder_level NUMERIC DEFAULT 0 NOT NULL,
    suggested_reorder_qty NUMERIC DEFAULT 0,
    unit_price NUMERIC DEFAULT 0 NOT NULL,
    cost_price NUMERIC DEFAULT 0 NOT NULL,
    rack_location TEXT,
    velocity TEXT DEFAULT 'moderate',
    supplier_name TEXT,
    batches JSONB DEFAULT '[]'::jsonb NOT NULL,
    days_without_movement INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Sales & Invoices Table
CREATE TABLE IF NOT EXISTS public.sales (
    id TEXT PRIMARY KEY,
    invoice_no TEXT UNIQUE NOT NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT,
    is_khata BOOLEAN DEFAULT FALSE NOT NULL,
    items JSONB DEFAULT '[]'::jsonb NOT NULL,
    total NUMERIC DEFAULT 0 NOT NULL,
    cash_paid NUMERIC DEFAULT 0 NOT NULL,
    khata_amount NUMERIC DEFAULT 0 NOT NULL,
    date DATE DEFAULT CURRENT_DATE NOT NULL,
    timestamp TEXT,
    payment_mode TEXT DEFAULT 'cash' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Customer Khata Ledger Table
CREATE TABLE IF NOT EXISTS public.khata_ledger (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT,
    village TEXT,
    total_purchased NUMERIC DEFAULT 0 NOT NULL,
    outstanding_balance NUMERIC DEFAULT 0 NOT NULL,
    credit_limit NUMERIC DEFAULT 50000 NOT NULL,
    days_overdue INTEGER DEFAULT 0 NOT NULL,
    last_payment_date DATE,
    status TEXT DEFAULT 'healthy' CHECK (status IN ('healthy', 'due_soon', 'overdue', 'blocked')),
    ageing TEXT DEFAULT 'current' CHECK (ageing IN ('current', '1-30', '31-60', '61-90', '90+')),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Purchase Orders Table
CREATE TABLE IF NOT EXISTS public.purchase_orders (
    id TEXT PRIMARY KEY,
    po_number TEXT UNIQUE NOT NULL,
    supplier_name TEXT NOT NULL,
    items_count INTEGER DEFAULT 1 NOT NULL,
    total_amount NUMERIC DEFAULT 0 NOT NULL,
    order_date DATE DEFAULT CURRENT_DATE NOT NULL,
    expected_delivery TEXT,
    status TEXT DEFAULT 'pending_acknowledgement' CHECK (status IN ('draft', 'pending_acknowledgement', 'dispatched', 'grn_pending', 'received', 'cancelled')),
    payment_terms TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Plant Care Tasks Table
CREATE TABLE IF NOT EXISTS public.plant_care_tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('Watering', 'Fertilizing', 'Pest Inspection', 'Pruning', 'Repotting')),
    section TEXT NOT NULL,
    time_slot TEXT NOT NULL,
    plant_type TEXT NOT NULL,
    quantity TEXT,
    is_completed BOOLEAN DEFAULT FALSE NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Nursery & Greenhouse IoT Sensors Table
CREATE TABLE IF NOT EXISTS public.nursery_sensors (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    model TEXT,
    type TEXT NOT NULL CHECK (type IN ('moisture', 'temperature', 'humidity', 'ph', 'light')),
    value TEXT NOT NULL,
    unit TEXT NOT NULL,
    status TEXT DEFAULT 'optimal' CHECK (status IN ('optimal', 'warning', 'critical')),
    location TEXT NOT NULL,
    last_sync TEXT,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. Compliance Licenses Table
CREATE TABLE IF NOT EXISTS public.compliance_licenses (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    authority TEXT NOT NULL,
    license_number TEXT NOT NULL,
    issue_date DATE NOT NULL,
    expiry_date DATE NOT NULL,
    days_remaining INTEGER DEFAULT 0 NOT NULL,
    status TEXT DEFAULT 'valid' CHECK (status IN ('valid', 'renewal_due', 'expired')),
    required_documents JSONB DEFAULT '[]'::jsonb NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. Activity Logs Table
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id TEXT PRIMARY KEY,
    action TEXT NOT NULL,
    details TEXT NOT NULL,
    user_name TEXT NOT NULL,
    time TEXT NOT NULL,
    tag TEXT DEFAULT 'inventory' CHECK (tag IN ('sale', 'procurement', 'khata', 'nursery', 'compliance', 'inventory')),
    reference_id TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 10. Seasonal Agricultural Insights Table
CREATE TABLE IF NOT EXISTS public.seasonal_insights (
    id TEXT PRIMARY KEY,
    season_name TEXT NOT NULL,
    current_phase TEXT NOT NULL,
    weather_condition TEXT NOT NULL,
    strategic_advice TEXT NOT NULL,
    high_demand_products JSONB DEFAULT '[]'::jsonb NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 11. Nursery Cameras Table
CREATE TABLE IF NOT EXISTS public.nursery_cameras (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    status TEXT DEFAULT 'Live 1080p',
    sensors_info TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 12. Operational Alerts Table
CREATE TABLE IF NOT EXISTS public.operational_alerts (
    id TEXT PRIMARY KEY,
    severity TEXT NOT NULL CHECK (severity IN ('critical', 'warning', 'info')),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('inventory', 'khata', 'compliance', 'nursery')),
    count_or_value TEXT,
    timestamp TEXT NOT NULL,
    action_label TEXT,
    action_type TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 13. Mortality Records Table
CREATE TABLE IF NOT EXISTS public.mortality_records (
    id TEXT PRIMARY KEY,
    date DATE DEFAULT CURRENT_DATE NOT NULL,
    plant_name TEXT NOT NULL,
    quantity_lost INTEGER DEFAULT 1 NOT NULL,
    estimated_value NUMERIC DEFAULT 0 NOT NULL,
    reason TEXT NOT NULL,
    section TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- Row Level Security (RLS) - Public Read & Write (No Auth Required)
-- ==============================================================================

ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.khata_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plant_care_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nursery_sensors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seasonal_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nursery_cameras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operational_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mortality_records ENABLE ROW LEVEL SECURITY;

DO $$ 
DECLARE 
    tbl text;
BEGIN
    FOR tbl IN 
        SELECT tablename FROM pg_tables WHERE schemaname = 'public' 
        AND tablename IN (
            'branches', 'inventory', 'sales', 'khata_ledger', 'purchase_orders', 
            'plant_care_tasks', 'nursery_sensors', 'compliance_licenses', 
            'activity_logs', 'seasonal_insights', 'nursery_cameras', 
            'operational_alerts', 'mortality_records'
        )
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Public access on %I" ON public.%I', tbl, tbl);
        EXECUTE format('CREATE POLICY "Public access on %I" ON public.%I FOR ALL USING (true) WITH CHECK (true)', tbl, tbl);
    END LOOP;
END $$;

-- ==============================================================================
-- Realtime Publication Configuration
-- ==============================================================================
DO $$
BEGIN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE 
        public.branches,
        public.inventory,
        public.sales,
        public.khata_ledger,
        public.purchase_orders,
        public.plant_care_tasks,
        public.nursery_sensors,
        public.compliance_licenses,
        public.activity_logs,
        public.seasonal_insights,
        public.nursery_cameras,
        public.operational_alerts,
        public.mortality_records';
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN others THEN NULL;
END $$;
