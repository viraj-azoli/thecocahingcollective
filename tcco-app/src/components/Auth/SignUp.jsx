import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../auth/useAuth';
import { supabase } from '../../lib/supabase';
import './Auth.css';

export default function SignUp() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [userType, setUserType] = useState('seeker');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signup, user, userProfile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Handle OAuth callback flow — if user is authenticated via Google but no profile yet
  useEffect(() => {
    const isOAuth = new URLSearchParams(location.search).get('oauth') === 'true';
    if (isOAuth && user && !userProfile) {
      // User came from Google OAuth — create public.users row and redirect to onboarding
      const userType = user.user_metadata?.user_type || 'seeker';
      setUserType(userType);
      supabase.from('users').insert({ id: user.id, user_type: userType })
        .then(() => navigate(userType === 'seeker' ? '/onboarding-seeker' : '/onboarding-coach'))
        .catch(() => setError('Could not set up account. Please try again.'));
      return;
    }
    if (!isOAuth && user && userProfile) {
      // Already authenticated — redirect to dashboard
      navigate(userProfile.user_type === 'seeker' ? '/dashboard' : '/coach/dashboard');
    }

    const ref = new URLSearchParams(location.search).get('ref');
    if (ref) sessionStorage.setItem('tcco_ref', ref);
  }, [location.search, user, userProfile, navigate]);

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (!agreeTerms) {
      setError('You must agree to the Terms of Service and Privacy Policy to continue');
      return;
    }

    setLoading(true);

    try {
      const newUser = await signup(email, password, userType);

      // Handle referral if code was stored
      if (newUser && userType === 'seeker') {
        const refCode = sessionStorage.getItem('tcco_ref');
        if (refCode) {
          sessionStorage.removeItem('tcco_ref');
          // Find referrer by code (fire-and-forget)
          supabase.from('seeker_profiles').select('id').eq('referral_code', refCode).single()
            .then(({ data: referrer }) => {
              if (referrer?.id) {
                // Get the new seeker's profile id after onboarding
                // Store for later recording in SeekerOnboarding
                sessionStorage.setItem('tcco_referrer_id', referrer.id);
              }
            }).catch(() => {});
        }
      }

      // Redirect to appropriate onboarding
      if (userType === 'seeker') {
        navigate('/onboarding-seeker');
      } else {
        navigate('/onboarding-coach');
      }
    } catch (err) {
      setError(err.message || 'Failed to sign up');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1>Join The Coaching Collective</h1>
          <p>Create your account to get started</p>
        </div>

        <form onSubmit={handleSignup} className="auth-form">
          <div className="form-group">
            <label>I am a:</label>
            <div className="user-type-selector">
              <label className="radio-label">
                <input
                  type="radio"
                  name="userType"
                  value="seeker"
                  checked={userType === 'seeker'}
                  onChange={(e) => setUserType(e.target.value)}
                />
                <span>Seeker (looking for a coach)</span>
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  name="userType"
                  value="coach"
                  checked={userType === 'coach'}
                  onChange={(e) => setUserType(e.target.value)}
                />
                <span>Coach (providing coaching)</span>
              </label>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              id="confirmPassword"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          <div className="form-group checkbox-group" style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginTop: '16px', marginBottom: '16px' }}>
            <input
              type="checkbox"
              id="agreeTerms"
              checked={agreeTerms}
              onChange={(e) => setAgreeTerms(e.target.checked)}
              required
              style={{ marginTop: '3px', flexShrink: 0 }}
            />
            <label htmlFor="agreeTerms" style={{ fontSize: '13px', fontWeight: 'normal', color: '#666', lineHeight: '1.4', cursor: 'pointer' }}>
              I agree to the{' '}
              <a href="/terms.html" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent, #12372A)', textDecoration: 'underline' }}>
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="/privacy.html" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent, #12372A)', textDecoration: 'underline' }}>
                Privacy Policy
              </a>
            </label>
          </div>

          {error && <div className="error-message">{error}</div>}

          <button
            type="submit"
            disabled={loading}
            className="auth-button"
          >
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Already have an account?{' '}
            <Link to="/login" className="auth-link">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
