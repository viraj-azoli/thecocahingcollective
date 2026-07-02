#!/usr/bin/env node
/**
 * Test Complete Login Flow
 * Simulates exactly what happens when user logs in
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://gzagyzvcekvpsdpkkqno.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6YWd5enZjZWt2cHNkcGtrcW5vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3MzE1NTUsImV4cCI6MjA5NDMwNzU1NX0.jusPYod4RBzdE3A24kvHgRp8s8uOkiRavFm81aVpy_8'
);

async function testLoginFlow() {
  console.log('🧪 Testing Complete Login Flow\n');
  console.log('═══════════════════════════════════════════\n');

  try {
    // Step 1: Authenticate with email/password
    console.log('1️⃣  Authenticating with Supabase Auth...');
    const { data: { user }, error: authError } = await supabase.auth.signInWithPassword({
      email: 'seeker@test.com',
      password: 'password123'
    });

    if (authError) {
      console.log(`❌ Authentication failed: ${authError.message}\n`);
      return false;
    }

    console.log(`✅ Authenticated successfully`);
    console.log(`   User ID: ${user.id}`);
    console.log(`   Email: ${user.email}\n`);

    // Step 2: Fetch user profile (exactly what Login.jsx does)
    console.log('2️⃣  Fetching user profile from database...');
    const { data, error: fetchError } = await supabase
      .from('users')
      .select('user_type, id')
      .eq('id', user.id)
      .single();

    if (fetchError) {
      console.log(`❌ Profile fetch failed: ${fetchError.message}\n`);
      return false;
    }

    console.log(`✅ User profile found`);
    console.log(`   User Type: ${data.user_type}`);
    console.log(`   Email: ${data.email}`);
    console.log(`   ID: ${data.id}\n`);

    // Step 3: Determine redirect path based on user_type
    console.log('3️⃣  Determining redirect path...');
    const userType = data.user_type?.toLowerCase();
    let redirectPath = '/';

    if (userType === 'seeker') {
      redirectPath = '/dashboard';
    } else if (userType === 'coach') {
      redirectPath = '/coach/dashboard';
    } else if (userType === 'admin') {
      redirectPath = '/admin/dashboard';
    }

    console.log(`✅ User will be redirected to: ${redirectPath}\n`);

    // Step 4: Verify seeker profile exists (for dashboard data loading)
    if (userType === 'seeker') {
      console.log('4️⃣  Verifying seeker profile exists...');
      const { data: seekerProfile, error: seekerError } = await supabase
        .from('seeker_profiles')
        .select('id, name, tier, day_streak, sessions_completed, mood_average')
        .eq('user_id', user.id)
        .single();

      if (seekerError) {
        console.log(`⚠️  Seeker profile not found: ${seekerError.message}`);
      } else {
        console.log(`✅ Seeker profile loaded`);
        console.log(`   Name: ${seekerProfile.name}`);
        console.log(`   Tier: ${seekerProfile.tier}`);
        console.log(`   Day Streak: ${seekerProfile.day_streak}`);
        console.log(`   Sessions Completed: ${seekerProfile.sessions_completed}\n`);
      }
    }

    // Step 5: Verify coach profile exists (for dashboard data loading)
    if (userType === 'coach') {
      console.log('4️⃣  Verifying coach profile exists...');
      const { data: coachProfile, error: coachError } = await supabase
        .from('coach_profiles')
        .select('id, name, title, avg_rating')
        .eq('user_id', user.id)
        .single();

      if (coachError) {
        console.log(`⚠️  Coach profile not found: ${coachError.message}`);
      } else {
        console.log(`✅ Coach profile loaded`);
        console.log(`   Name: ${coachProfile.name}`);
        console.log(`   Title: ${coachProfile.title}`);
        console.log(`   Avg Rating: ${coachProfile.avg_rating}\n`);
      }
    }

    console.log('═══════════════════════════════════════════');
    console.log('✅ LOGIN FLOW COMPLETE!\n');
    console.log('What happens next:');
    console.log(`1. User redirected to: ${redirectPath}`);
    console.log('2. Dashboard component loads with user data');
    console.log('3. All metrics and cards render\n');
    console.log('Browser testing instructions:');
    console.log('1. Open http://localhost:5176');
    console.log('2. Clear cache (Ctrl+Shift+Delete)');
    console.log('3. Hard refresh (Ctrl+F5 or Cmd+Shift+R)');
    console.log('4. Login with: seeker@test.com / password123');
    console.log('5. Should see Seeker Dashboard\n');

    return true;

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    return false;
  }
}

testLoginFlow();
