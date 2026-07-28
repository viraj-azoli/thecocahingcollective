import { useState } from 'react';
import { supabase } from '../lib/supabase';

const QUIZ_OPTIONS = {
  brings_you_here: [
    { value: 'burnout', label: 'Burnout' },
    { value: 'relationships', label: 'Relationships' },
    { value: 'performance', label: 'Performance' },
    { value: 'sleep', label: 'Sleep & Rest' },
    { value: 'anxiety', label: 'Anxiety' },
    { value: 'other', label: 'Something else' },
  ],
  preferred_format: [
    { value: '1-on-1', label: '1-on-1 sessions' },
    { value: 'group', label: 'Group sessions' },
    { value: 'self-guided', label: 'Self-guided content' },
  ],
  coaching_experience: [
    { value: 'first-timer', label: 'First time with coaching' },
    { value: 'experienced', label: 'I\'ve worked with coaches before' },
  ],
};

export function useSeekerOnboarding(userId) {
  const [quizAnswers, setQuizAnswers] = useState({});
  const [selectedTier, setSelectedTier] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Not currently called anywhere — onboarding starts everyone on Discovery
  // and they upgrade through checkout. Kept in sync with the real tier names
  // so it can't reintroduce the retired 'Connection' value if it's ever wired
  // up: that tier isn't sold and is rejected by the database CHECK.
  const recommendTier = (answers) => {
    return answers.coaching_experience === 'first-timer' ? 'Discovery' : 'Growth';
  };

  const updateQuizAnswer = (question, value) => {
    setQuizAnswers(prev => ({ ...prev, [question]: value }));
  };

  const saveProfile = async (profileData) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: insertError } = await supabase
        .from('seeker_profiles')
        .upsert({
          user_id: userId,
          name: profileData.name,
          tier: profileData.tier || selectedTier || 'Discovery',
          onboarding_quiz: quizAnswers,
          preferences: {
            specialties: [quizAnswers.brings_you_here],
            preferred_format: quizAnswers.preferred_format,
          },
        }, { onConflict: 'user_id' })
        .select()
        .single();

      if (insertError) throw insertError;
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    quizAnswers,
    updateQuizAnswer,
    recommendTier,
    selectedTier,
    setSelectedTier,
    saveProfile,
    loading,
    error,
    QUIZ_OPTIONS,
  };
}
