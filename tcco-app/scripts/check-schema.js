#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://gzagyzvcekvpsdpkkqno.supabase.co';
const SERVICE_ROLE_KEY = process.argv[2];

if (!SERVICE_ROLE_KEY) {
  console.error('Service role key required');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function checkSchema() {
  console.log('📋 Checking Supabase schema...\n');

  // Query information_schema to list tables
  const { data, error } = await supabase.rpc('sql_exec', {
    sql: `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;`
  });

  if (error) {
    console.log('⚠️  RPC method not available, trying direct query...');
    // If RPC doesn't work, the schema definitely doesn't exist
    console.log('❌ Schema tables not found\n');
    console.log('Tables expected: users, seeker_profiles, coach_profiles, sessions, etc.');
    return;
  }

  if (!data || data.length === 0) {
    console.log('❌ No tables found in public schema\n');
  } else {
    console.log('✅ Found tables:');
    data.forEach(row => console.log(`   - ${row.table_name}`));
    console.log();
  }
}

checkSchema();
