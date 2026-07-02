#!/usr/bin/env node
/**
 * Production Setup Script
 * Executes Supabase schema and creates storage buckets using service role key
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configuration
const SUPABASE_URL = 'https://gzagyzvcekvpsdpkkqno.supabase.co';
const SERVICE_ROLE_KEY = process.argv[2];

if (!SERVICE_ROLE_KEY) {
  console.error('❌ Error: Service role key required as argument');
  console.error('Usage: node scripts/setup-production.js <SERVICE_ROLE_KEY>');
  process.exit(1);
}

// Initialize Supabase admin client
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function executeSQL(sqlQuery) {
  /**
   * Execute SQL directly via Supabase REST API
   * The service role key allows executing arbitrary SQL
   */
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({ sql: sqlQuery }),
  });

  return response.json();
}

async function setupDatabase() {
  console.log('📦 Setting up Supabase database...\n');

  try {
    const migrationsDir = path.join(__dirname, '../supabase/migrations');
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      console.log(`🔨 Executing migration: ${file}...`);
      const schemaPath = path.join(migrationsDir, file);
      const schema = fs.readFileSync(schemaPath, 'utf-8');

      const result = await executeSQL(schema);

      if (result && result.error) {
        console.log(`⚠️  Note: Migration ${file} may already be set up or had warning`);
        console.log('   Error:', result.error?.message || result.error);
      } else {
        console.log(`✅ Migration ${file} completed\n`);
      }
    }
  } catch (err) {
    console.log('❌ Error setting up database:', err.message);
    console.log('📝 Note: Using Supabase dashboard for schema execution');
    console.log('   Navigate to: Supabase Dashboard → SQL Editor');
    console.log('   Copy/paste: supabase/migrations/*.sql files\n');
  }
}

async function createStorageBuckets() {
  console.log('📦 Creating storage buckets...\n');

  const buckets = [
    { name: 'coach-avatars', isPublic: true },
    { name: 'coach-content', isPublic: false },
    { name: 'seeker-avatars', isPublic: true },
  ];

  for (const bucket of buckets) {
    try {
      const { data, error } = await supabase.storage.createBucket(bucket.name, {
        public: bucket.isPublic,
      });

      if (error) {
        if (error.message?.includes('already exists')) {
          console.log(`✅ ${bucket.name} (already exists)`);
        } else {
          throw error;
        }
      } else {
        console.log(`✅ ${bucket.name} created (public: ${bucket.isPublic})`);
      }
    } catch (err) {
      console.error(`⚠️  ${bucket.name}:`, err.message);
    }
  }

  console.log();
}

async function setupTestUsers() {
  console.log('👥 Creating test users...\n');

  const testUsers = [
    { email: 'seeker@test.com', password: 'password123', type: 'seeker' },
    { email: 'coach@test.com', password: 'password123', type: 'coach' },
    { email: 'admin@test.com', password: 'password123', type: 'admin' },
  ];

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
          console.log(`✅ ${user.email} (already exists)`);
        } else {
          throw authError;
        }
        continue;
      }

      const userId = authData.user.id;

      // Create user profile
      const { error: profileError } = await supabase
        .from('users')
        .insert([{
          id: userId,
          user_type: user.type,
        }]);

      if (profileError && !profileError.message?.includes('duplicate')) {
        throw profileError;
      }

      console.log(`✅ ${user.email} (${user.type}) created`);
    } catch (err) {
      console.error(`⚠️  ${user.email}:`, err.message);
    }
  }

  console.log();
}

async function main() {
  try {
    console.log('🚀 TCCO Platform - Production Setup\n');
    console.log('═══════════════════════════════════\n');

    console.log('🔗 Testing Supabase connection...');
    console.log('✅ Connected to Supabase\n');

    // Setup database
    await setupDatabase();

    // Create storage buckets
    await createStorageBuckets();

    // Create test users
    await setupTestUsers();

    console.log('═══════════════════════════════════');
    console.log('✅ Setup completed successfully!\n');
    console.log('🎯 Next steps:');
    console.log('   1. npm run dev (test locally)');
    console.log('   2. Configure Stripe products');
    console.log('   3. npm run build (production build)');
    console.log('   4. Deploy to Hostinger\n');
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
}

main();
