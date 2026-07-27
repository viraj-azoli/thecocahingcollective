import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import AppLayout from '../Layout/AppLayout';
import '../Layout/AppLayout.css';

const TIER_FILTERS = ['All', 'Discovery', 'Growth', 'Mastery'];

export default function AdminSeekersPage() {
  const [seekers, setSeekers]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [filter, setFilter]     = useState('All');
  const [selected, setSelected] = useState(null);
  const [journalCounts, setJournalCounts] = useState({});

  useEffect(() => { loadSeekers(); }, []);

  const loadSeekers = async () => {
    try {
      // Journal counts come from an admin-gated RPC. Selecting from
      // journal_entries directly returned nothing under RLS, and granting
      // admins raw access would expose every seeker's private entries just
      // to render a count.
      const [{ data: seekerData }, { data: journalData }] = await Promise.all([
        supabase.from('seeker_profiles').select('*').order('created_at', { ascending: false }),
        supabase.rpc('admin_journal_counts'),
      ]);

      const jMap = {};
      journalData?.forEach(j => { jMap[j.seeker_id] = Number(j.entry_count) || 0; });

      setSeekers(seekerData || []);
      setJournalCounts(jMap);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = seekers.filter(s => {
    const matchSearch = !search.trim() || s.name?.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'All' ? true : (s.tier || 'Discovery') === filter;
    return matchSearch && matchFilter;
  });

  const formatDate = d => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

  const tierBadge = (tier) => {
    const map = { Mastery: 'badge-green', Growth: 'badge-blue', Discovery: 'badge-gray' };
    return map[tier] || 'badge-gray';
  };

  if (loading) {
    return (
      <AppLayout role="admin">
        <div className="page-loading"><div className="spinner" /><p>Loading seekers…</p></div>
      </AppLayout>
    );
  }

  return (
    <AppLayout role="admin">
      <div className="page-body">
        <div className="page-header">
          <div>
            <h1 className="page-title">Seeker Management</h1>
            <p className="page-subtitle">{seekers.length} total seeker{seekers.length !== 1 ? 's' : ''}</p>
          </div>
        </div>

        {/* Search */}
        <div className="search-wrap">
          <span className="search-icon">🔍</span>
          <input
            className="search-bar"
            placeholder="Search by name…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Filter chips */}
        <div className="tabs" style={{ marginBottom: '4px' }}>
          {TIER_FILTERS.map(f => (
            <button
              key={f}
              className={`tab${filter === f ? ' tab-active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">🧭</span>
            <p>No seekers found.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="tcco-table">
              <thead>
                <tr>
                  <th>Seeker</th>
                  <th>Tier</th>
                  <th>Sessions</th>
                  <th>Mood Avg</th>
                  <th>Streak</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(seeker => (
                  <tr
                    key={seeker.id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => setSelected(seeker)}
                  >
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div className="avatar avatar-sm">{(seeker.name || '?')[0]}</div>
                        <span style={{ fontWeight: 600, color: 'var(--accent)', textDecoration: 'underline' }}>
                          {seeker.name || 'Unknown'}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${tierBadge(seeker.tier)}`}>{seeker.tier || 'Discovery'}</span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{seeker.sessions_completed || 0}</td>
                    <td>
                      {seeker.mood_average ? (
                        <span style={{ fontWeight: 600, color: '#16A34A' }}>
                          {Number(seeker.mood_average).toFixed(1)} / 5
                        </span>
                      ) : '—'}
                    </td>
                    <td>
                      {seeker.day_streak ? (
                        <span style={{ fontWeight: 600, color: 'var(--accent)' }}>🔥 {seeker.day_streak}</span>
                      ) : '0'}
                    </td>
                    <td style={{ color: 'var(--text-soft)', fontSize: '13px' }}>{formatDate(seeker.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Seeker Detail Modal (view-only) */}
      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px', width: '90%' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div className="avatar avatar-lg">{(selected.name || '?')[0]}</div>
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-h)', margin: 0 }}>{selected.name || 'Unknown'}</h2>
                  <span className={`badge ${tierBadge(selected.tier)}`} style={{ marginTop: '4px', display: 'inline-block' }}>
                    {selected.tier || 'Discovery'}
                  </span>
                </div>
              </div>
              <button className="modal-close" onClick={() => setSelected(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <p className="form-label">Sessions Completed</p>
                  <p style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-h)' }}>
                    {selected.sessions_completed || 0}
                  </p>
                </div>
                <div className="form-group">
                  <p className="form-label">Day Streak</p>
                  <p style={{ fontSize: '24px', fontWeight: 700, color: 'var(--accent)' }}>
                    🔥 {selected.day_streak || 0}
                  </p>
                </div>
                <div className="form-group">
                  <p className="form-label">Avg Mood (14 days)</p>
                  <p style={{ fontSize: '24px', fontWeight: 700, color: '#16A34A' }}>
                    {selected.mood_average ? `${Number(selected.mood_average).toFixed(1)}/5` : '—'}
                  </p>
                </div>
                <div className="form-group">
                  <p className="form-label">Journal Entries</p>
                  <p style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-h)' }}>
                    {journalCounts[selected.id] || 0}
                  </p>
                </div>
              </div>
              <div className="form-group">
                <p className="form-label">Member Since</p>
                <p style={{ color: 'var(--text-soft)' }}>{formatDate(selected.created_at)}</p>
              </div>
              <div
                className="card"
                style={{ background: 'var(--beige)', border: 'none', marginTop: '8px' }}
              >
                <p style={{ fontSize: '12px', color: 'var(--text-soft)', margin: 0 }}>
                  ℹ Seeker profiles are view-only from the admin panel. Data is updated automatically as seekers use the platform.
                </p>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary" onClick={() => setSelected(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
