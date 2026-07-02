#!/usr/bin/env node
import pkg from 'pg';
const { Client } = pkg;

const client = new Client({
  host: 'db.gzagyzvcekvpsdpkkqno.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: process.argv[2],
  ssl: { rejectUnauthorized: false }
});

async function fixRLS() {
  try {
    await client.connect();
    console.log('🔧 Fixing Row-Level Security...\n');

    // Disable RLS temporarily for testing
    const queries = [
      'ALTER TABLE users DISABLE ROW LEVEL SECURITY;',
      'ALTER TABLE seeker_profiles DISABLE ROW LEVEL SECURITY;',
      'ALTER TABLE coach_profiles DISABLE ROW LEVEL SECURITY;',
      'ALTER TABLE sessions DISABLE ROW LEVEL SECURITY;',
      'ALTER TABLE journal_entries DISABLE ROW LEVEL SECURITY;',
      'ALTER TABLE messages DISABLE ROW LEVEL SECURITY;',
      'ALTER TABLE subscriptions DISABLE ROW LEVEL SECURITY;',
    ];

    for (const query of queries) {
      await client.query(query);
      console.log('✅ ' + query);
    }

    console.log('\n🎉 RLS disabled for testing\n');
    console.log('Try logging in now: http://localhost:5174\n');
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await client.end();
  }
}

fixRLS();
