import React, { createContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { track, identify, reset } from '../lib/analytics';
import { appBaseUrl } from '../lib/appUrl';

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser]               = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);

  useEffect(() => {
    let active = true;

    async function initAuth() {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;

        if (active && session?.user) {
          setUser(session.user);
          await fetchUserProfile(session.user.id);
        }
      } catch (err) {
        console.error('Session initialization error:', err);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    initAuth();

    // Safety net: whatever the cause (a hung network request, an unexpected
    // Supabase client lock, etc.), never leave the user stuck on the loading
    // spinner indefinitely — force it to resolve after 8s so the app falls
    // through to the login screen instead of hanging forever.
    const watchdog = setTimeout(() => {
      if (active) setLoading(false);
    }, 8000);

    // NOTE: never await Supabase queries directly inside onAuthStateChange —
    // the client holds an internal lock during the callback and awaiting a
    // query here can deadlock (symptom: infinite loading spinner on reload).
    // Defer the profile fetch to the next tick instead.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser(session.user);
        setTimeout(() => {
          fetchUserProfile(session.user.id).finally(() => {
            if (active) setLoading(false);
          });
        }, 0);
      } else {
        setUser(null);
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => {
      active = false;
      clearTimeout(watchdog);
      subscription.unsubscribe();
    };
  }, []);

  const fetchUserProfile = async (userId) => {
    try {
      const { data } = await supabase.from('users').select('*').eq('id', userId).single();
      setUserProfile(data || null);
      return data || null;
    } catch (err) {
      setUserProfile(null);
      return null;
    }
  };

  const signup = async (email, password, userType) => {
    setError(null);

    // If registering as a coach, check if email is in the coach whitelist
    if (userType === 'coach') {
      const { data: whitelistData, error: whitelistErr } = await supabase
        .from('coach_whitelist')
        .select('email')
        .eq('email', email.trim().toLowerCase())
        .maybeSingle();

      if (whitelistErr) {
        setError(whitelistErr.message);
        throw whitelistErr;
      }

      if (!whitelistData) {
        const approvalErr = new Error('This email is not authorized to register as a coach. Please contact the administrator.');
        setError(approvalErr.message);
        throw approvalErr;
      }
    }

    const { data: { user }, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { user_type: userType } }
    });
    if (error) { setError(error.message); throw error; }
    if (!user) return null;

    // Create public.users row (required FK for profiles)
    try {
      const { data: newRow } = await supabase.from('users').insert({ id: user.id, user_type: userType }).select().single();
      if (newRow) setUserProfile(newRow);
    } catch (insertErr) {
      console.warn('Could not create users row:', insertErr.message);
    }

    // Fire-and-forget welcome email
    supabase.functions.invoke('send-email', {
      body: { to: email, template: userType === 'seeker' ? 'welcome_seeker' : 'welcome_coach', data: { name: email.split('@')[0], appUrl: appBaseUrl() } },
    }).catch(() => {});

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
      // No public.users row — create one first
      const userType = user?.user_metadata?.user_type || 'seeker';
      const { data, error } = await supabase.from('users').insert({ id: user.id, user_type: userType, ...updates }).select().single();
      if (error) throw error;
      setUserProfile(data);
      return data;
    }
    const { data, error } = await supabase.from('users').update(updates).eq('id', user.id).select().single();
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