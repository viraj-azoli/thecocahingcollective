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

  // User authenticated but profile still loading — show spinner instead of redirecting
  if (requiredRole && user && !userProfile) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#F4EFE6' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (requiredRole && userProfile?.user_type && userProfile.user_type !== requiredRole) {
    const redirectMap = { seeker: '/dashboard', coach: '/coach/dashboard', admin: '/admin/dashboard' };
    return <Navigate to={redirectMap[userProfile.user_type] || '/login'} replace />;
  }

  return children;
}
