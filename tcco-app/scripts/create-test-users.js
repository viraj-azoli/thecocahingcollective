#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://gzagyzvcekvpsdpkkqno.supabase.co';
const SERVICE_ROLE_KEY = process.argv[2];

if (!SERVICE_ROLE_KEY) {
  console.error('❌ Service role key required');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const testUsers = [
  { email: 'seeker@test.com', password: 'password123', type: 'seeker' },
  { email: 'coach@test.com', password: 'password123', type: 'coach' },
  { email: 'admin@test.com', password: 'password123', type: 'admin' },
];

async function createUsers() {
  console.log('👥 Creating test users...\n');

  for (const user of testUsers) {
    try {
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
      });

      if (authError) {
        if (authError.message?.includes('already exists')) {
          console.log(`⏭️  ${user.email} already exists`);
          continue;
        }
        throw authError;
      }

      const userId = authData.user.id;

      // Create user profile
      const { error: profileError } = await supabase
        .from('users')
        .insert([{ id: userId, user_type: user.type }]);

      if (profileError) {
        if (!profileError.message?.includes('duplicate')) {
          throw profileError;
        }
      }

      console.log(`✅ ${user.email} (${user.type})`);
    } catch (err) {
      console.error(`❌ ${user.email}:`, err.message);
    }
  }

  console.log('\n✅ Test users ready!');
}

createUsers();
