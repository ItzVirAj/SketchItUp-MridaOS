import fs from 'fs';

const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVyaGFic29oc2RwdXNlcGpwbHVwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzY3MDg0OCwiZXhwIjoyMTAzMjQ2ODQ4fQ.VUJYgGs7NCCuUoOKj_UFHK8kGD9Gva9XyLNjWZ6eERc';
const PROJECT_REF = 'erhabsohsdpusepjplup';

async function run() {
  const sql = fs.readFileSync('supabase/custom_jwt_schema.sql', 'utf-8');
  console.log('Sending SQL migration to Supabase...');

  // Try Supabase Management SQL endpoint
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: sql })
  });

  console.log('Status:', res.status, res.statusText);
  const text = await res.text();
  console.log('Response:', text);
}

run();
