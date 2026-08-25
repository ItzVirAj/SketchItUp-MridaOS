import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://erhabsohsdpusepjplup.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVyaGFic29oc2RwdXNlcGpwbHVwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzY3MDg0OCwiZXhwIjoyMTAzMjQ2ODQ4fQ.VUJYgGs7NCCuUoOKj_UFHK8kGD9Gva9XyLNjWZ6eERc';

const adminSupabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const candidateTables = [
  'user_profiles',
  'users',
  'inventory',
  'sales',
  'khata_ledger',
  'purchase_orders',
  'compliance_licenses',
  'plant_care_tasks',
  'user_sessions',
  'sessions',
  'branches',
];

async function inspect() {
  for (const t of candidateTables) {
    const { data, error } = await adminSupabase.from(t).select('*').limit(1);
    if (error) {
      console.log(`Table '${t}': [MISSING/ERROR] ${error.message}`);
    } else {
      console.log(`Table '${t}': [EXISTS] with ${data?.length} row(s). Sample keys:`, data[0] ? Object.keys(data[0]) : 'empty');
    }
  }
}

inspect();
