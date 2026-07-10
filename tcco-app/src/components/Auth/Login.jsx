import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../auth/useAuth';
import { supabase } from '../../lib/supabase';
import './Auth.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Step 1: Authenticate with Supabase
      const user = await login(email, password);

      // Step 2: Fetch user profile with user_type from database
      const { data, error: fetchError } = await supabase
        .from('users')
        .select('user_type, id')
        .eq('id', user.id)
        .single();

      if (fetchError) {
        setError('Unable to load user profile. Please try again.');
        return;
      }

      if (!data) {
        setError('User profile not found. Please contact support.');
        return;
      }

      // Step 3: Navigate to appropriate dashboard based on user type
      const userType = data.user_type?.toLowerCase();

      if (userType === 'seeker') {
        navigate('/dashboard', { replace: true });
      } else if (userType === 'coach') {
        navigate('/coach/dashboard', { replace: true });
      } else if (userType === 'admin') {
        navigate('/admin/dashboard', { replace: true });
      } else {
        setError(`Unknown user type: ${data.user_type}`);
      }
    } catch (err) {
      setError(err.message || 'Failed to log in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1>Welcome Back</h1>
          <p>Sign in to The Coaching Collective Online</p>
        </div>

        <form onSubmit={handleLogin} className="auth-form">
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

          {error && <div className="error-message">{error}</div>}

          <button
            type="submit"
            disabled={loading}
            className="auth-button"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>

          <button
            type="button"
            className="auth-btn auth-btn-google"
            onClick={async () => {
              try { await loginWithGoogle(); }
              catch (err) { setError(err.message || 'Google sign-in failed'); }
            }}
            style={{ background:'#fff', color:'#333', border:'1px solid #ddd', marginTop:'8px', width:'100%', padding:'13px', borderRadius:'8px', fontSize:'15px', fontWeight:'600', cursor:'pointer' }}
          >
            <span style={{ marginRight:'8px' }}>G</span> Continue with Google
          </button>

          <p style={{ textAlign:'center', marginTop:'12px', fontSize:'13px', color:'#666' }}>
            <a href="/reset-password" style={{ color:'#2D9E6B', textDecoration:'none' }}>Forgot your password?</a>
          </p>
        </form>

        <div className="auth-footer">
          <p>
            Don't have an account?{' '}
            <Link to="/signup" className="auth-link">
              Sign up
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
}
