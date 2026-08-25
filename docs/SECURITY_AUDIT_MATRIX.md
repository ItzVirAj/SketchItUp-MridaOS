# MridaOS Edge Functions Security Audit Matrix & Input Validation Checklist

## 1. Input Validation Checklist (Zod Engine)

Every incoming HTTP request is validated **before** touching database tables or executing business logic.

| Check | Specification | Zod Rule / Implementation | Failure Status |
|---|---|---|---|
| **Email** | RFC 5322 regex + lowercase transformation | `zEmail`: `/^[a-zA-Z0-9.!#$%&'*+/=?^_\`{\|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/` | `400 VALIDATION_ERROR` |
| **UUIDs** | Exact 36-char hyphenated format | `zUuid`: `/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i` | `400 VALIDATION_ERROR` |
| **Enums** | Whitelisted string sets only | `z.enum([...])` (e.g. `role`, `status`, `payment_mode`, `category`, `velocity`, `reason`) | `400 VALIDATION_ERROR` |
| **Quantities / Numbers** | Positive bounded values | `zPositiveNumber`: `number > 0 && <= 1,000,000` | `400 VALIDATION_ERROR` |
| **Prices / Amounts** | Non-negative currency values | `zNonNegativeNumber`: `number >= 0 && <= 100,000,000` | `400 VALIDATION_ERROR` |
| **Dates** | Strict ISO 8601 format | `zIsoDate`: `^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z?)?$` | `400 VALIDATION_ERROR` |
| **Search Queries** | Max 200 chars, SQL special chars sanitized | `zSearchQuery`: `max(200)` + strips `['";\\%_]` | `400 VALIDATION_ERROR` |
| **Untrusted Client Claims** | `user_id`, `role`, `branch_id` | **NEVER** trusted from request bodies. Always derived from verified JWT | Ignored / Overwritten |

---

