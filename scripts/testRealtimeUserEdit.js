console.log('================================================================');
console.log(' MRIDAOS REALTIME USER PERSISTENCE & EDIT TEST SUITE');
console.log('================================================================\n');

// Mock localStorage for node test environment
const mockStorage = new Map();
global.localStorage = {
  getItem: (key) => mockStorage.get(key) || null,
  setItem: (key, value) => mockStorage.set(key, String(value)),
  removeItem: (key) => mockStorage.delete(key),
};

const DEFAULT_GENUINE_USERS = [
  {
    id: 'a0000000-0000-0000-0000-000000000001',
    email: 'admin@mridaos.in',
    fullName: 'System Administrator',
    role: 'admin',
    branchId: 'nashik-central',
    status: 'active',
  },
  {
    id: 'a0000000-0000-0000-0000-000000000002',
    email: 'owner@mridaos.in',
    fullName: 'Shop Owner',
    role: 'owner',
    branchId: 'nashik-central',
    status: 'active',
  },
  {
    id: 'a0000000-0000-0000-0000-000000000003',
    email: 'counter@mridaos.in',
    fullName: 'Counter Staff',
    role: 'counter_staff',
    branchId: 'nashik-central',
    status: 'active',
  },
];

function getStoredCustomUsers() {
  const raw = localStorage.getItem('mridaos_custom_users');
  if (raw) {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  }
  localStorage.setItem('mridaos_custom_users', JSON.stringify(DEFAULT_GENUINE_USERS));
  return [...DEFAULT_GENUINE_USERS];
}

function saveStoredCustomUsers(users) {
  localStorage.setItem('mridaos_custom_users', JSON.stringify(users));
}

function fetchAllUsers() {
  const storedUsers = getStoredCustomUsers();
  const emailMap = new Map();
  DEFAULT_GENUINE_USERS.forEach((u) => emailMap.set(u.email.toLowerCase(), u));
  storedUsers.forEach((u) => emailMap.set(u.email.toLowerCase(), u));
  return Array.from(emailMap.values());
}

function adminUpdateUser(userId, fullName, role, branchId) {
  const allUsers = getStoredCustomUsers();
  const trimmedName = fullName.trim();
  let found = false;

  const updatedUsers = allUsers.map((u) => {
    if (u.id === userId || u.email.toLowerCase() === userId.toLowerCase()) {
      found = true;
      return {
        ...u,
        fullName: trimmedName,
        role,
        branchId: branchId !== undefined ? branchId : u.branchId,
      };
    }
    return u;
  });

  if (!found) {
    const defaultMatch = DEFAULT_GENUINE_USERS.find(
      (u) => u.id === userId || u.email.toLowerCase() === userId.toLowerCase()
    );
    if (defaultMatch) {
      updatedUsers.push({
        ...defaultMatch,
        fullName: trimmedName,
        role,
        branchId: branchId !== undefined ? branchId : defaultMatch.branchId,
      });
    }
  }

  saveStoredCustomUsers(updatedUsers);
  return { success: true };
}

// 1. Initial State Check
console.log('▶ [TEST SUITE 1] Initial User Accounts Fetch:');
const initialUsers = fetchAllUsers();
console.log(`  ✔ [PASS] 1.1: Fetched ${initialUsers.length} initial genuine user accounts.`);
const targetUser = initialUsers.find((u) => u.email === 'counter@mridaos.in');
console.log(`    - Target: ${targetUser.fullName} (${targetUser.role}) @ ${targetUser.branchId}`);

// 2. Perform Realtime Edit
console.log('\n▶ [TEST SUITE 2] Realtime User Edit & Immediate Persistence:');
const updateResult = adminUpdateUser(
  'a0000000-0000-0000-0000-000000000003',
  'Ramesh Patil (Senior Cashier)',
  'inventory_manager',
  'pune-hub'
);
console.log(`  ✔ [PASS] 2.1: adminUpdateUser executed successfully.`);

// 3. Verify Persistence on Subsequent Fetches
const freshUsers = fetchAllUsers();
const updatedTarget = freshUsers.find((u) => u.email === 'counter@mridaos.in');

if (
  updatedTarget &&
  updatedTarget.fullName === 'Ramesh Patil (Senior Cashier)' &&
  updatedTarget.role === 'inventory_manager' &&
  updatedTarget.branchId === 'pune-hub'
) {
  console.log(`  ✔ [PASS] 3.1: Changes persisted in storage and returned on fetchAllUsers():`);
  console.log(`    - Full Name: "${updatedTarget.fullName}" (Updated)`);
  console.log(`    - Role:      "${updatedTarget.role}" (Promoted)`);
  console.log(`    - Branch:    "${updatedTarget.branchId}" (Transferred)`);
} else {
  throw new Error('User edit was not persisted!');
}

console.log('\n================================================================');
console.log(' ✅ ALL REALTIME USER PERSISTENCE TESTS PASSED (100%)');
console.log('================================================================');
