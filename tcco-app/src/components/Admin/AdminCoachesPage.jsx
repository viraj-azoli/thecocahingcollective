import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import AppLayout from '../Layout/AppLayout';
import { showToast } from '../shared/Toast';
import '../Layout/AppLayout.css';

const FILTERS = ['All', 'Verified', 'Pending'];

export default function AdminCoachesPage() {
  const [coaches, setCoaches]         = useState([]);
  const [countMap, setCountMap]       = useState({});
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState('');
  const [filter, setFilter]           = useState('All');
  const [selected, setSelected]       = useState(null); // modal coach

  useEffect(() => { loadCoaches(); }, []);

  const loadCoaches = async () => {
    try {
      const [{ data: coachData }, { data: sessionCounts }] = await Promise.all([
        supabase.from('coach_profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('sessions').select('coach_id').eq('status', 'completed'),
      ]);

      const map = {};
      sessionCounts?.forEach(s => { map[s.coach_id] = (map[s.coach_id] || 0) + 1; });

      setCoaches(coachData || []);
      setCountMap(map);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleVerified = async (coach) => {
    const newVal = !coach.verified;
    const { error } = await supabase.from('coach_profiles').update({ verified: newVal }).eq('id', coach.id);
    if (error) { showToast('Update failed', 'error'); return; }
    setCoaches(prev => prev.map(c => c.id === coach.id ? { ...c, verified: newVal } : c));
    if (selected?.id === coach.id) setSelected(prev => ({ ...prev, verified: newVal }));
    showToast(newVal ? `${coach.name} verified` : `${coach.name} unverified`, 'success');

    // Send verification approval email
    if (newVal && coach.user_id) {
      const { data: userRow } = await supabase
        .from('users').select('id').eq('id', coach.user_id).single();
      if (userRow) {
        // Use Supabase admin to get email — fetch from auth via edge function context
        // Fallback: send to contact_email if stored, otherwise skip
        const coachEmail = coach.contact_email || coach.email;
        if (coachEmail) {
          supabase.functions.invoke('send-email', {
            body: {
              to: coachEmail,
              template: 'coach_verification_approved',
              data: { name: coach.name, appUrl: window.location.origin },
            },
          }).catch(() => {/* non-blocking */});
        }
      }
    }
  };

  const filtered = coaches.filter(c => {
    const matchSearch = !search.trim() ||
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.title?.toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      filter === 'All' ? true :
      filter === 'Verified' ? c.verified :
      !c.verified;
    return matchSearch && matchFilter;
  });

  const formatDate = d => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

  if (loading) {
    return (
      <AppLayout role="admin">
        <div className="page-loading"><div className="spinner" /><p>Loading coaches…</p></div>
      </AppLayout>
    );
  }

  return (
    <AppLayout role="admin">
      <div className="page-body">
        <div className="page-header">
          <div>
            <h1 className="page-title">Coach Management</h1>
            <p className="page-subtitle">
              {coaches.length} total coaches · {coaches.filter(c => !c.verified).length} pending verification
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="search-wrap">
          <span className="search-icon">🔍</span>
          <input
            className="search-bar"
            placeholder="Search by name or title…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Filter chips */}
        <div className="tabs" style={{ marginBottom: '4px' }}>
          {FILTERS.map(f => (
            <button
              key={f}
              className={`tab${filter === f ? ' tab-active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f}
              {f === 'Pending' && coaches.filter(c => !c.verified).length > 0 && (
                <span className="badge badge-yellow" style={{ marginLeft: '6px' }}>
                  {coaches.filter(c => !c.verified).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">👥</span>
            <p>No coaches found.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="tcco-table">
              <thead>
                <tr>
                  <th>Coach</th>
                  <th>Title</th>
                  <th>Specialties</th>
                  <th>Rating</th>
                  <th>Sessions</th>
                  <th>Price</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(coach => (
                  <tr key={coach.id}>
                    <td>
                      <div
                        style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
                        onClick={() => setSelected(coach)}
                      >
                        <div className="avatar avatar-sm">{(coach.name || '?')[0]}</div>
                        <span style={{ fontWeight: 600, color: 'var(--accent)', textDecoration: 'underline' }}>
                          {coach.name}
                        </span>
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-soft)', fontSize: '13px' }}>{coach.title || '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {(coach.specialties || []).slice(0, 2).map(s => (
                          <span key={s} className="chip" style={{ fontSize: '11px' }}>{s}</span>
                        ))}
                      </div>
                    </td>
                    <td>
                      {coach.rating ? (
                        <span style={{ fontWeight: 600, color: '#D97706' }}>⭐ {Number(coach.rating).toFixed(1)}</span>
                      ) : '—'}
                    </td>
                    <td style={{ fontWeight: 600 }}>{countMap[coach.id] || 0}</td>
                    <td style={{ fontWeight: 600 }}>{coach.price_per_session ? `$${coach.price_per_session}` : '—'}</td>
                    <td>
                      <span className={`badge ${coach.verified ? 'badge-green' : 'badge-yellow'}`}>
                        {coach.verified ? '✓ Verified' : '⏳ Pending'}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-soft)', fontSize: '13px' }}>{formatDate(coach.created_at)}</td>
                    <td>
                      <button
                        className={`btn btn-sm ${coach.verified ? 'btn-outline' : 'btn-primary'}`}
                        onClick={() => toggleVerified(coach)}
                      >
                        {coach.verified ? 'Unverify' : 'Verify'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Coach Profile Modal */}
      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '560px', width: '90%' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div className="avatar avatar-lg">{(selected.name || '?')[0]}</div>
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-h)', margin: 0 }}>{selected.name}</h2>
                  <p style={{ fontSize: '13px', color: 'var(--text-soft)', margin: 0 }}>{selected.title}</p>
                </div>
              </div>
              <button className="modal-close" onClick={() => setSelected(null)}>✕</button>
            </div>
            <div className="modal-body">
              {selected.bio && (
                <div className="form-group">
                  <p className="form-label">Bio</p>
                  <p style={{ fontSize: '14px', color: 'var(--text-soft)', lineHeight: 1.6 }}>{selected.bio}</p>
                </div>
              )}
              {selected.specialties?.length > 0 && (
                <div className="form-group">
                  <p className="form-label">Specialties</p>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {selected.specialties.map(s => (
                      <span key={s} className="chip">{s}</span>
                    ))}
                  </div>
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <p className="form-label">Rating</p>
                  <p style={{ fontWeight: 700, color: '#D97706' }}>
                    {selected.rating ? `⭐ ${Number(selected.rating).toFixed(1)} (${selected.review_count || 0} reviews)` : 'No ratings yet'}
                  </p>
                </div>
                <div className="form-group">
                  <p className="form-label">Price / Session</p>
                  <p style={{ fontWeight: 700, color: 'var(--text-h)' }}>
                    {selected.price_per_session ? `$${selected.price_per_session}` : '—'}
                  </p>
                </div>
                <div className="form-group">
                  <p className="form-label">Sessions Completed</p>
                  <p style={{ fontWeight: 700, color: 'var(--text-h)' }}>{countMap[selected.id] || 0}</p>
                </div>
                <div className="form-group">
                  <p className="form-label">Member Since</p>
                  <p style={{ color: 'var(--text-soft)' }}>{formatDate(selected.created_at)}</p>
                </div>
              </div>
              <div className="form-group">
                <p className="form-label">Verification Status</p>
                <span className={`badge ${selected.verified ? 'badge-green' : 'badge-yellow'}`}>
                  {selected.verified ? '✓ Verified' : '⏳ Pending Verification'}
                </span>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setSelected(null)}>Close</button>
              <button
                className={`btn ${selected.verified ? 'btn-outline' : 'btn-primary'}`}
                onClick={() => toggleVerified(selected)}
              >
                {selected.verified ? 'Unverify Coach' : 'Verify Coach'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
