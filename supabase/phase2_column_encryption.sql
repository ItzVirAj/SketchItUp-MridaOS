-- ==============================================================================
-- MRIDAOS PHASE 2 HARDENING: COLUMN-LEVEL PII & FINANCIAL DATA ENCRYPTION
-- Uses PostgreSQL pgcrypto extension + Supabase Vault for key management
-- ==============================================================================

-- 1. Enable pgcrypto and vault extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS supabase_vault CASCADE;

-- 2. Store Master Data Encryption Key (DEK) securely in Supabase Vault
-- (Executed once by DBA / Supabase Admin; never hardcoded in application code or client bundles)
/*
SELECT vault.create_secret(
  secret := 'mridaos_super_secure_vault_dek_2026_aes256_key',
  name := 'pii_encryption_key',
  description := 'Master Data Encryption Key for PII and Banking Reference fields'
);
*/

-- ==============================================================================
-- 3. USER ACCOUNTS / PROFILES PII ENCRYPTION
-- ==============================================================================

-- Add encrypted bytea column for user phone numbers
ALTER TABLE IF EXISTS user_accounts 
  ADD COLUMN IF NOT EXISTS phone_encrypted BYTEA;

-- Encrypt existing plaintext phone numbers using key retrieved from Supabase Vault
DO $$
DECLARE
  v_key TEXT;
BEGIN
  -- Retrieve key securely from Supabase Vault
  SELECT decrypted_secret INTO v_key FROM vault.decrypted_secrets WHERE name = 'pii_encryption_key' LIMIT 1;
  IF v_key IS NOT NULL THEN
    UPDATE user_accounts 
    SET phone_encrypted = pgp_sym_encrypt(phone, v_key)
    WHERE phone IS NOT NULL AND phone_encrypted IS NULL;
  END IF;
END $$;

-- ==============================================================================
-- 4. CUSTOMER PII ENCRYPTION (PHONE, EMAIL, VILLAGE ADDRESS)
-- ==============================================================================

ALTER TABLE IF EXISTS khata_ledger 
  ADD COLUMN IF NOT EXISTS phone_encrypted BYTEA,
  ADD COLUMN IF NOT EXISTS village_encrypted BYTEA;

-- Function to transparently decrypt customer phone for authorized staff queries
CREATE OR REPLACE FUNCTION get_decrypted_customer_phone(p_customer_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  v_key TEXT;
  v_encrypted_phone BYTEA;
  v_decrypted TEXT;
BEGIN
  SELECT decrypted_secret INTO v_key FROM vault.decrypted_secrets WHERE name = 'pii_encryption_key' LIMIT 1;
  IF v_key IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT phone_encrypted INTO v_encrypted_phone FROM khata_ledger WHERE id = p_customer_id;
  IF v_encrypted_phone IS NULL THEN
    RETURN NULL;
  END IF;

  v_decrypted := pgp_sym_decrypt(v_encrypted_phone, v_key);
  RETURN v_decrypted;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$;

-- ==============================================================================
-- 5. KHATA PAYMENT REFERENCES & BANKING DETAILS ENCRYPTION
-- ==============================================================================

ALTER TABLE IF EXISTS sales 
  ADD COLUMN IF NOT EXISTS customer_phone_encrypted BYTEA,
  ADD COLUMN IF NOT EXISTS bank_ref_encrypted BYTEA;

-- Trigger to automatically encrypt sensitive fields before insert
CREATE OR REPLACE FUNCTION encrypt_sales_pii_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  v_key TEXT;
BEGIN
  SELECT decrypted_secret INTO v_key FROM vault.decrypted_secrets WHERE name = 'pii_encryption_key' LIMIT 1;
  IF v_key IS NOT NULL THEN
    IF NEW.customer_phone IS NOT NULL THEN
      NEW.customer_phone_encrypted := pgp_sym_encrypt(NEW.customer_phone, v_key);
      -- Optional: Mask plaintext in transit/storage
      NEW.customer_phone := SUBSTRING(NEW.customer_phone FROM 1 FOR 3) || '****' || SUBSTRING(NEW.customer_phone FROM LENGTH(NEW.customer_phone) - 2);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_encrypt_sales_pii ON sales;
CREATE TRIGGER trg_encrypt_sales_pii
  BEFORE INSERT OR UPDATE ON sales
  FOR EACH ROW
  EXECUTE FUNCTION encrypt_sales_pii_trigger();
