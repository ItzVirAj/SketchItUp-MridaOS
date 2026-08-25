# MridaOS Enterprise REST API Reference (v1)

Base URL: `https://erhabsohsdpusepjplup.supabase.co/functions/v1`  
Authentication: `Authorization: Bearer <SUPABASE_USER_JWT>`  
All endpoints return standard response envelopes and strictly enforce Role-Based Access Control (RLS & GoTrue Identity).

---

## 1. Response Envelopes & Conventions

### Standard Success Response (200 / 201)
```json
{
  "data": { ... },
  "error": null,
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100
  }
}
```

### Standard Error Response (400 / 401 / 403 / 404 / 500)
```json
{
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR | UNAUTHORIZED | FORBIDDEN | NOT_FOUND | INSUFFICIENT_STOCK | DATABASE_ERROR",
    "message": "Human-readable error explanation",
    "details": null
  },
  "meta": null
}
```

---

## 2. Master Data Endpoints

### 2.1 Items (Fertilizer & Nursery)
- **`GET /items/fertilizer`**
  - **Query Params**: `?category=`, `?license_category=`, `?search=`, `?low_stock=true`, `?page=`, `?limit=`
  - **Roles**: All authenticated users
  - **Description**: Returns agri-inputs, fertilizers, bio-nutrients, and pesticides.
- **`GET /items/nursery`**
  - **Query Params**: `?category=`, `?living_stock=true`, `?care_schedule_template=`, `?search=`, `?page=`, `?limit=`
  - **Roles**: All authenticated users
  - **Description**: Returns live plant stock, saplings, potting soil, and containers.
- **`GET /items/:id`**
  - **Roles**: All authenticated users
  - **Description**: Single SKU with active batches, unit price, and cost price.
- **`POST /items`**
  - **Roles**: `inventory_manager`, `procurement_user`, `admin`, `owner`
  - **Request Body**:
    ```json
    {
      "name": "NPK 19-19-19 Water Soluble",
      "category": "Fertilizer",
      "sku": "FERT-NPK-1919",
      "unit": "kg",
      "unit_price": 1450,
      "cost_price": 1180,
      "stock_qty": 50,
      "reorder_level": 15,
      "rack_location": "Bay 01"
    }
    ```
- **`PUT /items/:id`**
  - **Roles**: `inventory_manager`, `procurement_user`, `admin`, `owner`
- **`DELETE /items/:id`**
  - **Roles**: `inventory_manager`, `admin`, `owner`
  - **Description**: Soft-deletes/archives the SKU without breaking historical invoice records.

---

### 2.2 Suppliers / Vendors
- **`GET /suppliers`**
  - **Query Params**: `?search=`, `?has_active_rate_contract=true`
- **`GET /suppliers/:id`**
  - **Description**: Includes linked Purchase Orders and active rate contract history.
- **`POST /suppliers`**
  - **Roles**: `procurement_user`, `admin`, `owner`
- **`PUT /suppliers/:id`**
  - **Roles**: `procurement_user`, `admin`, `owner`
- **`DELETE /suppliers/:id`**
  - **Roles**: `admin`, `owner`

---

### 2.3 Customers & Credit Ledger
- **`GET /customers`**
  - **Query Params**: `?search=`, `?has_outstanding_balance=true`, `?page=`, `?limit=`
- **`GET /customers/:id`**
  - **Description**: Returns customer profile, credit limits, overdue days, and last 10 invoices.
- **`POST /customers`**
  - **Roles**: `counter_staff`, `accounts_user`, `admin`, `owner`
- **`PUT /customers/:id`**
  - **Roles**: `counter_staff`, `accounts_user`, `admin`, `owner`

---

### 2.4 Batches & FEFO Intelligence
- **`GET /batches`**
  - **Query Params**: `?item_id=`, `?branch_id=`, `?status=`, `?expiring_within_days=`
- **`GET /batches/fefo/:item_id`**
  - **Description**: Algorithmically returns the earliest-expiring active batch with quantity > 0 for First-Expiry-First-Out sales allocation.
- **`PUT /batches/:id`**
  - **Roles**: `inventory_manager`, `admin`, `owner`
  - **Description**: Updates physical lot storage rack or quantity discrepancy.

---

### 2.5 Storage Locations & Branches
- **`GET /storage-locations`**
  - **Description**: Returns bays, aisles, polyhouse benches, and secure pesticide cages.
- **`GET /branches`**
  - **Description**: Multi-store hub directory.
- **`POST /branches`**, **`PUT /branches/:id`**
  - **Roles**: `admin`, `owner`

---

## 3. Transactional Endpoints

### 3.1 Sales (POS Checkout)
- **`GET /sales`**
  - **Query Params**: `?date_from=`, `?date_to=`, `?customer_name=`, `?is_khata=`, `?page=`, `?limit=`
- **`GET /sales/:id`**
- **`POST /sales`**
  - **Roles**: `counter_staff`, `owner`, `admin`
  - **Request Body**:
    ```json
    {
      "customer_name": "Ramesh Patil",
      "customer_phone": "+91 98221 44550",
      "is_khata": true,
      "items": [
        { "item_id": "inv-001", "qty": 2, "price": 1450 }
      ],
      "total": 2900,
      "cash_paid": 900,
      "khata_amount": 2000,
      "payment_mode": "split"
    }
    ```
  - **Transactional Safety**:
    1. Validates that requested quantities exist.
    2. Auto-selects earliest FEFO batch if omitted.
    3. Decrements batch and item stock quantities atomically.
    4. Automatically credits customer's Khata balance in `khata_ledger`.
    5. Appends immutable POS execution record to `activity_logs`.

