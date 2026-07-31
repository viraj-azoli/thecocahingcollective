import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../auth/useAuth';
import { supabase } from '../../lib/supabase';
import { AuthShell, AuthHeader, Alert, PasswordInput, Button } from '../../ui';

// Signup enforced 6 characters while the reset screen enforced 8. Eight wins,
// and the requirement is now stated up front rather than only on failure.
const MIN_PASSWORD = 8;

const ROLES = [
  { value: 'seeker', label: 'I am looking for a coach', hint: 'Browse the collective and book sessions' },
  { value: 'coach',  label: 'I am a coach',             hint: 'Requires an invitation from the team' },
];

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

  useEffect(() => {
    const isOAuth = new URLSearchParams(location.search).get('oauth') === 'true';
    if (isOAuth && user && !userProfile) {
      const t = user.user_metadata?.user_type || 'seeker';
      setUserType(t);
      supabase.from('users').upsert({ id: user.id, user_type: t }, { onConflict: 'id' })
        .then(({ error }) => {
          if (error) setError('Could not set up account. Please try again.');
          else navigate(t === 'seeker' ? '/onboarding-seeker' : '/onboarding-coach');
        });
      return;
    }
    if (!isOAuth && user && userProfile) {
      const dashboards = { seeker: '/dashboard', coach: '/coach/dashboard', admin: '/admin/dashboard' };
      navigate(dashboards[userProfile.user_type] || '/dashboard');
    }
  }, [location.search, user, userProfile, navigate]);

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) { setError('Passwords do not match'); return; }
    if (password.length < MIN_PASSWORD) {
      setError(`Password must be at least ${MIN_PASSWORD} characters`);
      return;
    }
    if (!agreeTerms) {
      setError('You must agree to the Terms of Service and Privacy Policy to continue');
      return;
    }

    setLoading(true);
    try {
      await signup(email, password, userType);
      navigate(userType === 'seeker' ? '/onboarding-seeker' : '/onboarding-coach');
    } catch (err) {
      setError(err.message || 'Failed to sign up');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <AuthHeader title="Join the collective" subtitle="Create your account to get started" />

      <form onSubmit={handleSignup} className="cc-stack cc-gap-4">
        {/* A real fieldset, so the choice is announced as a group */}
        <fieldset className="cc-roles">
          <legend className="cc-field-label">I am…</legend>
          {ROLES.map(r => (
            <label key={r.value} className={`cc-role${userType === r.value ? ' cc-role-on' : ''}`}>
              <input
                type="radio"
                name="userType"
                value={r.value}
                checked={userType === r.value}
                onChange={(e) => setUserType(e.target.value)}
              />
              <span className="cc-role-body">
                <span className="cc-role-label">{r.label}</span>
                <span className="cc-role-hint">{r.hint}</span>
              </span>
            </label>
          ))}
        </fieldset>

        <label className="cc-field" htmlFor="email">
          <span className="cc-field-label">Email</span>
          <input
            id="email" className="cc-input" type="email" placeholder="you@example.com"
            value={email} onChange={(e) => setEmail(e.target.value)}
            autoComplete="email" required
          />
        </label>

        <label className="cc-field" htmlFor="password">
          <span className="cc-field-label">Password</span>
          <PasswordInput
            id="password" value={password} onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password" required
            hint={`At least ${MIN_PASSWORD} characters`}
          />
        </label>

        <label className="cc-field" htmlFor="confirm">
          <span className="cc-field-label">Confirm password</span>
          <PasswordInput
            id="confirm" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password" required
          />
        </label>

        <label className="cc-check">
          <input type="checkbox" checked={agreeTerms} onChange={(e) => setAgreeTerms(e.target.checked)} />
          <span>
            I agree to the <a href="/terms.html" className="cc-auth-link">Terms of Service</a> and{' '}
            <a href="/privacy.html" className="cc-auth-link">Privacy Policy</a>
          </span>
        </label>

        <Alert>{error}</Alert>

        <Button type="submit" variant="primary" size="lg" block loading={loading}>
          Create account
        </Button>
      </form>

      <p className="cc-auth-foot">
        Already have an account? <Link to="/login" className="cc-auth-link">Sign in</Link>
      </p>
    </AuthShell>
  );
}
