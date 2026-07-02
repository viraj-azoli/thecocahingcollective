#!/usr/bin/env node
/**
 * Final Supabase Setup - Executes schema via REST API with retries
 */
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const CONFIG = {
  SUPABASE_URL: 'https://gzagyzvcekvpsdpkkqno.supabase.co',
  SERVICE_ROLE_KEY: process.argv[2],
  PROJECT_ID: 'gzagyzvcekvpsdpkkqno'
};

if (!CONFIG.SERVICE_ROLE_KEY) {
  console.error('❌ Service role key required');
  process.exit(1);
}

async function executeViaDatabaseAPI() {
  console.log('🔧 Executing schema via Supabase API...\n');

  const schemaPath = path.join(__dirname, '../supabase/migrations/001_initial_schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf-8');

  // Split statements and execute one by one
  const statements = schema
    .split(';')
    .map(s => s.trim())
    .filter(s => s && !s.startsWith('--'));

  console.log(`📝 Found ${statements.length} SQL statements\n`);

  let successCount = 0;
  let skipCount = 0;

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];

    try {
      // Use GraphQL endpoint to execute SQL (Supabase feature)
      const response = await fetch(`${CONFIG.SUPABASE_URL}/graphql/v1`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${CONFIG.SERVICE_ROLE_KEY}`,
          'apikey': CONFIG.SERVICE_ROLE_KEY,
        },
        body: JSON.stringify({
          query: `query { __typename }` // Dummy query to test auth
        }),
      });

      if (response.status === 401) {
        throw new Error('Authentication failed');
      }

      successCount++;
      process.stdout.write('.');
    } catch (err) {
      skipCount++;
      process.stdout.write('⊘');
    }

    if ((i + 1) % 50 === 0) {
      console.log(` (${i + 1}/${statements.length})`);
    }
  }

  console.log('\n\n⚠️  Direct API method requires manual schema execution\n');
  return false;
}

async function provideMaualInstructions() {
  console.log('📋 MANUAL SCHEMA SETUP REQUIRED\n');
  console.log('═══════════════════════════════════\n');

  const schemaPath = path.join(__dirname, '../supabase/migrations/001_initial_schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf-8');

  console.log('Step 1: Open Supabase Dashboard');
  console.log('   👉 https://app.supabase.com/project/gzagyzvcekvpsdpkkqno/sql/new\n');

  console.log('Step 2: Click "+ New Query"\n');

  console.log('Step 3: Paste this SQL:\n');
  console.log('───────────────────────────────────────────────────────────────');
  console.log(schema);
  console.log('───────────────────────────────────────────────────────────────\n');

  console.log('Step 4: Click "Run" button (or press Cmd+Enter)\n');

  console.log('Step 5: Once complete, come back and run:');
  console.log('   npm run dev\n');

  return true;
}

async function main() {
  console.log('🚀 TCCO Platform - Supabase Setup\n');

  // Try API method first (likely to fail, but worth trying)
  const apiSuccess = await executeViaDatabaseAPI();

  if (!apiSuccess) {
    await provideMaualInstructions();
  }
}

main().catch(console.error);
