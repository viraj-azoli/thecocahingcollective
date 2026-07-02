import React, { useState, useEffect } from 'react';
import { useAuth } from '../../auth/useAuth';
import { supabase } from '../../lib/supabase';
import AppLayout from '../Layout/AppLayout';
import { showToast } from '../shared/Toast';
import '../Layout/AppLayout.css';

export default function ClientsPage() {
  const { user } = useAuth();
  const [coachId, setCoachId]         = useState(null);
  const [clients, setClients]         = useState([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState('');
  const [selected, setSelected]       = useState(null);
  const [clientSessions, setClientSessions] = useState([]);
  const [panelLoading, setPanelLoading] = useState(false);

  useEffect(() => { if (!user?.id) return; loadClients(); }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadClients = async () => {
    try {
      const { data: coachRow } = await supabase
        .from('coach_profiles').select('id').eq('user_id', user?.id).single();
      const cid = coachRow?.id;
      if (!cid) { setLoading(false); return; }
      setCoachId(cid);

      const { data: sessions, error } = await supabase
        .from('sessions')
        .select('*, seeker:seeker_profiles(id, name, tier, mood_average, sessions_completed, day_streak)')
        .eq('coach_id', cid)
        .order('scheduled_date', { ascending: false });

      if (error) throw error;

      const clientMap = {};
      (sessions || []).forEach(s => {
        if (!s.seeker) return;
        const id = s.seeker_id;
        if (!clientMap[id]) {
          clientMap[id] = { ...s.seeker, sessions: [] };
        }
        clientMap[id].sessions.push(s);
      });
      setClients(Object.values(clientMap));
    } catch (err) {
      console.error(err);
      showToast('Failed to load clients', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectClient = async (client) => {
    setSelected(client);
    setPanelLoading(true);
    try {
      const { data } = await supabase
        .from('sessions')
        .select('*')
        .eq('coach_id', coachId)
        .eq('seeker_id', client.id)
        .order('scheduled_date', { ascending: false });
      setClientSessions(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setPanelLoading(false);
    }
  };

  const closePanel = () => {
    setSelected(null);
    setClientSessions([]);
  };

  const formatDate = d =>
    d ? new Date(d + 'T00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

  const tierBadge = tier => {
    if (!tier) return 'badge-gray';
    if (tier.toLowerCase() === 'mastery') return 'badge-green';
    if (tier.toLowerCase() === 'growth') return 'badge-blue';
    return 'badge-gray';
  };

  const filtered = clients.filter(c =>
    (c.name || '').toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <AppLayout role="coach">
        <div className="page-loading"><div className="spinner" /><p>Loading clients…</p></div>
      </AppLayout>
    );
  }

  return (
    <AppLayout role="coach">
      <div className="page-body">
        <div className="page-header">
          <div>
            <h1 className="page-title">Clients</h1>
            <p className="page-subtitle">{clients.length} total client{clients.length !== 1 ? 's' : ''}</p>
          </div>
        </div>

        {/* Search */}
        <div className="search-wrap" style={{ marginBottom: '20px' }}>
          <span className="search-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </span>
          <input
            className="search-bar"
            placeholder="Search clients by name…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">&#128101;</span>
            <p>{search ? 'No clients match your search.' : 'No clients yet. Sessions you complete will appear here.'}</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="tcco-table">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Tier</th>
                  <th>Sessions</th>
                  <th>Last Session</th>
                  <th>Avg Mood</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(client => {
                  const lastSession = client.sessions.length > 0
                    ? client.sessions.reduce((a, b) => a.scheduled_date > b.scheduled_date ? a : b).scheduled_date
                    : null;
                  return (
                    <tr
                      key={client.id}
                      style={{ cursor: 'pointer' }}
                      onClick={() => handleSelectClient(client)}
                    >
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div className="avatar avatar-sm">{(client.name || '?')[0]}</div>
                          <span style={{ fontWeight: 600, color: 'var(--text-h)' }}>{client.name}</span>
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${tierBadge(client.tier)}`}>
                          {client.tier || 'Discovery'}
                        </span>
                      </td>
                      <td>{client.sessions.length}</td>
                      <td style={{ color: 'var(--text-soft)' }}>{formatDate(lastSession)}</td>
                      <td>
                        {client.mood_average ? Number(client.mood_average).toFixed(1) : '—'}
                      </td>
                      <td>
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={e => { e.stopPropagation(); handleSelectClient(client); }}
                        >
                          View history
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

      {/* Slide-in panel */}
      {selected && (
        <>
          {/* Backdrop */}
          <div
            onClick={closePanel}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.25)',
              zIndex: 200,
            }}
          />
          <div style={{
            position: 'fixed', top: 0, right: 0, width: '400px', height: '100vh',
            background: '#fff', boxShadow: '-4px 0 24px rgba(0,0,0,0.12)',
            zIndex: 201, display: 'flex', flexDirection: 'column', overflowY: 'auto',
          }}>
            {/* Panel header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '24px 24px 16px', borderBottom: '1px solid var(--border-card)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div className="avatar avatar-md">{(selected.name || '?')[0]}</div>
                <div>
                  <p style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-h)' }}>{selected.name}</p>
                  <p style={{ fontSize: '13px', color: 'var(--text-soft)' }}>
                    {selected.tier || 'Discovery'} member
                    {selected.day_streak ? ` · ${selected.day_streak}-day streak` : ''}
                  </p>
                </div>
              </div>
              <button
                className="btn btn-ghost btn-sm"
                onClick={closePanel}
                style={{ fontSize: '18px', lineHeight: 1, padding: '4px 10px' }}
              >
                ×
              </button>
            </div>

            {/* Panel body */}
            <div style={{ padding: '20px 24px', flex: 1 }}>
              <p className="section-label" style={{ marginBottom: '14px' }}>SESSION HISTORY</p>

              {panelLoading ? (
                <div className="page-loading" style={{ padding: '40px 0' }}>
                  <div className="spinner" />
                </div>
              ) : clientSessions.length === 0 ? (
                <p style={{ color: 'var(--text-soft)', fontSize: '14px' }}>No sessions found.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {clientSessions.map(s => (
                    <div
                      key={s.id}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '12px',
                        padding: '12px', borderRadius: 'var(--r-md)',
                        background: 'var(--beige)', border: '1px solid var(--border-card)',
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-h)' }}>
                          {formatDate(s.scheduled_date)}
                        </p>
                        <p style={{ fontSize: '12px', color: 'var(--text-soft)', marginTop: '2px' }}>
                          {s.scheduled_time?.slice(0, 5)} · {s.duration_minutes || 55} min
                          {s.session_type ? ` · ${s.session_type}` : ''}
                        </p>
                      </div>
                      <span className={`badge ${s.status === 'completed' ? 'badge-green' : s.status === 'scheduled' ? 'badge-blue' : 'badge-gray'}`}>
                        {s.status}
                      </span>
                      {s.rating_by_seeker ? (
                        <span style={{ fontSize: '13px', color: '#D97706' }}>
                          {'★'.repeat(s.rating_by_seeker)}
                        </span>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </AppLayout>
  );
}
