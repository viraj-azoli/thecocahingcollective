import React, { useState, useEffect } from 'react';
import { useAuth } from '../../auth/useAuth';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import './Auth.css';

export default function ResetPassword() {
  const { resetPassword, updatePassword } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [sent, setSent]         = useState(false);
  const [loading, setLoading]   = useState(false);
  const [msg, setMsg]           = useState('');
  const [isReset, setIsReset] = useState(
    window.location.hash.includes('type=recovery')
  );

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setIsReset(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleRequest = async (e) => {
    e.preventDefault();
    setLoading(true);
    try { await resetPassword(email); setSent(true); }
    catch (err) { setMsg(err.message); }
    finally { setLoading(false); }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try { await updatePassword(password); navigate('/login'); }
    catch (err) { setMsg(err.message); }
    finally { setLoading(false); }
  };

  if (isReset) return (
    <div className="auth-wrap"><div className="auth-card">
      <h2 className="auth-title">Set new password</h2>
      <form onSubmit={handleUpdate} style={{ display:'flex', flexDirection:'column', gap:'14px' }}>
        <input className="auth-input" type="password" placeholder="New password (min 8 chars)" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} />
        {msg && <p className="auth-error">{msg}</p>}
        <button className="auth-btn" disabled={loading}>{loading ? 'Saving…' : 'Update password'}</button>
      </form>
    </div></div>
  );

  if (sent) return (
    <div className="auth-wrap"><div className="auth-card">
      <h2 className="auth-title">Check your inbox</h2>
      <p style={{ color:'#555', fontSize:'15px' }}>We sent a password reset link to <strong>{email}</strong>.</p>
      <button className="auth-btn" style={{ marginTop:'16px' }} onClick={() => navigate('/login')}>Back to sign in</button>
    </div></div>
  );

  return (
    <div className="auth-wrap"><div className="auth-card">
      <h2 className="auth-title">Reset password</h2>
      <form onSubmit={handleRequest} style={{ display:'flex', flexDirection:'column', gap:'14px' }}>
        <input className="auth-input" type="email" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} required />
        {msg && <p className="auth-error">{msg}</p>}
        <button className="auth-btn" disabled={loading}>{loading ? 'Sending…' : 'Send reset link'}</button>
        <Link to="/login" className="auth-link" style={{ textAlign:'center' }}>Back to sign in</Link>
      </form>
    </div></div>
  );
}