## 2. Standard Validation Error Response Format

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request data",
    "fields": {
      "items[0].qty": "Must be a positive number greater than 0",
      "payment_mode": "Payment mode must be one of: cash, upi, card, khata, split",
      "email": "Invalid email address format (RFC 5322 compliant email required)"
    }
  }
}
```

---

## 3. RBAC Endpoint Access Permission Matrix (PRD Section 6)

| HTTP Method & Endpoint | `owner` | `admin` | `counter_staff` | `inventory_manager` | `procurement_user` | `nursery_care_staff` | `accounts_user` |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| `GET /api/v1/sales` | ✅ 200 | ✅ 200 | ✅ 200 | ✅ 200 | ❌ 403 | ❌ 403 | ✅ 200 |
| `POST /api/v1/sales` | ✅ 201 | ✅ 201 | ✅ 201 | ❌ 403 | ❌ 403 | ❌ 403 | ❌ 403 |
| `GET /api/v1/sales/:id` | ✅ 200 | ✅ 200 | ✅ 200 | ❌ 403 | ❌ 403 | ❌ 403 | ✅ 200 |
| `GET /api/v1/items` | ✅ 200 | ✅ 200 | ✅ 200 | ✅ 200 | ✅ 200 | ✅ 200 | ✅ 200 |
| `POST /api/v1/items` | ✅ 201 | ✅ 201 | ❌ 403 | ✅ 201 | ❌ 403 | ❌ 403 | ❌ 403 |
| `PUT /api/v1/items/:id` | ✅ 200 | ✅ 200 | ❌ 403 | ✅ 200 | ❌ 403 | ❌ 403 | ❌ 403 |
| `DELETE /api/v1/items/:id` | ✅ 200 | ✅ 200 | ❌ 403 | ❌ 403 | ❌ 403 | ❌ 403 | ❌ 403 |
| `GET /api/v1/batches` | ✅ 200 | ✅ 200 | ✅ 200 | ✅ 200 | ✅ 200 | ❌ 403 | ❌ 403 |
| `POST /api/v1/batches` | ✅ 201 | ✅ 201 | ❌ 403 | ✅ 201 | ✅ 201 | ❌ 403 | ❌ 403 |
| `GET /api/v1/suppliers` | ✅ 200 | ✅ 200 | ❌ 403 | ✅ 200 | ✅ 200 | ❌ 403 | ❌ 403 |
| `POST /api/v1/suppliers` | ✅ 201 | ✅ 201 | ❌ 403 | ❌ 403 | ✅ 201 | ❌ 403 | ❌ 403 |
| `GET /api/v1/purchase-orders` | ✅ 200 | ✅ 200 | ❌ 403 | ✅ 200 | ✅ 200 | ❌ 403 | ❌ 403 |
| `POST /api/v1/purchase-orders` | ✅ 201 | ✅ 201 | ❌ 403 | ❌ 403 | ✅ 201 | ❌ 403 | ❌ 403 |
| `PATCH /purchase-orders/:id/status` | ✅ 200 | ✅ 200 | ❌ 403 | ❌ 403 | ✅ 200 | ❌ 403 | ❌ 403 |
| `POST /purchase-orders/:id/grn` | ✅ 200 | ✅ 200 | ❌ 403 | ✅ 200 | ✅ 200 | ❌ 403 | ❌ 403 |
| `GET /api/v1/khata/ageing-report` | ✅ 200 | ✅ 200 | ❌ 403 | ❌ 403 | ❌ 403 | ❌ 403 | ✅ 200 |
| `GET /api/v1/khata/ledger/:id` | ✅ 200 | ✅ 200 | ✅ 200 | ❌ 403 | ❌ 403 | ❌ 403 | ✅ 200 |
| `POST /api/v1/khata/payments` | ✅ 200 | ✅ 200 | ✅ 200 | ❌ 403 | ❌ 403 | ❌ 403 | ✅ 200 |
| `POST /api/v1/stock-adjustments` | ✅ 201 | ✅ 201 | ❌ 403 | ✅ 201 | ❌ 403 | ❌ 403 | ❌ 403 |
| `GET /api/v1/plant-care` | ✅ 200 | ✅ 200 | ✅ 200 | ✅ 200 | ❌ 403 | ✅ 200 | ❌ 403 |
| `POST /api/v1/plant-care` | ✅ 201 | ✅ 201 | ❌ 403 | ✅ 201 | ❌ 403 | ✅ 201 | ❌ 403 |
| `PATCH /plant-care/:id/complete` | ✅ 200 | ✅ 200 | ❌ 403 | ❌ 403 | ❌ 403 | ✅ 200 | ❌ 403 |
| `POST /api/v1/mortality` | ✅ 201 | ✅ 201 | ❌ 403 | ✅ 201 | ❌ 403 | ✅ 201 | ❌ 403 |
| `GET /api/v1/compliance` | ✅ 200 | ✅ 200 | ❌ 403 | ❌ 403 | ❌ 403 | ❌ 403 | ✅ 200 |
| `GET /api/v1/admin-users` | ✅ 200 | ✅ 200 | ❌ 403 | ❌ 403 | ❌ 403 | ❌ 403 | ❌ 403 |
| `POST /api/v1/admin-users` | ✅ 201 | ✅ 201 | ❌ 403 | ❌ 403 | ❌ 403 | ❌ 403 | ❌ 403 |
| `PATCH /admin-users/:id/revoke` | ✅ 200 | ✅ 200 | ❌ 403 | ❌ 403 | ❌ 403 | ❌ 403 | ❌ 403 |
| `DELETE /admin-users/:id` | ✅ 200 | ✅ 200 | ❌ 403 | ❌ 403 | ❌ 403 | ❌ 403 | ❌ 403 |
| `POST /auth/admin-generate-reset-token` | ✅ 200 | ✅ 200 | ❌ 403 | ❌ 403 | ❌ 403 | ❌ 403 | ❌ 403 |

---

## 4. Multi-Tenant Branch Scoping Rules

- **Admins and Owners**: Unrestricted cross-branch visibility (`requireBranchMatch` passes unconditionally).
- **Branch-Scoped Staff (Counter, Inventory, Nursery, Procurement)**:
  - Database queries automatically filter `where branch_id = user.branchId`.
  - Fetching / modifying a single resource outside their assigned branch triggers `403 FORBIDDEN` (`requireBranchMatch` check).

---

## 5. Password Reset Lifecycle Security Invariants

1. **Cryptographic Randomness**: 32-byte entropy generated via Web Crypto API (`crypto.getRandomValues`).
2. **Never Store Plain Tokens**: Tokens are hashed with SHA-256 before persistence in backend storage.
3. **15-Minute Expiry Window**: `expiresAt = issue_time + 15 mins`. Expired tokens are rejected with `400 TOKEN_EXPIRED`.
4. **Strict Single-Use**: Consuming a token records `usedAt = timestamp`. Any subsequent attempts are rejected with `400 TOKEN_ALREADY_USED`.
5. **Universal Session Revocation**: When a password is reset, all active `user_sessions` for that user are immediately marked `isRevoked = true`, forcing re-authentication everywhere.
6. **Rate Limiting**: Rate limited to maximum 3 reset requests per hour per email (`429 RATE_LIMIT_EXCEEDED`).
