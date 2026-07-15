import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../auth/useAuth';
import './Auth.css';

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
          // If no user_type in profile, redirect to onboarding
          navigate('/signup?oauth=true', { replace: true });
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to log in. Please try again.');
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
            <input id="email" type="email" placeholder="your@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>

          {errorMsg && <div className="error-message">{errorMsg}</div>}

          <button type="submit" disabled={loading} className="auth-button">
            {loading ? 'Signing in...' : 'Sign in'}
          </button>

          <button type="button"
            onClick={async () => {
              try { await loginWithGoogle(); }
              catch (err) { setErrorMsg(err.message || 'Google sign-in failed'); }
            }}
            style={{ background:'#fff', color:'#333', border:'1px solid #ddd', marginTop:'8px', width:'100%', padding:'13px', borderRadius:'8px', fontSize:'15px', fontWeight:'600', cursor:'pointer' }}
          >
            <span style={{ marginRight:'8px' }}>G</span> Continue with Google
          </button>

          <p style={{ textAlign:'center', marginTop:'12px', fontSize:'13px', color:'#666' }}>
            <Link to="/reset-password" style={{ color:'#2D9E6B', textDecoration:'none' }}>Forgot your password?</Link>
          </p>
        </form>

        <div className="auth-footer">
          <p>
            Don't have an account?{' '}
            <Link to="/signup" className="auth-link">Sign up</Link>
          </p>
        </div>
      </div>
    </div>
  );
}