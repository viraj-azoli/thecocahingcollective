#!/usr/bin/env node
/**
 * Setup test user and profile
 * Creates auth user and public user record with seeker profile
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://gzagyzvcekvpsdpkkqno.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6YWd5enZjZWt2cHNkcGtrcW5vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3MzE1NTUsImV4cCI6MjA5NDMwNzU1NX0.jusPYod4RBzdE3A24kvHgRp8s8uOkiRavFm81aVpy_8'
);

async function setupTestUser() {
  console.log('🚀 Setting up test user...\n');

  try {
    // Step 1: Sign up test user
    console.log('1️⃣  Creating auth user (seeker@test.com)...');
    const { data: authUser, error: signupError } = await supabase.auth.signUp({
      email: 'seeker@test.com',
      password: 'password123'
    });

    if (signupError) {
      console.log(`⚠️  Auth signup error (might already exist): ${signupError.message}`);
    } else {
      console.log(`✅ Auth user created: ${authUser?.user?.id}\n`);
    }

    // Login to get the user
    console.log('2️⃣  Logging in...');
    const { data: { user }, error: loginError } = await supabase.auth.signInWithPassword({
      email: 'seeker@test.com',
      password: 'password123'
    });

    if (loginError) throw loginError;
    console.log(`✅ Logged in as: ${user.id}\n`);

    // Step 2: Create public.users record
    console.log('3️⃣  Creating public user record...');
    const { data: publicUser, error: userError } = await supabase
      .from('users')
      .insert([{ id: user.id, user_type: 'seeker' }])
      .select()
      .single();

    if (userError) {
      if (userError.message.includes('duplicate')) {
        console.log(`⚠️  User already exists\n`);
      } else {
        throw userError;
      }
    } else {
      console.log(`✅ Public user created\n`);
    }

    // Step 3: Create seeker_profiles record
    console.log('4️⃣  Creating seeker profile...');
    const { data: profile, error: profileError } = await supabase
      .from('seeker_profiles')
      .insert([{
        user_id: user.id,
        name: 'Test Seeker',
        tier: 'Discovery',
        mood_average: 3.5,
        day_streak: 7,
        sessions_completed: 3,
        onboarding_quiz: {
          goals: ['Personal growth'],
          specialties: ['Life coaching'],
          experience_level: 'Beginner'
        },
        preferences: {
          specialties: ['Personal growth', 'Leadership'],
          preferred_format: ['1-on-1']
        }
      }])
      .select()
      .single();

    if (profileError) {
      if (profileError.message.includes('duplicate')) {
        console.log(`⚠️  Profile already exists\n`);
      } else {
        throw profileError;
      }
    } else {
      console.log(`✅ Seeker profile created\n`);
    }

    // Step 4: Create a few test coaches
    console.log('5️⃣  Creating test coaches...');
    const { data: coach1, error: coach1Error } = await supabase
      .from('users')
      .insert([{ user_type: 'coach' }])
      .select()
      .single();

    if (!coach1Error && coach1) {
      const { error: coachProfileError } = await supabase
        .from('coach_profiles')
        .insert([{
          user_id: coach1.id,
          name: 'Sarah Coach',
          title: 'Life & Career Coach',
          bio: 'I help professionals navigate career transitions and build meaningful lives.',
          specialties: ['Career', 'Life balance'],
          price_per_session: 79,
          rating: 4.8,
          verified: true,
          languages: ['English', 'Spanish']
        }])
        .select()
        .single();

      if (!coachProfileError) {
        console.log(`✅ Coach 1 created: Sarah Coach\n`);
      }
    }

    console.log('═══════════════════════════════════════════');
    console.log('✅ Test user setup complete!\n');
    console.log('📝 Login credentials:');
    console.log('   Email: seeker@test.com');
    console.log('   Password: password123\n');
    console.log('🌐 Test at: http://localhost:5174 or http://localhost:5175\n');

  } catch (error) {
    console.error('❌ Setup error:', error.message);
    process.exit(1);
  }
}

setupTestUser();
