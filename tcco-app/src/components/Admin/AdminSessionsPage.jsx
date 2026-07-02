import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import AppLayout from '../Layout/AppLayout';
import '../Layout/AppLayout.css';

const STATUS_COLORS = {
  scheduled:   { bg: '#eff6ff', text: '#1d4ed8' },
  in_progress: { bg: '#fef3c7', text: '#b45309' },
  completed:   { bg: '#f0fdf4', text: '#15803d' },
  cancelled:   { bg: '#fef2f2', text: '#dc2626' },
};

export default function AdminSessionsPage() {
  const [sessions, setSessions]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch]       = useState('');

  useEffect(() => { load(); }, []);

  const load = async () => {
    const { data } = await supabase
      .from('sessions')
      .select('*, seeker:seeker_profiles(name), coach:coach_profiles(name)')
      .order('created_at', { ascending: false })
      .limit(100);
    setSessions(data || []);
    setLoading(false);
  };

  const filtered = sessions.filter(s => {
    if (statusFilter !== 'all' && s.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return s.seeker?.name?.toLowerCase().includes(q) || s.coach?.name?.toLowerCase().includes(q);
    }
    return true;
  });

  if (loading) return (
    <AppLayout role="admin">
      <div className="page-loading"><div className="spinner" /><p>Loading…</p></div>
    </AppLayout>
  );

  return (
    <AppLayout role="admin">
      <div className="page-body">
        <div className="page-header">
          <div>
            <h1 className="page-title">All Sessions</h1>
            <p className="page-subtitle">{sessions.length} total sessions on the platform</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <div className="search-wrap" style={{ flex: '1 1 200px' }}>
            <span className="search-icon">🔍</span>
            <input
              className="search-bar"
              placeholder="Search by seeker or coach name…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="chips-row">
            {['all', 'scheduled', 'in_progress', 'completed', 'cancelled'].map(s => (
              <button
                key={s}
                className={`chip ${statusFilter === s ? 'chip-active' : ''}`}
                onClick={() => setStatusFilter(s)}
              >{s === 'all' ? 'All' : s.replace('_', ' ')}</button>
            ))}
          </div>
        </div>

        <p style={{ fontSize: '13px', color: 'var(--text-soft)' }}>{filtered.length} sessions</p>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-card)', textAlign: 'left' }}>
                {['Seeker', 'Coach', 'Date', 'Time', 'Status', 'Amount'].map(h => (
                  <th key={h} style={{ padding: '10px 12px', fontSize: '11px', fontWeight: 700, color: 'var(--text-soft)', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => {
                const sc = STATUS_COLORS[s.status] || {};
                return (
                  <tr key={s.id} style={{ borderBottom: '1px solid var(--border-card)' }}>
                    <td style={{ padding: '12px', color: 'var(--text-h)', fontWeight: 600 }}>{s.seeker?.name || '—'}</td>
                    <td style={{ padding: '12px', color: 'var(--text-b)' }}>{s.coach?.name || '—'}</td>
                    <td style={{ padding: '12px', color: 'var(--text-soft)' }}>{s.scheduled_date || '—'}</td>
                    <td style={{ padding: '12px', color: 'var(--text-soft)' }}>{s.scheduled_time?.slice(0,5) || '—'}</td>
                    <td style={{ padding: '12px' }}>
                      <span style={{ ...sc, padding: '3px 10px', borderRadius: '99px', fontSize: '12px', fontWeight: 600 }}>
                        {s.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px', fontWeight: 600 }}>
                      {s.amount_paid ? `$${s.amount_paid}` : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="empty-state" style={{ padding: '40px' }}>
              <span className="empty-icon">📅</span>
              <p>No sessions match your filters.</p>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
