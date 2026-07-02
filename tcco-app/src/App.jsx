import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { ProtectedRoute } from './auth/ProtectedRoute';

// Auth pages (small, load eagerly)
import Login        from './components/Auth/Login';
import SignUp       from './components/Auth/SignUp';
import AuthCallback from './components/Auth/AuthCallback';
import ResetPassword from './components/Auth/ResetPassword';

// Onboarding (lazy)
const SeekerOnboarding = lazy(() => import('./components/Seeker/SeekerOnboarding'));
const CoachOnboarding  = lazy(() => import('./components/Coach/CoachOnboarding'));
const AdminOnboarding  = lazy(() => import('./components/Admin/AdminOnboarding'));

// Seeker pages (lazy)
const SeekerDashboard  = lazy(() => import('./components/Seeker/SeekerDashboard'));
const CoachesPage      = lazy(() => import('./components/Seeker/CoachesPage'));
const CoachProfilePage = lazy(() => import('./components/Seeker/CoachProfilePage'));
const SessionsPage     = lazy(() => import('./components/Seeker/SessionsPage'));
const JournalPage      = lazy(() => import('./components/Seeker/JournalPage'));
const LibraryPage      = lazy(() => import('./components/Seeker/LibraryPage'));
const ProgressPage     = lazy(() => import('./components/Seeker/ProgressPage'));
const CommunityPage    = lazy(() => import('./components/Seeker/CommunityPage'));
const SettingsPage     = lazy(() => import('./components/Seeker/SettingsPage'));
const FavouritesPage   = lazy(() => import('./components/Seeker/FavouritesPage'));

// Coach pages (lazy)
const CoachDashboard    = lazy(() => import('./components/Coach/CoachDashboard'));
const ClientsPage       = lazy(() => import('./components/Coach/ClientsPage'));
const CoachSessionsPage = lazy(() => import('./components/Coach/CoachSessionsPage'));
const ContentPage       = lazy(() => import('./components/Coach/ContentPage'));
const AvailabilityPage  = lazy(() => import('./components/Coach/AvailabilityPage'));
const EarningsPage      = lazy(() => import('./components/Coach/EarningsPage'));
const IntakeFormsPage   = lazy(() => import('./components/Coach/IntakeFormsPage'));
const PackagesPage      = lazy(() => import('./components/Coach/PackagesPage'));
const CoachSettingsPage = lazy(() => import('./components/Coach/CoachSettingsPage'));

// Admin pages (lazy)
const AdminDashboard      = lazy(() => import('./components/Admin/AdminDashboard'));
const AdminCoachesPage    = lazy(() => import('./components/Admin/AdminCoachesPage'));
const AdminSeekersPage    = lazy(() => import('./components/Admin/AdminSeekersPage'));
const AdminAnalyticsPage  = lazy(() => import('./components/Admin/AdminAnalyticsPage'));
const AdminSessionsPage   = lazy(() => import('./components/Admin/AdminSessionsPage'));
const AdminContentPage    = lazy(() => import('./components/Admin/AdminContentPage'));

// Shared pages (lazy)
const MessagesPage = lazy(() => import('./components/Shared/MessagesPage'));

import './App.css';

const PageLoader = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
    <div className="spinner" />
  </div>
);

function RootRedirect() {
  return <Navigate to="/dashboard" replace />;
}

function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
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
    </Suspense>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}

export default App;
