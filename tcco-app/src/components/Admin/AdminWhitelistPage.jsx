import React, { useState, useEffect } from 'react';
import Icon from '../../ui/Icon';
import { supabase } from '../../lib/supabase';
import AppLayout from '../Layout/AppLayout';
import { showToast } from '../shared/Toast';
import '../Layout/AppLayout.css';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function AdminWhitelistPage() {
  const [entries, setEntries]     = useState([]);
  const [registered, setRegistered] = useState(new Set());
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [newEmail, setNewEmail]   = useState('');
  const [adding, setAdding]       = useState(false);
  const [confirming, setConfirming] = useState(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      // users.email only exists after migration 005; if it hasn't run yet the
      // second query errors and we just skip the "Registered" column data.
      const [{ data: rows, error }, { data: coachUsers }] = await Promise.all([
        supabase.from('coach_whitelist').select('*').order('created_at', { ascending: false }),
        supabase.from('users').select('email').eq('user_type', 'coach'),
      ]);

      if (error) throw error;

      setEntries(rows || []);
      setRegistered(new Set((coachUsers || []).map(u => (u.email || '').toLowerCase())));
    } catch (err) {
      console.error(err);
      showToast('Could not load the whitelist', 'error');
    } finally {
      setLoading(false);
    }
  };

  const addEmail = async (e) => {
    e.preventDefault();
    const email = newEmail.trim().toLowerCase();

    if (!EMAIL_RE.test(email)) {
      showToast('Enter a valid email address', 'error');
      return;
    }
    if (entries.some(en => en.email.toLowerCase() === email)) {
      showToast('That email is already whitelisted', 'info');
      return;
    }

    setAdding(true);
    const { data, error } = await supabase
      .from('coach_whitelist')
      .insert({ email })
      .select()
      .single();
    setAdding(false);

    if (error) {
      // 42501 = RLS refused the insert, i.e. migration 005 hasn't been applied
      showToast(
        error.code === '42501'
          ? 'Permission denied — migration 005 may not be applied yet'
          : error.message,
        'error'
      );
      return;
    }

    setEntries(prev => [data, ...prev]);
    setNewEmail('');
    showToast(`${email} can now register as a coach`, 'success');
  };

  const removeEmail = async (entry) => {
    const { error } = await supabase.from('coach_whitelist').delete().eq('email', entry.email);
    if (error) { showToast(error.message, 'error'); return; }
    setEntries(prev => prev.filter(en => en.email !== entry.email));
    setConfirming(null);
    showToast(`${entry.email} removed from the whitelist`, 'info');
  };

  const filtered = entries.filter(en =>
    !search.trim() || en.email.toLowerCase().includes(search.trim().toLowerCase())
  );

  const formatDate = d => d
    ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '—';

  if (loading) {
    return (
      <AppLayout role="admin">
        <div className="page-loading"><div className="spinner" /><p>Loading whitelist…</p></div>
      </AppLayout>
    );
  }

  const pending = entries.filter(en => !registered.has(en.email.toLowerCase())).length;

  return (
    <AppLayout role="admin">
      <div className="page-body">
        <div className="page-header">
          <div>
            <h1 className="page-title">Coach Whitelist</h1>
            <p className="page-subtitle">
              {entries.length} approved {entries.length === 1 ? 'email' : 'emails'} · {pending} not yet signed up
            </p>
          </div>
        </div>

        <div className="card" style={{ marginBottom: '4px' }}>
          <p style={{ fontSize: '13px', color: 'var(--text-soft)', lineHeight: 1.6, margin: '0 0 14px' }}>
            Only emails on this list can create a coach account. Add someone here before
            you invite them to sign up — anyone else who tries is turned away at registration.
          </p>
          <form onSubmit={addEmail} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <input
              className="search-bar"
              style={{ flex: '1 1 260px', paddingLeft: '14px' }}
              type="email"
              placeholder="coach@example.com"
              value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
              required
            />
            <button type="submit" className="btn btn-primary" disabled={adding}>
              {adding ? 'Adding…' : 'Add to whitelist'}
            </button>
          </form>
        </div>

        <div className="search-wrap">
          <span className="search-icon"><Icon name="search" size={15} /></span>
          <input
            className="search-bar"
            placeholder="Search whitelisted emails…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {filtered.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon"><Icon name="whitelist" size={22} /></span>
            <p>{entries.length === 0 ? 'No emails whitelisted yet.' : 'No emails match that search.'}</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="tcco-table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Added</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(entry => {
                  const hasSignedUp = registered.has(entry.email.toLowerCase());
                  return (
                    <tr key={entry.email}>
                      <td style={{ fontWeight: 600, color: 'var(--text-h)' }}>{entry.email}</td>
                      <td>
                        <span className={`badge ${hasSignedUp ? 'badge-green' : 'badge-gray'}`}>
                          {hasSignedUp ? '✓ Registered' : 'Invited'}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-soft)', fontSize: '13px' }}>{formatDate(entry.created_at)}</td>
                      <td>
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => setConfirming(entry)}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {confirming && (
        <div className="modal-overlay" onClick={() => setConfirming(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px', width: '90%' }}>
            <div className="modal-header">
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-h)', margin: 0 }}>
                Remove from whitelist?
              </h2>
              <button className="modal-close" onClick={() => setConfirming(null)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '14px', color: 'var(--text-soft)', lineHeight: 1.6 }}>
                <strong style={{ color: 'var(--text-h)' }}>{confirming.email}</strong> will no
                longer be able to create a coach account.
              </p>
              {registered.has(confirming.email.toLowerCase()) && (
                <p style={{ fontSize: '13px', color: '#B45309', lineHeight: 1.6, marginTop: '10px' }}>
                  Note: this account already exists. Removing the email blocks future
                  signups but does not delete or suspend their current coach account.
                </p>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setConfirming(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => removeEmail(confirming)}>Remove</button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
