#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = 'https://gzagyzvcekvpsdpkkqno.supabase.co';
const SERVICE_ROLE_KEY = process.argv[2];

if (!SERVICE_ROLE_KEY) {
  console.error('❌ Service role key required');
  console.error('Usage: node scripts/exec-schema.js <SERVICE_ROLE_KEY>');
  process.exit(1);
}

async function executeSchema() {
  console.log('🔨 Executing Supabase schema...\n');

  try {
    const schemaPath = path.join(__dirname, '../supabase/migrations/001_initial_schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');

    // Try POST to /rest/v1/rpc/sql with the raw SQL
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({ sql: schema }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.log('⚠️  Direct RPC failed, trying alternative method...\n');
      console.log('📝 To complete setup, please manually execute the SQL:');
      console.log('\n1. Go to: https://app.supabase.com/project/gzagyzvcekvpsdpkkqno');
      console.log('2. Click "SQL Editor" in the left sidebar');
      console.log('3. Click "+ New Query"');
      console.log('4. Copy and paste the following SQL:');
      console.log('\n' + '='.repeat(60));
      console.log(schema);
      console.log('='.repeat(60));
      console.log('\n5. Click "Run" button');
      return;
    }

    console.log('✅ Schema executed successfully!\n');

    // Check if tables were created
    console.log('📋 Verifying tables...');
    const checkResponse = await fetch(`${SUPABASE_URL}/rest/v1/rpc/check_tables`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      },
      body: '{}',
    });

    if (checkResponse.ok) {
      console.log('✅ Tables verified\n');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n📝 Manual execution required:');
    console.log('Please go to Supabase Dashboard → SQL Editor');
    console.log('and execute: supabase/migrations/001_initial_schema.sql');
  }
}

executeSchema();
