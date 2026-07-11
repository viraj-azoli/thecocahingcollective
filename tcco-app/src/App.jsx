import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { useAuth } from './auth/useAuth';

// Auth pages (small, load eagerly)
import Login        from './components/Auth/Login';
import SignUp       from './components/Auth/SignUp';
import AuthCallback from './components/Auth/AuthCallback';
import ResetPassword from './components/Auth/ResetPassword';

// Onboarding
import SeekerOnboarding from './components/Seeker/SeekerOnboarding';
import CoachOnboarding  from './components/Coach/CoachOnboarding';
import AdminOnboarding  from './components/Admin/AdminOnboarding';

// Seeker pages
import SeekerDashboard  from './components/Seeker/SeekerDashboard';
import CoachesPage      from './components/Seeker/CoachesPage';
import CoachProfilePage from './components/Seeker/CoachProfilePage';
import SessionsPage     from './components/Seeker/SessionsPage';
import JournalPage      from './components/Seeker/JournalPage';
import LibraryPage      from './components/Seeker/LibraryPage';
import ProgressPage     from './components/Seeker/ProgressPage';
import CommunityPage    from './components/Seeker/CommunityPage';
import SettingsPage     from './components/Seeker/SettingsPage';
import FavouritesPage   from './components/Seeker/FavouritesPage';

// Coach pages
import CoachDashboard    from './components/Coach/CoachDashboard';
import ClientsPage       from './components/Coach/ClientsPage';
import CoachSessionsPage from './components/Coach/CoachSessionsPage';
import ContentPage       from './components/Coach/ContentPage';
import AvailabilityPage  from './components/Coach/AvailabilityPage';
import EarningsPage      from './components/Coach/EarningsPage';
import IntakeFormsPage   from './components/Coach/IntakeFormsPage';
import PackagesPage      from './components/Coach/PackagesPage';
import CoachSettingsPage from './components/Coach/CoachSettingsPage';

// Admin pages
import AdminDashboard      from './components/Admin/AdminDashboard';
import AdminCoachesPage    from './components/Admin/AdminCoachesPage';
import AdminSeekersPage    from './components/Admin/AdminSeekersPage';
import AdminAnalyticsPage  from './components/Admin/AdminAnalyticsPage';
import AdminSessionsPage   from './components/Admin/AdminSessionsPage';
import AdminContentPage    from './components/Admin/AdminContentPage';

// Shared pages
import MessagesPage from './components/shared/MessagesPage';

import './App.css';

function RootRedirect() {
  const { user, userProfile, loading } = useAuth();
  if (loading) return <div className="spinner" style={{ margin: '40vh auto' }} />;
  if (!user || !userProfile) return <Navigate to="/login" replace />;
  const dashboards = { seeker: '/dashboard', coach: '/coach/dashboard', admin: '/admin/dashboard' };
  return <Navigate to={dashboards[userProfile.user_type] || '/login'} replace />;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login"          element={<Login />} />
      <Route path="/signup"         element={<SignUp />} />
      <Route path="/auth/callback"  element={<AuthCallback />} />
      <Route path="/auth/reset"     element={<ResetPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Onboarding */}
      <Route path="/onboarding-seeker" element={<ProtectedRoute requiredRole="seeker"><SeekerOnboarding /></ProtectedRoute>} />
      <Route path="/onboarding-coach"  element={<ProtectedRoute requiredRole="coach"><CoachOnboarding /></ProtectedRoute>} />
      <Route path="/onboarding-admin"  element={<ProtectedRoute requiredRole="admin"><AdminOnboarding /></ProtectedRoute>} />

      {/* Seeker routes */}
      <Route path="/dashboard"    element={<ProtectedRoute requiredRole="seeker"><SeekerDashboard /></ProtectedRoute>} />
      <Route path="/coaches"      element={<ProtectedRoute requiredRole="seeker"><CoachesPage /></ProtectedRoute>} />
      <Route path="/coaches/:id"  element={<ProtectedRoute requiredRole="seeker"><CoachProfilePage /></ProtectedRoute>} />
      <Route path="/sessions"     element={<ProtectedRoute requiredRole="seeker"><SessionsPage /></ProtectedRoute>} />
      <Route path="/journal"      element={<ProtectedRoute requiredRole="seeker"><JournalPage /></ProtectedRoute>} />
      <Route path="/journal/new"  element={<ProtectedRoute requiredRole="seeker"><JournalPage /></ProtectedRoute>} />
      <Route path="/library"      element={<ProtectedRoute requiredRole="seeker"><LibraryPage /></ProtectedRoute>} />
      <Route path="/progress"     element={<ProtectedRoute requiredRole="seeker"><ProgressPage /></ProtectedRoute>} />
      <Route path="/community"    element={<ProtectedRoute requiredRole="seeker"><CommunityPage /></ProtectedRoute>} />
      <Route path="/messages"     element={<ProtectedRoute requiredRole="seeker"><MessagesPage role="seeker" /></ProtectedRoute>} />
      <Route path="/settings"     element={<ProtectedRoute requiredRole="seeker"><SettingsPage /></ProtectedRoute>} />
      <Route path="/favourites"   element={<ProtectedRoute requiredRole="seeker"><FavouritesPage /></ProtectedRoute>} />

      {/* Coach routes */}
      <Route path="/coach/dashboard"    element={<ProtectedRoute requiredRole="coach"><CoachDashboard /></ProtectedRoute>} />
      <Route path="/coach/clients"      element={<ProtectedRoute requiredRole="coach"><ClientsPage /></ProtectedRoute>} />
      <Route path="/coach/sessions"     element={<ProtectedRoute requiredRole="coach"><CoachSessionsPage /></ProtectedRoute>} />
      <Route path="/coach/content"      element={<ProtectedRoute requiredRole="coach"><ContentPage /></ProtectedRoute>} />
      <Route path="/coach/availability" element={<ProtectedRoute requiredRole="coach"><AvailabilityPage /></ProtectedRoute>} />
      <Route path="/coach/earnings"     element={<ProtectedRoute requiredRole="coach"><EarningsPage /></ProtectedRoute>} />
      <Route path="/coach/intake"       element={<ProtectedRoute requiredRole="coach"><IntakeFormsPage /></ProtectedRoute>} />
      <Route path="/coach/packages"     element={<ProtectedRoute requiredRole="coach"><PackagesPage /></ProtectedRoute>} />
      <Route path="/coach/messages"     element={<ProtectedRoute requiredRole="coach"><MessagesPage role="coach" /></ProtectedRoute>} />
      <Route path="/coach/settings"     element={<ProtectedRoute requiredRole="coach"><CoachSettingsPage /></ProtectedRoute>} />

      {/* Admin routes */}
      <Route path="/admin/dashboard"  element={<ProtectedRoute requiredRole="admin"><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/analytics"  element={<ProtectedRoute requiredRole="admin"><AdminAnalyticsPage /></ProtectedRoute>} />
      <Route path="/admin/coaches"    element={<ProtectedRoute requiredRole="admin"><AdminCoachesPage /></ProtectedRoute>} />
      <Route path="/admin/seekers"    element={<ProtectedRoute requiredRole="admin"><AdminSeekersPage /></ProtectedRoute>} />
      <Route path="/admin/sessions"   element={<ProtectedRoute requiredRole="admin"><AdminSessionsPage /></ProtectedRoute>} />
      <Route path="/admin/content"    element={<ProtectedRoute requiredRole="admin"><AdminContentPage /></ProtectedRoute>} />

      {/* Root & catch-all */}
      <Route path="/" element={<RootRedirect />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <Router basename="/app">
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}

export default App;
