import React, { useState, useEffect } from 'react';
import { useAuth } from '../../auth/useAuth';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { AuthShell, AuthHeader, StatusScreen, Alert, PasswordInput, Button } from '../../ui';

const MIN_PASSWORD = 8;

export default function ResetPassword() {
  const { resetPassword, updatePassword } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [sent, setSent]         = useState(false);
  const [loading, setLoading]   = useState(false);
  const [msg, setMsg]           = useState('');
  const [isReset, setIsReset]   = useState(window.location.hash.includes('type=recovery'));

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setIsReset(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleRequest = async (e) => {
    e.preventDefault();
    setMsg('');
    setLoading(true);
    try { await resetPassword(email); setSent(true); }
    catch (err) { setMsg(err.message); }
    finally { setLoading(false); }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setMsg('');
    if (password.length < MIN_PASSWORD) {
      setMsg(`Password must be at least ${MIN_PASSWORD} characters`);
      return;
    }
    setLoading(true);
    try { await updatePassword(password); navigate('/login'); }
    catch (err) { setMsg(err.message); }
    finally { setLoading(false); }
  };

  if (isReset) {
    return (
      <AuthShell>
        <AuthHeader title="Set a new password" subtitle="Choose something you have not used before." />
        <form onSubmit={handleUpdate} className="cc-stack cc-gap-4">
          <label className="cc-field" htmlFor="new-password">
            <span className="cc-field-label">New password</span>
            <PasswordInput
              id="new-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="new-password"
              hint={`At least ${MIN_PASSWORD} characters`}
              required
            />
          </label>
          <Alert>{msg}</Alert>
          <Button type="submit" variant="primary" size="lg" block loading={loading}>
            Update password
          </Button>
        </form>
      </AuthShell>
    );
  }

  if (sent) {
    return (
      <StatusScreen
        icon="success"
        title="Check your inbox"
        body={`We sent a password reset link to ${email}.`}
        action={<Button variant="primary" onClick={() => navigate('/login')}>Back to sign in</Button>}
      />
    );
  }

  return (
    <AuthShell>
      <AuthHeader title="Reset password" subtitle="We will email you a link to set a new one." />
      <form onSubmit={handleRequest} className="cc-stack cc-gap-4">
        <label className="cc-field" htmlFor="reset-email">
          <span className="cc-field-label">Email</span>
          <input
            id="reset-email"
            className="cc-input"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </label>
        <Alert>{msg}</Alert>
        <Button type="submit" variant="primary" size="lg" block loading={loading}>
          Send reset link
        </Button>
      </form>
      <p className="cc-auth-foot">
        <Link to="/login" className="cc-auth-link">Back to sign in</Link>
      </p>
    </AuthShell>
  );
}
