#!/usr/bin/env node
/**
 * Add test coaches
 * Creates verified coaches for the seeker to browse
 */

import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

const supabase = createClient(
  'https://gzagyzvcekvpsdpkkqno.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6YWd5enZjZWt2cHNkcGtrcW5vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3MzE1NTUsImV4cCI6MjA5NDMwNzU1NX0.jusPYod4RBzdE3A24kvHgRp8s8uOkiRavFm81aVpy_8'
);

async function addTestCoaches() {
  console.log('🚀 Adding test coaches...\n');

  const coaches = [
    {
      name: 'Sarah Coach',
      title: 'Life & Career Coach',
      bio: 'I help professionals navigate career transitions and build meaningful lives.',
      specialties: ['Career', 'Life balance', 'Personal growth'],
      price_per_session: 79,
      rating: 4.8,
      credentials: [
        { name: 'ICF Certification', issuer: 'International Coach Federation' }
      ],
      languages: ['English', 'Spanish']
    },
    {
      name: 'Michael Leadership Coach',
      title: 'Executive Coach',
      bio: 'Specializing in leadership development for emerging executives.',
      specialties: ['Leadership', 'Executive coaching', 'Team dynamics'],
      price_per_session: 150,
      rating: 4.9,
      credentials: [
        { name: 'Executive Coach', issuer: 'Leadership Institute' }
      ],
      languages: ['English', 'French']
    },
    {
      name: 'Emma Wellness Coach',
      title: 'Wellness & Mindfulness Coach',
      bio: 'Helping you build sustainable wellness habits and mindful living practices.',
      specialties: ['Wellness', 'Mindfulness', 'Stress management'],
      price_per_session: 65,
      rating: 4.7,
      credentials: [
        { name: 'Certified Mindfulness Teacher' }
      ],
      languages: ['English']
    }
  ];

  try {
    for (const coach of coaches) {
      // Create auth user for coach
      const firstName = coach.name.split(' ')[0].toLowerCase();
      const email = `${firstName}${Math.random().toString().substring(2, 6)}@test.com`;
      const { data: authCoach, error: authError } = await supabase.auth.signUp({
        email,
        password: 'password123'
      });

      if (authError) throw authError;

      // Create public user record
      const { data: coachUser, error: userError } = await supabase
        .from('users')
        .insert([{ id: authCoach.user.id, user_type: 'coach' }])
        .select()
        .single();

      if (userError) throw userError;

      // Create coach profile
      const { error: profileError } = await supabase
        .from('coach_profiles')
        .insert([{
          user_id: coachUser.id,
          name: coach.name,
          title: coach.title,
          bio: coach.bio,
          specialties: coach.specialties,
          price_per_session: coach.price_per_session,
          rating: coach.rating,
          verified: true,
          credentials: coach.credentials,
          languages: coach.languages
        }])
        .select();

      if (profileError) throw profileError;

      console.log(`✅ Created: ${coach.name} (${coach.title})`);
    }

    console.log('\n═══════════════════════════════════════════');
    console.log('✅ Test coaches added successfully!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

addTestCoaches();
