#!/usr/bin/env node
/**
 * Full Flow Test
 * Simulates what the app will do when a user logs in and accesses the dashboard
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://gzagyzvcekvpsdpkkqno.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6YWd5enZjZWt2cHNkcGtrcW5vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3MzE1NTUsImV4cCI6MjA5NDMwNzU1NX0.jusPYod4RBzdE3A24kvHgRp8s8uOkiRavFm81aVpy_8'
);

async function testFullFlow() {
  console.log('🧪 Testing Full Authentication & Dashboard Flow\n');
  console.log('═══════════════════════════════════════════\n');

  try {
    // Step 1: Login
    console.log('1️⃣  Login as seeker@test.com...');
    const { data: { user, session }, error: loginError } = await supabase.auth.signInWithPassword({
      email: 'seeker@test.com',
      password: 'password123'
    });

    if (loginError) throw loginError;
    console.log(`✅ Login successful`);
    console.log(`   User ID: ${user.id}`);
    console.log(`   Email: ${user.email}\n`);

    // Step 2: Check public user record
    console.log('2️⃣  Checking public user record...');
    const { data: publicUser, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (userError) throw userError;
    console.log(`✅ Public user found`);
    console.log(`   User Type: ${publicUser.user_type}\n`);

    // Step 3: Fetch seeker profile (what SeekerDashboard does on mount)
    console.log('3️⃣  Fetching seeker profile...');
    const { data: seekerProfiles, error: profileError } = await supabase
      .from('seeker_profiles')
      .select('*')
      .eq('user_id', user.id);

    if (profileError) throw profileError;

    if (!seekerProfiles || seekerProfiles.length === 0) {
      throw new Error('No seeker profile found');
    }

    const seekerProfile = seekerProfiles[0];
    console.log(`✅ Seeker profile found`);
    console.log(`   Name: ${seekerProfile.name}`);
    console.log(`   Tier: ${seekerProfile.tier}`);
    console.log(`   Sessions Completed: ${seekerProfile.sessions_completed}\n`);

    // Step 4: Fetch sessions (what SeekerDashboard does)
    console.log('4️⃣  Fetching sessions...');
    const { data: sessions, error: sessionsError } = await supabase
      .from('sessions')
      .select('*, coach:coach_profiles(name, title)')
      .eq('seeker_id', seekerProfile.id)
      .in('status', ['scheduled', 'in_progress']);

    if (sessionsError) throw sessionsError;
    console.log(`✅ Sessions fetched`);
    console.log(`   Count: ${(sessions || []).length}\n`);

    // Step 5: Fetch verified coaches (what SeekerDashboard does)
    console.log('5️⃣  Fetching verified coaches...');
    const { data: coaches, error: coachesError } = await supabase
      .from('coach_profiles')
      .select('*')
      .eq('verified', true)
      .limit(10);

    if (coachesError) throw coachesError;
    console.log(`✅ Coaches fetched`);
    console.log(`   Count: ${(coaches || []).length}`);
    if (coaches && coaches.length > 0) {
      console.log(`   First coach: ${coaches[0].name}\n`);
    } else {
      console.log();
    }

    // Summary
    console.log('═══════════════════════════════════════════');
    console.log('✅ FULL FLOW TEST PASSED!\n');
    console.log('📝 What should happen now:');
    console.log('   1. Open http://localhost:5175 in browser');
    console.log('   2. You should see the login page');
    console.log('   3. Login with seeker@test.com / password123');
    console.log('   4. You should be redirected to /dashboard');
    console.log('   5. Dashboard should show:');
    console.log('      - Welcome message with seeker name');
    console.log('      - Stats (sessions, streak, mood)');
    console.log('      - Tabs: Overview, Find Coaches, My Sessions, Journal');
    console.log('      - Quick stats cards');
    console.log('   6. Coaches section should show test coach\n');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  }
}

testFullFlow();
