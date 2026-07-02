import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/useAuth';

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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#F4EFE6', gap: '12px' }}>
      <div className="spinner" />
      <p style={{ fontFamily: 'Georgia,serif', color: '#12372A' }}>Signing you in…</p>
    </div>
  );
}
