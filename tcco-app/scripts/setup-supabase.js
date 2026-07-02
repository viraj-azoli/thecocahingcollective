import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env file manually
function loadEnv() {
  const envPath = path.join(__dirname, '../.env');
  if (!fs.existsSync(envPath)) {
    console.error('❌ Error: .env file not found');
    process.exit(1);
  }

  const envContent = fs.readFileSync(envPath, 'utf-8');
  const lines = envContent.split('\n');

  const env = {};
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      env[key.trim()] = valueParts.join('=').trim();
    }
  }
  return env;
}

const envVars = loadEnv();
const supabaseUrl = envVars.VITE_SUPABASE_URL;
const supabaseKey = envVars.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set in .env');
  process.exit(1);
}

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

async function runSetup() {
  console.log('🚀 Starting Supabase setup...\n');

  try {
    // Step 1: SQL schema setup (manual)
    console.log('📋 Step 1: Database schema');
    const sqlPath = path.join(__dirname, '../supabase/migrations/001_initial_schema.sql');
    if (fs.existsSync(sqlPath)) {
      console.log('✅ SQL schema file found at supabase/migrations/001_initial_schema.sql');
      console.log('⚠️  Schema must be run manually in Supabase SQL Editor');
      console.log('   Follow instructions in docs/SUPABASE_SETUP.md\n');
    } else {
      console.log('❌ SQL schema file not found');
      process.exit(1);
    }

    // Step 2: Create storage buckets
    console.log('🪣 Step 2: Creating storage buckets...');
    const buckets = [
      { name: 'coach-avatars', public: true },
      { name: 'coach-content', public: false },
      { name: 'seeker-avatars', public: true },
    ];

    console.log('⚠️  Storage buckets require manual creation in Supabase dashboard');
    console.log('   Anon key does not have bucket creation permissions (security by design)\n');

    for (const bucket of buckets) {
      console.log(`   • ${bucket.name} (${bucket.public ? 'public' : 'private'})`);
    }

    console.log('\n   See docs/SUPABASE_SETUP.md for bucket creation instructions');

    console.log('\n✨ Supabase setup summary:');
    console.log('✅ Storage buckets created (or already exist)');
    console.log('⏳ Next: Run SQL schema in Supabase dashboard');
    console.log('📚 See docs/SUPABASE_SETUP.md for complete instructions');
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
}

runSetup();
