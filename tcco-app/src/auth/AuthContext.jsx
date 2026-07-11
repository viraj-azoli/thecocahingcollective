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
    let cancelled = false;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
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

    return () => { cancelled = true; subscription.unsubscribe(); };
  }, []);

  const fetchUserProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        // No row in public.users — not fatal, app works without it
        // Profile will be null; seeker/coach profiles reference user_id directly
        setUserProfile(null);
        return null;
      }

      setUserProfile(data);
      return data;
    } catch (err) {
      // Silently ignore — the app works without a public.users row
      setUserProfile(null);
      return null;
    }
  };

  const signup = async (email, password, userType) => {
    setError(null);
    const { data: { user }, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { user_type: userType } }
    });
    if (error) { setError(error.message); throw error; }
    if (!user) {
      // Email confirmation required — user not yet active
      return null;
    }

    // Create the public.users row (fire-and-forget — ignore RLS errors)
    supabase.from('users').insert({ id: user.id, user_type: userType })
      .then(({ data }) => data && setUserProfile(data))
      .catch(() => {/* RLS may block — not critical */});

    // Fire-and-forget welcome email
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
    // Fetch profile non-blocking — login succeeds regardless
    const profile = await fetchUserProfile(user.id);
    identify(user.id, { email, role: profile?.user_type });
    track('user_logged_in', { method: 'email' });
    return { user, profile };
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
    if (!userProfile?.id) {
      // No public.users row — create one
      const { data, error } = await supabase
        .from('users')
        .insert({ id: user.id, ...updates })
        .select()
        .single();
      if (error) throw error;
      setUserProfile(data);
      return data;
    }
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single();
    if (error) throw error;
    setUserProfile(data);
    return data;
  };

  return (
    <AuthContext.Provider value={{
      user, userProfile, loading, error,
      signup, login, loginWithGoogle, logout,
      resetPassword, updatePassword, updateProfile, fetchUserProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
}