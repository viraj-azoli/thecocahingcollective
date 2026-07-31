import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/useAuth';
import { StatusScreen } from '../../ui';

export default function AuthCallback() {
  const navigate = useNavigate();
  const { user, userProfile, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate('/login'); return; }
    if (!userProfile) { navigate('/signup?oauth=true'); return; }
    const map = { seeker: '/dashboard', coach: '/coach/dashboard', admin: '/admin/dashboard' };
    navigate(map[userProfile.user_type] || '/dashboard');
  }, [loading, user, userProfile, navigate]);

  // This used the .spinner class from AppLayout.css, a stylesheet that is not
  // loaded on auth routes — so the spinner never actually rendered here.
  return <StatusScreen icon="spinner" spinning title="Signing you in…" />;
}
