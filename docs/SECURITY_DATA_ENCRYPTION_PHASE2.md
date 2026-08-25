# MridaOS Data Encryption & PII Protection Strategy (Phase 2 Hardening)

## 1. Current Baseline (Phase 1 / MVP)

MridaOS currently benefits from enterprise-grade cloud baseline encryption:
- **Encryption at Rest**: Supabase PostgreSQL volume storage is encrypted via AWS EBS **AES-256** hardware-level encryption.
- **Encryption in Transit**: All client-to-edge, edge-to-database, and inter-service communications enforce **TLS 1.3 / HTTPS** with HSTS.
- **Access Authentication**: Verified cryptographic **HMAC-SHA256 JWTs** with 15-minute expiration windows and row-level security / RBAC.

> **Status**: Sufficient for MVP development and initial testing. Before onboarding real farmer customer data and active payment ledgers, **Phase 2 Column-Level Encryption** will be activated.

---

## 2. Sensitive Fields Inventory

The following fields contain Personally Identifiable Information (PII) or financial reference data requiring column-level cryptographic shielding:

| Table | Column | Data Classification | Risk Profile |
|---|---|---|---|
| `user_accounts` / `profiles` | `phone` | PII | Employee privacy, SMS credential hijacking |
| `khata_ledger` | `phone`, `village` | PII (Farmer Identity) | Farmer identity theft, location profiling |
| `sales` | `customer_phone` | PII (Counter Transactions) | Transaction tracking & privacy |
| `khata_payments` / `sales` | `payment_ref` / `bank_ref` | Financial / Banking | UTR, bank account, cheque reference exposure |

---

## 3. Phase 2 Architecture: `pgcrypto` + Supabase Vault

To eliminate plaintext exposure in database dumps, backups, and unauthorized SQL queries, sensitive fields will use **PostgreSQL `pgcrypto` symmetric encryption (`pgp_sym_encrypt` / `pgp_sym_decrypt`)** combined with **Supabase Vault**.

### Architectural Flow:
```
[Client Request]
       │ (TLS 1.3)
       ▼
[Edge Function] ──(Validates Zod & RBAC)──▶ [PostgreSQL DB]
                                                   │
                                                   ├── 1. Fetches DEK from supabase_vault
                                                   ├── 2. Executes pgp_sym_encrypt(phone, DEK)
                                                   └── 3. Stores cipher in `BYTEA` column
```

### Key Management Invariants:
1. **Never in Source Code**: Encryption keys are **NEVER** stored in environment variables, `.env` files, Git commits, or client-side bundles.
2. **Supabase Vault Storage**: The Data Encryption Key (DEK) is stored in `vault.secrets` with strict PostgreSQL access grants restricted to security definer functions.
3. **Key Rotation Ready**: Encryption uses versioned key aliases in Vault (`pii_encryption_key_v1`), allowing periodic automated key rotation without database downtime.

---

## 4. Searchable Encryption Strategy (Blind Indexing)

Because standard encrypted ciphertext (`BYTEA`) cannot be searched efficiently with `B-tree` indexes, searching for a farmer by phone number without decrypting the entire table is solved via **HMAC Blind Indexing**:

```sql
-- Store a one-way deterministic HMAC hash for index lookups
ALTER TABLE khata_ledger ADD COLUMN phone_bidx TEXT;
CREATE INDEX idx_khata_phone_bidx ON khata_ledger(phone_bidx);

-- When saving/querying:
-- phone_bidx = encode(hmac(raw_phone, blind_index_salt, 'sha256'), 'hex');
```

This allows exact-match lookups (`WHERE phone_bidx = compute_bidx(input_phone)`) in $O(\log N)$ time while keeping the actual phone number ciphertext strictly encrypted.

---

## 5. Phase 2 Migration Script

The complete SQL migration script is prepared at [`supabase/phase2_column_encryption.sql`](file:///c:/Users/Bruce/Downloads/mridaos-—-agri-retail-operating-system/supabase/phase2_column_encryption.sql).

### Execution Steps for Go-Live:
1. Initialize secret in Supabase Vault:
   ```sql
   SELECT vault.create_secret(
     secret := '<generated-256-bit-key>',
     name := 'pii_encryption_key',
     description := 'Master Data Encryption Key for PII'
   );
   ```
2. Execute migration:
   ```sql
   \i supabase/phase2_column_encryption.sql
   ```
3. Verify decryption function:
   ```sql
   SELECT get_decrypted_customer_phone('customer-uuid-here');
   ```

---

## 6. Security Invariants Checklist

- [x] Full DB volume encryption active (AES-256)
- [x] TLS 1.3 enforced for all Edge Function and REST API traffic
- [x] 15-minute auto-expiring JWT tokens with active watchdog
- [x] Single-use cryptographic password reset tokens (SHA-256 hashed)
- [x] Zod schema input validation rejecting unvalidated payloads
- [x] Phase 2 `pgcrypto` column-level encryption migration and architecture documented
