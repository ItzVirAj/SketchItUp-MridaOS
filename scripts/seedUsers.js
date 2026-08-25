/**
 * MridaOS One-Time User Seeding Script
 * Creates production default accounts via Supabase Admin API
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://erhabsohsdpusepjplup.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVyaGFic29oc2RwdXNlcGpwbHVwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzY3MDg0OCwiZXhwIjoyMTAzMjQ2ODQ4fQ.VUJYgGs7NCCuUoOKj_UFHK8kGD9Gva9XyLNjWZ6eERc';

const adminSupabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const DEFAULT_PASSWORD = 'MridaOS@2026';

const SEED_USERS = [
  {
    email: 'owner@mridaos.in',
    fullName: 'Santosh Deshmukh',
    role: 'owner',
    branchId: 'nashik-central',
  },
  {
    email: 'admin@mridaos.in',
    fullName: 'Priya Kulkarni',
    role: 'admin',
    branchId: 'nashik-central',
  },
  {
    email: 'counterstaff@mridaos.in',
    fullName: 'Suresh Patil',
    role: 'counter_staff',
    branchId: 'nashik-central',
  },
  {
    email: 'inventory@mridaos.in',
    fullName: 'Rahul Shinde',
    role: 'inventory_manager',
    branchId: 'nashik-central',
  },
  {
    email: 'procurement@mridaos.in',
    fullName: 'Anjali Gaikwad',
    role: 'procurement_user',
    branchId: 'nashik-central',
  },
  {
    email: 'nurserycare@mridaos.in',
    fullName: 'Vikas Jadhav',
    role: 'nursery_care_staff',
    branchId: 'nashik-central',
  },
  {
    email: 'accounts@mridaos.in',
    fullName: 'Kavita Joshi',
    role: 'accounts_user',
    branchId: 'nashik-central',
  },
];

async function seed() {
  console.log('====================================================');
  console.log('  Seeding MridaOS Production Users into Supabase Auth');
  console.log('  Temporary Password for all accounts:', DEFAULT_PASSWORD);
  console.log('====================================================\n');

  // Ensure default branch exists
  await adminSupabase.from('branches').upsert([
    {
      id: 'nashik-central',
      name: 'Nashik Central Agro-Hub',
      location: 'Nashik Dindori Road, Maharashtra',
      type: 'hybrid',
      manager: 'Santosh Deshmukh',
      license_number: 'FCO-MH-NSK-2024-889',
    },
    {
      id: 'pune-hub',
      name: 'Pune Regional Distribution Hub',
      location: 'Hadapsar Agro Park, Pune',
      type: 'hybrid',
      manager: 'Priya Kulkarni',
      license_number: 'FCO-MH-PUN-2024-442',
    },
  ]);

  for (const user of SEED_USERS) {
    try {
      // 1. Create or fetch Auth user
      let userId = null;
      const { data: createData, error: createError } = await adminSupabase.auth.admin.createUser({
        email: user.email,
        password: DEFAULT_PASSWORD,
        email_confirm: true,
        user_metadata: {
          full_name: user.fullName,
          role: user.role,
          branch_id: user.branchId,
        },
      });

      if (createError) {
        if (createError.message.includes('already registered')) {
          console.log(`- ${user.email} already registered in Auth, updating password...`);
          const { data: listData } = await adminSupabase.auth.admin.listUsers();
          const existing = listData?.users.find((u) => u.email === user.email);
          if (existing) {
            userId = existing.id;
            await adminSupabase.auth.admin.updateUserById(userId, {
              password: DEFAULT_PASSWORD,
              email_confirm: true,
              user_metadata: {
                full_name: user.fullName,
                role: user.role,
                branch_id: user.branchId,
              },
            });
          }
        } else {
          console.error(`❌ Error creating ${user.email}:`, createError.message);
          continue;
        }
      } else {
        userId = createData.user.id;
        console.log(`✅ Created Auth user: ${user.email} (${userId})`);
      }

      if (userId) {
        // 2. Upsert profile in public.profiles
        const { error: profileError } = await adminSupabase.from('profiles').upsert({
          id: userId,
          email: user.email,
          full_name: user.fullName,
          role: user.role,
          branch_id: user.branchId,
          status: 'active',
          updated_at: new Date().toISOString(),
        });

        if (profileError) {
          console.error(`⚠️ Profile sync error for ${user.email}:`, profileError.message);
        } else {
          console.log(`   Linked profile created: ${user.fullName} [role: ${user.role}]`);
        }
      }
    } catch (err) {
      console.error(`Failed processing ${user.email}:`, err);
    }
  }

  console.log('\n✨ Seeding completed successfully!');
}

seed();
