#!/usr/bin/env node
/**
 * Direct PostgreSQL Schema Execution
 * Connects directly to Supabase PostgreSQL and executes schema
 */

import pkg from 'pg';
const { Client } = pkg;
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const CONNECTION = {
  host: 'db.gzagyzvcekvpsdpkkqno.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: process.argv[2],
  ssl: { rejectUnauthorized: false }
};

if (!CONNECTION.password) {
  console.error('❌ Password required as argument');
  console.error('Usage: node scripts/execute-schema-direct.js <PASSWORD>');
  process.exit(1);
}

async function executeSchema() {
  const client = new Client(CONNECTION);

  try {
    console.log('🔗 Connecting to Supabase PostgreSQL...');
    await client.connect();
    console.log('✅ Connected\n');

    console.log('📖 Reading schema file...');
    const schemaPath = path.join(__dirname, '../supabase/migrations/001_initial_schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');
    console.log(`✅ Schema loaded (${schema.length} bytes)\n`);

    console.log('🔨 Executing schema...\n');

    // Execute the entire schema as one transaction
    const result = await client.query(schema);

    console.log('✅ Schema executed successfully!\n');

    // Verify tables were created
    console.log('📋 Verifying tables...\n');

    const tables = [
      'users', 'seeker_profiles', 'coach_profiles', 'sessions',
      'availability', 'content', 'content_engagement', 'journal_entries',
      'messages', 'subscriptions', 'admin_users', 'transactions'
    ];

    let foundCount = 0;
    for (const tableName of tables) {
      try {
        const result = await client.query(`SELECT 1 FROM ${tableName} LIMIT 1`);
        console.log(`   ✅ ${tableName}`);
        foundCount++;
      } catch (err) {
        if (err.message.includes('does not exist')) {
          console.log(`   ❌ ${tableName} - NOT CREATED`);
        } else {
          console.log(`   ⚠️  ${tableName} - ${err.message.split('\n')[0]}`);
        }
      }
    }

    console.log(`\n✅ Created ${foundCount}/${tables.length} tables\n`);

    if (foundCount === tables.length) {
      console.log('═══════════════════════════════════════════');
      console.log('🎉 SCHEMA SETUP COMPLETE!\n');
      console.log('📝 Next steps:');
      console.log('   1. Refresh browser: http://localhost:5173');
      console.log('   2. Log in: seeker@test.com / password123');
      console.log('   3. Complete the seeker onboarding\n');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('   Connection refused - check host/port');
    } else if (error.code === '28P01') {
      console.error('   Authentication failed - check password');
    }
    process.exit(1);
  } finally {
    await client.end();
  }
}

executeSchema();
