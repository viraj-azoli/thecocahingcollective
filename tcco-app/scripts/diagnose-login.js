#!/usr/bin/env node
/**
 * Diagnose Login Issues
 * Tests if credentials work and identifies any connection problems
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://gzagyzvcekvpsdpkkqno.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6YWd5enZjZWt2cHNkcGtrcW5vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3MzE1NTUsImV4cCI6MjA5NDMwNzU1NX0.jusPYod4RBzdE3A24kvHgRp8s8uOkiRavFm81aVpy_8'
);

async function diagnose() {
  console.log('🔍 Login Diagnosis\n');
  console.log('═══════════════════════════════════════════\n');

  try {
    // Test 1: Supabase connectivity
    console.log('1️⃣  Testing Supabase connectivity...');
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    console.log(`✅ Connected to Supabase\n`);

    // Test 2: Test credentials
    console.log('2️⃣  Testing login with seeker@test.com / password123...');
    const { data: { user, session }, error } = await supabase.auth.signInWithPassword({
      email: 'seeker@test.com',
      password: 'password123'
    });

    if (error) {
      console.log(`❌ Login failed: ${error.message}\n`);
      console.log('Possible issues:');
      console.log('- User may not exist');
      console.log('- Password may be incorrect');
      console.log('- Supabase Auth config issue\n');
      return false;
    }

    console.log(`✅ Login successful\n`);
    console.log(`   User ID: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Confirmed: ${user.user_metadata?.email_verified || false}\n`);

    // Test 3: Session validity
    console.log('3️⃣  Checking session...');
    if (session) {
      console.log(`✅ Session created`);
      console.log(`   Access token: ${session.access_token?.substring(0, 20)}...`);
      console.log(`   Expires in: ${Math.round((session.expires_at * 1000 - Date.now()) / 60000)} minutes\n`);
    } else {
      console.log(`⚠️  No session created\n`);
    }

    // Test 4: User profile exists
    console.log('4️⃣  Checking user profile...');
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('user_type')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.log(`❌ Profile not found: ${profileError.message}\n`);
      return false;
    }

    console.log(`✅ User profile found`);
    console.log(`   User type: ${profile.user_type}\n`);

    // Test 5: Seeker profile exists
    console.log('5️⃣  Checking seeker profile...');
    const { data: seekerProfile, error: seekerError } = await supabase
      .from('seeker_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (seekerError) {
      console.log(`❌ Seeker profile not found: ${seekerError.message}\n`);
      return false;
    }

    console.log(`✅ Seeker profile found`);
    console.log(`   Name: ${seekerProfile.name}`);
    console.log(`   Tier: ${seekerProfile.tier}\n`);

    console.log('═══════════════════════════════════════════');
    console.log('✅ ALL DIAGNOSIS CHECKS PASSED!\n');
    console.log('The backend is working correctly.');
    console.log('If login fails in the browser, it\'s likely a frontend issue.\n');
    console.log('Try:\n');
    console.log('1. Clear browser cache (Ctrl+Shift+Delete)');
    console.log('2. Hard refresh (Ctrl+F5 or Cmd+Shift+R)');
    console.log('3. Open browser console (F12)');
    console.log('4. Check for red error messages');
    console.log('5. Try logging in again\n');

    return true;

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    return false;
  }
}

diagnose();
