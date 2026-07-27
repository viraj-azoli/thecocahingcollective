import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { useAuth } from './auth/useAuth';

// Auth pages (small, load eagerly — they're the first thing a visitor hits)
import Login        from './components/Auth/Login';
import SignUp       from './components/Auth/SignUp';
import AuthCallback from './components/Auth/AuthCallback';
import ResetPassword from './components/Auth/ResetPassword';

import './App.css';

// Lazy-load a route chunk; if the chunk 404s (stale index.html after a fresh
// deploy replaced the hashed filenames), reload once to pick up the new build.
function lazyPage(importFn) {
  return lazy(() =>
    importFn().then((mod) => {
      sessionStorage.removeItem('tcco-chunk-reload');
      return mod;
    }).catch((err) => {
      if (!sessionStorage.getItem('tcco-chunk-reload')) {
        sessionStorage.setItem('tcco-chunk-reload', '1');
        window.location.reload();
      }
      throw err;
    })
  );
}

// Onboarding
const SeekerOnboarding = lazyPage(() => import('./components/Seeker/SeekerOnboarding'));
const CoachOnboarding  = lazyPage(() => import('./components/Coach/CoachOnboarding'));
const AdminOnboarding  = lazyPage(() => import('./components/Admin/AdminOnboarding'));

// Seeker pages
const SeekerDashboard  = lazyPage(() => import('./components/Seeker/SeekerDashboard'));
const CoachesPage      = lazyPage(() => import('./components/Seeker/CoachesPage'));
const CoachProfilePage = lazyPage(() => import('./components/Seeker/CoachProfilePage'));
const SessionsPage     = lazyPage(() => import('./components/Seeker/SessionsPage'));
const JournalPage      = lazyPage(() => import('./components/Seeker/JournalPage'));
const LibraryPage      = lazyPage(() => import('./components/Seeker/LibraryPage'));
const ProgressPage     = lazyPage(() => import('./components/Seeker/ProgressPage'));
const CommunityPage    = lazyPage(() => import('./components/Seeker/CommunityPage'));
const SettingsPage     = lazyPage(() => import('./components/Seeker/SettingsPage'));
const FavouritesPage   = lazyPage(() => import('./components/Seeker/FavouritesPage'));

// Coach pages
const CoachDashboard    = lazyPage(() => import('./components/Coach/CoachDashboard'));
const ClientsPage       = lazyPage(() => import('./components/Coach/ClientsPage'));
const CoachSessionsPage = lazyPage(() => import('./components/Coach/CoachSessionsPage'));
const ContentPage       = lazyPage(() => import('./components/Coach/ContentPage'));
const AvailabilityPage  = lazyPage(() => import('./components/Coach/AvailabilityPage'));
const EarningsPage      = lazyPage(() => import('./components/Coach/EarningsPage'));
const IntakeFormsPage   = lazyPage(() => import('./components/Coach/IntakeFormsPage'));
const PackagesPage      = lazyPage(() => import('./components/Coach/PackagesPage'));
const CoachSettingsPage = lazyPage(() => import('./components/Coach/CoachSettingsPage'));

// Admin pages
const AdminDashboard      = lazyPage(() => import('./components/Admin/AdminDashboard'));
const AdminCoachesPage    = lazyPage(() => import('./components/Admin/AdminCoachesPage'));
const AdminSeekersPage    = lazyPage(() => import('./components/Admin/AdminSeekersPage'));
const AdminAnalyticsPage  = lazyPage(() => import('./components/Admin/AdminAnalyticsPage'));
const AdminSessionsPage   = lazyPage(() => import('./components/Admin/AdminSessionsPage'));
const AdminContentPage    = lazyPage(() => import('./components/Admin/AdminContentPage'));
const AdminWhitelistPage  = lazyPage(() => import('./components/Admin/AdminWhitelistPage'));

// Shared pages
const MessagesPage = lazyPage(() => import('./components/shared/MessagesPage'));

const DASHBOARDS = { seeker: '/dashboard', coach: '/coach/dashboard', admin: '/admin/dashboard' };

function PageSpinner() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#F4EFE6' }}>
      <div className="spinner" />
    </div>
  );
}

function RootRedirect() {
  const { user, userProfile, loading } = useAuth();
  if (loading) return <PageSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  // Authenticated but no public.users row yet — SignUp's oauth flow creates it
  if (!userProfile) return <Navigate to="/signup?oauth=true" replace />;
  return <Navigate to={DASHBOARDS[userProfile.user_type] || '/login'} replace />;
}

function AppRoutes() {
  return (
    <Suspense fallback={<PageSpinner />}>
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
      <Route path="/admin/whitelist"  element={<ProtectedRoute requiredRole="admin"><AdminWhitelistPage /></ProtectedRoute>} />

      {/* Root & catch-all — RootRedirect sends each role to its own dashboard */}
      <Route path="/" element={<RootRedirect />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </Suspense>
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
