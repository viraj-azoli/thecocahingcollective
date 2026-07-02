#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://gzagyzvcekvpsdpkkqno.supabase.co',
  process.argv[2] || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6YWd5enZjZWt2cHNkcGtrcW5vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3MzE1NTUsImV4cCI6MjA5NDMwNzU1NX0.jusPYod4RBzdE3A24kvHgRp8s8uOkiRavFm81aVpy_8'
);

async function checkTables() {
  console.log('🔍 Checking Supabase tables...\n');

  // Try to query each expected table
  const tables = [
    'users', 'seeker_profiles', 'coach_profiles', 'sessions',
    'availability', 'content', 'journal_entries', 'messages',
    'subscriptions', 'admin_users', 'transactions'
  ];

  let foundCount = 0;

  for (const table of tables) {
    try {
      const { error } = await supabase
        .from(table)
        .select('count()', { count: 'exact', head: true });

      if (error) {
        if (error.code === 'PGRST205') {
          console.log(`❌ ${table} - NOT FOUND`);
        } else {
          console.log(`❓ ${table} - ERROR: ${error.message}`);
        }
      } else {
        console.log(`✅ ${table}`);
        foundCount++;
      }
    } catch (err) {
      console.log(`❌ ${table} - ERROR: ${err.message}`);
    }
  }

  console.log(`\n${foundCount}/${tables.length} tables found\n`);

  if (foundCount === 0) {
    console.log('⚠️  No tables found! Schema may not have executed.\n');
    console.log('Try this:');
    console.log('1. Refresh: https://app.supabase.com/project/gzagyzvcekvpsdpkkqno');
    console.log('2. Go to SQL Editor');
    console.log('3. Run: SELECT * FROM information_schema.tables WHERE table_schema = \'public\';');
    console.log('4. If no rows, re-execute: supabase/migrations/001_initial_schema.sql\n');
  }
}

checkTables();
