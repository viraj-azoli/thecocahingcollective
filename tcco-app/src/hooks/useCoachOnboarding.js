import { useState } from 'react';
import { supabase } from '../lib/supabase';

const COACH_SPECIALTIES = [
  { value: 'burnout', label: 'Burnout & Recovery' },
  { value: 'relationships', label: 'Relationships' },
  { value: 'performance', label: 'Performance & Productivity' },
  { value: 'wellness', label: 'Wellness & Lifestyle' },
  { value: 'career', label: 'Career & Purpose' },
  { value: 'anxiety', label: 'Anxiety & Mental Health' },
  { value: 'leadership', label: 'Leadership' },
];

const SESSION_TYPES = [
  { value: '1-on-1', label: '1-on-1 Sessions' },
  { value: 'group', label: 'Group Sessions' },
  { value: 'workshop', label: 'Workshops' },
];

const EXPERIENCE_LEVELS = [
  { value: 'beginner', label: '0-2 years' },
  { value: 'intermediate', label: '2-5 years' },
  { value: 'advanced', label: '5+ years' },
];

export function useCoachOnboarding(userId) {
  const [profileData, setProfileData] = useState({
    name: '',
    title: '',
    bio: '',
    specialties: [],
    session_types: [],
    experience_level: '',
    price_per_session: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);

  const updateField = (field, value) => {
    setProfileData(prev => ({ ...prev, [field]: value }));
  };

  const updateSpecialties = (specialty) => {
    setProfileData(prev => {
      const specialties = prev.specialties.includes(specialty)
        ? prev.specialties.filter(s => s !== specialty)
        : [...prev.specialties, specialty];
      return { ...specialties };
    });
  };

  const updateSessionTypes = (sessionType) => {
    setProfileData(prev => {
      const session_types = prev.session_types.includes(sessionType)
        ? prev.session_types.filter(s => s !== sessionType)
        : [...prev.session_types, sessionType];
      return { ...prev, session_types };
    });
  };

  const validateStep = (step) => {
    switch (step) {
      case 0: // Basic info
        return profileData.name && profileData.title;
      case 1: // About
        return profileData.bio && profileData.specialties.length > 0;
      case 2: // Services
        return profileData.session_types.length > 0 && profileData.price_per_session;
      case 3: // Review
        return true;
      default:
        return false;
    }
  };

  const saveProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: insertError } = await supabase
        .from('coach_profiles')
        .insert([{
          user_id: userId,
          name: profileData.name,
          title: profileData.title,
          bio: profileData.bio,
          specialties: profileData.specialties,
          session_types: profileData.session_types,
          price_per_session: parseFloat(profileData.price_per_session),
        }])
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
    profileData,
    updateField,
    updateSpecialties,
    updateSessionTypes,
    currentStep,
    setCurrentStep,
    saveProfile,
    loading,
    error,
    validateStep,
    COACH_SPECIALTIES,
    SESSION_TYPES,
    EXPERIENCE_LEVELS,
  };
}
