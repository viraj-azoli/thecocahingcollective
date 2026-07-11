import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './useAuth';

export function ProtectedRoute({ children, requiredRole = null }) {
  const { user, userProfile, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#F4EFE6' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  // If role required and we know the profile doesn't match, redirect
  if (requiredRole && userProfile && userProfile.user_type !== requiredRole) {
    const redirectMap = { seeker: '/dashboard', coach: '/coach/dashboard', admin: '/admin/dashboard' };
    return <Navigate to={redirectMap[userProfile.user_type] || '/login'} replace />;
  }

  // If role required but profile is null (e.g. public.users row doesn't exist yet),
  // still allow access — the dashboard/onboarding will handle setup
  return children;
}