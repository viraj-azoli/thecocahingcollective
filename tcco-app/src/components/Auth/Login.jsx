import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../auth/useAuth';
import {
  AuthShell, AuthHeader, Alert, PasswordInput, AuthDivider, GoogleButton, Button,
} from '../../ui';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      const { profile } = await login(email, password);
      const userType = profile?.user_type?.toLowerCase();

      switch (userType) {
        case 'seeker': navigate('/dashboard', { replace: true }); break;
        case 'coach':  navigate('/coach/dashboard', { replace: true }); break;
        case 'admin':  navigate('/admin/dashboard', { replace: true }); break;
        default:
          navigate('/signup?oauth=true', { replace: true });
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to log in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <AuthHeader title="Welcome back" subtitle="Sign in to The Coaching Collective" />

      <form onSubmit={handleLogin} className="cc-stack cc-gap-4">
        <label className="cc-field" htmlFor="email">
          <span className="cc-field-label">Email</span>
          <input
            id="email"
            className="cc-input"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </label>

        <label className="cc-field" htmlFor="password">
          <span className="cc-field-label">Password</span>
          <PasswordInput
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>

        <Alert>{errorMsg}</Alert>

        <Button type="submit" variant="primary" size="lg" block loading={loading}>
          Sign in
        </Button>

        <AuthDivider />

        <GoogleButton
          onClick={async () => {
            try { await loginWithGoogle(); }
            catch (err) { setErrorMsg(err.message || 'Google sign-in failed'); }
          }}
        />

        <p className="cc-auth-foot">
          <Link to="/reset-password" className="cc-auth-link">Forgot your password?</Link>
        </p>
      </form>

      <p className="cc-auth-foot">
        Don't have an account? <Link to="/signup" className="cc-auth-link">Sign up</Link>
      </p>
    </AuthShell>
  );
}
