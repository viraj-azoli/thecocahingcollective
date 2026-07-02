import React, { createContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { track, identify, reset } from '../lib/analytics';

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser]               = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);

  useEffect(() => {
    // Dev bypass: check for localStorage dev flags
    const devBypass = localStorage.getItem('TCCO_DEV_BYPASS') === 'true';
    const coachBypass = localStorage.getItem('TCCO_DEV_BYPASS_COACH') === 'true';

    if (devBypass) {
      // Mock a test seeker for dev browsing
      const mockUserId = '00000000-0000-0000-0000-000000000001';
      setUser({
        id: mockUserId,
        email: 'dev@test.local',
      });
      setUserProfile({
        id: '00000000-0000-0000-0000-000000000001',
        user_id: mockUserId,
        user_type: 'seeker',
        name: 'Dev User',
        tier: 'Growth',
      });
      setLoading(false);
      return;
    }

    if (coachBypass) {
      // Mock a test coach for dev browsing
      const mockCoachId = '00000000-0000-0000-0000-000000000002';
      setUser({
        id: mockCoachId,
        email: 'coach@test.local',
      });
      setUserProfile({
        id: '00000000-0000-0000-0000-000000000002',
        user_id: mockCoachId,
        user_type: 'coach',
        name: 'Dev Coach',
      });
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        fetchUserProfile(session.user.id);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user);
        await fetchUserProfile(session.user.id);
      } else {
        setUser(null);
        setUserProfile(null);
      }
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (userId) => {
    const { data } = await supabase.from('users').select('*').eq('id', userId).single();
    setUserProfile(data || null);
    return data;
  };

  const signup = async (email, password, userType) => {
    setError(null);
    const { data: { user }, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          user_type: userType
        }
      }
    });
    if (error) { setError(error.message); throw error; }
    if (!user) {
      // Email confirmation is required — user is not yet active
      return null;
    }

    // Fire-and-forget welcome email — don't block signup on email failure
    supabase.functions.invoke('send-email', {
      body: {
        to: email,
        template: userType === 'seeker' ? 'welcome_seeker' : 'welcome_coach',
        data: { name: email.split('@')[0], appUrl: window.location.origin },
      },
    }).catch(() => {/* non-blocking */});

    track('user_signed_up', { role: userType });
    identify(user.id, { email, role: userType });

    return user;
  };

  const login = async (email, password) => {
    setError(null);
    const { data: { user }, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setError(error.message); throw error; }
    const profile = await fetchUserProfile(user.id);
    identify(user.id, { email, role: profile?.user_type });
    track('user_logged_in', { method: 'email' });
    return user;
  };

  const loginWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) { setError(error.message); throw error; }
  };

  const logout = async () => {
    track('user_logged_out');
    await supabase.auth.signOut();
    reset();
    setUser(null);
    setUserProfile(null);
  };

  const resetPassword = async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset`,
    });
    if (error) { setError(error.message); throw error; }
  };

  const updatePassword = async (newPassword) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) { setError(error.message); throw error; }
  };

  const updateProfile = async (updates) => {
    const { data, error } = await supabase.from('users').update(updates).eq('id', user.id).select().single();
    if (error) { setError(error.message); throw error; }
    setUserProfile(data);
    return data;
  };

  return (
    <AuthContext.Provider value={{ user, userProfile, loading, error, signup, login, loginWithGoogle, logout, resetPassword, updatePassword, updateProfile, fetchUserProfile }}>
      {children}
    </AuthContext.Provider>
  );
}
