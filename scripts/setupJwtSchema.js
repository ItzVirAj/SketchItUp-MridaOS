import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://erhabsohsdpusepjplup.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVyaGFic29oc2RwdXNlcGpwbHVwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzY3MDg0OCwiZXhwIjoyMTAzMjQ2ODQ4fQ.VUJYgGs7NCCuUoOKj_UFHK8kGD9Gva9XyLNjWZ6eERc';

const adminSupabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function setup() {
  console.log('Setting up custom JWT tables in Supabase...');

  // 1. Check if user_accounts table exists by querying it
  const { error: checkErr } = await adminSupabase.from('user_accounts').select('id').limit(1);
  if (checkErr) {
    console.log('user_accounts does not exist yet or needs schema initialization:', checkErr.message);
  } else {
    console.log('user_accounts table exists!');
  }
}

setup();