---

### 3.2 Purchase Orders & Goods Receipt Notes (GRN)
- **`GET /purchase-orders`**
  - **Query Params**: `?status=draft|pending_acknowledgement|dispatched|grn_pending|received|cancelled`, `?supplier_name=`
- **`POST /purchase-orders`** (Initial status: `draft`)
  - **Roles**: `procurement_user`, `admin`, `owner`
- **`PATCH /purchase-orders/:id/status`**
  - **Roles**: `procurement_user`, `inventory_manager`, `admin`, `owner`
  - **Legal Transitions**:
    - `draft` → `pending_acknowledgement` / `cancelled`
    - `pending_acknowledgement` → `dispatched` / `cancelled`
    - `dispatched` → `grn_pending` / `cancelled`
    - `grn_pending` → `received`
- **`POST /purchase-orders/:id/grn`** (Goods Receipt Note)
  - **Roles**: `inventory_manager`, `admin`, `owner`
  - **Request Body**:
    ```json
    {
      "batches": [
        {
          "item_id": "inv-001",
          "batch_number": "LOT-2026-N09",
          "mfg_date": "2026-08-01",
          "expiry_date": "2028-08-01",
          "qty": 50,
          "rack": "Bay 01"
        }
      ]
    }
    ```
  - **Action**: Inwards stock batches into inventory, recalculates SKU stock, and transitions PO status to `received`.

---

### 3.3 Khata (Farmer Credit Management)
- **`GET /khata/ledger/:customer_id`**
  - **Description**: Complete transaction history, outstanding balance, and ageing bucket.
- **`GET /khata/ageing-report`**
  - **Description**: Aggregate totals for `Current (0-30d)`, `31-60d`, `61-90d`, and `90+ Days (Critical)`.
- **`POST /khata/payments`**
  - **Roles**: `accounts_user`, `counter_staff`, `admin`, `owner`
  - **Request Body**: `{ "customer_id": "khata-01", "amount": 5000, "payment_mode": "cash" }`
  - **Action**: Deducts customer balance, updates status, and issues receipt number.

---

### 3.4 Stock Adjustments, Returns & Write-Offs
- **`GET /stock-adjustments`**, **`POST /stock-adjustments`**
  - **Roles**: `inventory_manager`, `admin`, `owner`
- **`POST /returns`** (Return to Vendor - RTV)
  - **Roles**: `inventory_manager`, `admin`, `owner`
- **`POST /write-offs`** (Expiry Disposals)
  - **Roles**: `inventory_manager`, `admin`, `owner`

---

### 3.5 Nursery Operations (Plant Care & Mortality)
- **`GET /plant-care`**, **`POST /plant-care`**
  - **Roles**: `nursery_care_staff`, `admin`, `owner`
- **`PATCH /plant-care/:id/complete`**
  - **Roles**: `nursery_care_staff`, `admin`, `owner`
- **`GET /mortality`**, **`POST /mortality`**
  - **Roles**: `nursery_care_staff`, `admin`, `owner`

---

### 3.6 Compliance & Statutory Licenses
- **`GET /compliance`**, **`POST /compliance`**
  - **Roles**: `owner`, `admin`
- **`PATCH /compliance/:id/acknowledge`**
  - **Roles**: `owner`
- **`POST /compliance/:id/upload`**
  - **Roles**: `owner`, `admin`

---

### 3.7 Admin & Staff Identity Provisioning
- **`GET /admin-users`**
  - **Roles**: `admin`, `owner`
- **`POST /admin-users`**
  - **Roles**: `admin`, `owner`
  - **Body**: `{ "email": "staff@mridaos.in", "password": "...", "full_name": "...", "role": "counter_staff", "branch_id": "nashik-central" }`
- **`PUT /admin-users/:id`**
- **`PATCH /admin-users/:id/revoke`** / **`PATCH /admin-users/:id/unrevoke`**
- **`DELETE /admin-users/:id`**

---

## 4. Dashboard Aggregation Endpoints

| Endpoint | Backs Component | Response Contents |
|---|---|---|
| `GET /dashboard/metrics` | `MetricCards.tsx` | Today's gross sales, cash %, khata risk, buffer stock valuation, low stock SKUs, open PO value, nursery care completion % |
| `GET /dashboard/alerts` | `ActionRequired.tsx` | Ranked operational alerts across inventory, khata, compliance, nursery, procurement |
| `GET /dashboard/sales-analytics` | `SalesAnalytics.tsx` | Sales velocity, profit margin estimate, cash-to-credit realization ratio |
| `GET /dashboard/inventory-intelligence` | `InventoryIntelligence.tsx` | Fast vs slow moving SKUs, FEFO batches expiring in <= 30 days |
| `GET /dashboard/seasonal-intelligence` | `SeasonalIntelligence.tsx` | Season name, monsoon/kharif sowing phase, high-demand fertilizers, advisory notes |
| `GET /dashboard/activity-log` | `ComplianceAndActivity.tsx` | Paginated operational audit logs filterable by tag (`sale`, `khata`, `procurement`, `inventory`, `nursery`, `compliance`) |
| `GET /dashboard/sensors` | `NurseryCameraAndSensors.tsx` | Real-time temperature, humidity, and soil moisture telemetry |
