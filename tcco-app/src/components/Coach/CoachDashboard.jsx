import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/useAuth';
import { supabase } from '../../lib/supabase';
import AppLayout from '../Layout/AppLayout';
import ProfileCompleteness from '../shared/ProfileCompleteness';
import '../Layout/AppLayout.css';

export default function CoachDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [coach, setCoach]         = useState(null);
  const [sessions, setSessions]   = useState([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => { if (!user?.id) return; loadData(); }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadData = async () => {
    try {
      const { data: c } = await supabase
        .from('coach_profiles').select('*').eq('user_id', user?.id).single();
      setCoach(c);
      const coachId = c?.id;
      if (!coachId) { setLoading(false); return; }

      const { data: s } = await supabase
        .from('sessions')
        .select('*, seeker:seeker_profiles(name)')
        .eq('coach_id', coachId)
        .order('scheduled_date', { ascending: true });
      setSessions(s || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AppLayout role="coach" profileName="Loading..." profileInitial="?">
        <div className="page-loading"><div className="spinner" /><p>Loading dashboard…</p></div>
      </AppLayout>
    );
  }

  const today = new Date().toISOString().split('T')[0];
  const todaySessions = sessions.filter(s => s.scheduled_date === today);
  const upcomingSessions = sessions.filter(s => s.status === 'scheduled');
  const completedSessions = sessions.filter(s => s.status === 'completed');
  const thisMonth = new Date().toISOString().slice(0, 7);
  const thisMonthCompleted = completedSessions.filter(s => s.scheduled_date?.startsWith(thisMonth));
  const earnings = thisMonthCompleted.length * (coach?.price_per_session || 0);
  const avgRating = completedSessions.filter(s => s.rating).length > 0
    ? (completedSessions.filter(s => s.rating).reduce((sum, s) => sum + s.rating, 0) / completedSessions.filter(s => s.rating).length).toFixed(1)
    : (coach?.rating ? Number(coach.rating).toFixed(1) : '—');

  // Unique clients
  const clientIds = new Set();
  sessions.forEach(s => { if (s.seeker_id) clientIds.add(s.seeker_id); });

  return (
    <AppLayout role="coach" profileName={coach?.name} profileInitial={coach?.name?.[0]} profileAvatar={coach?.avatar_url}>
      <div className="page-body">
        <div className="page-header">
          <div>
            <h1 className="page-title">Welcome back, {coach?.name?.split(' ')[0] || 'Coach'}</h1>
            <p className="page-subtitle">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn btn-outline" onClick={() => navigate('/coach/availability')}>+ Add availability</button>
            <button className="btn btn-primary" onClick={() => navigate('/coach/content')}>+ Create content</button>
          </div>
        </div>

        {/* Profile completeness nudge */}
        <ProfileCompleteness
          settingsPath="/coach/settings"
          fields={[
            { label: 'Name',        done: !!coach?.name },
            { label: 'Photo',       done: !!coach?.avatar_url },
            { label: 'Bio',         done: !!(coach?.bio?.length > 10) },
            { label: 'Title',       done: !!coach?.title },
            { label: 'Specialties', done: !!(coach?.specialties?.length > 0) },
            { label: 'Pricing',     done: !!coach?.price_per_session },
            { label: 'Zoom link',   done: !!coach?.zoom_link },
          ]}
        />

        {/* Stats */}
        <div className="stats-grid-4">
          <div className="stat-card">
            <span className="stat-icon">👥</span>
            <div className="stat-value">{clientIds.size}</div>
            <div className="stat-label">Active Clients</div>
            <div className="stat-delta">All time</div>
          </div>
          <div className="stat-card">
            <span className="stat-icon">📅</span>
            <div className="stat-value">{thisMonthCompleted.length}</div>
            <div className="stat-label">Sessions This Month</div>
            <div className="stat-delta positive">+{upcomingSessions.length} upcoming</div>
          </div>
          <div className="stat-card">
            <span className="stat-icon">⭐</span>
            <div className="stat-value">{avgRating}</div>
            <div className="stat-label">Average Rating</div>
            <div className="stat-delta">{completedSessions.filter(s => s.rating).length} reviews</div>
          </div>
          <div className="stat-card">
            <span className="stat-icon">💰</span>
            <div className="stat-value">${earnings.toLocaleString()}</div>
            <div className="stat-label">Earnings This Month</div>
            <div className="stat-delta positive">{thisMonthCompleted.length} sessions</div>
          </div>
        </div>

        {/* Today's sessions */}
        <div>
          <p className="section-label" style={{ marginBottom: '12px' }}>TODAY'S SESSIONS</p>
          {todaySessions.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-soft)' }}>
              <span style={{ fontSize: '32px', display: 'block', marginBottom: '8px' }}>🌿</span>
              <p>No sessions today.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {todaySessions.map(s => (
                <div key={s.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px', borderLeft: '3px solid var(--accent)' }}>
                  <div className="avatar avatar-md">{(s.seeker?.name || '?')[0]}</div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-h)' }}>{s.seeker?.name || 'Client'}</p>
                    <p style={{ fontSize: '13px', color: 'var(--text-soft)' }}>⏰ {s.scheduled_time?.slice(0,5)} · {s.duration_minutes || 55} min</p>
                  </div>
                  <button className="btn btn-primary btn-sm">🔗 Join</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <p className="section-label">UPCOMING SESSIONS</p>
            <button className="btn btn-outline btn-sm" onClick={() => navigate('/coach/sessions')}>View all →</button>
          </div>
          {upcomingSessions.length === 0 ? (
            <div className="empty-state" style={{ padding: '32px' }}>
              <span className="empty-icon" style={{ fontSize: '32px' }}>📅</span>
              <p>No upcoming sessions.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="tcco-table">
                <thead><tr><th>Client</th><th>Date</th><th>Time</th><th>Status</th></tr></thead>
                <tbody>
                  {upcomingSessions.slice(0, 5).map(s => (
                    <tr key={s.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div className="avatar avatar-sm">{(s.seeker?.name || '?')[0]}</div>
                          {s.seeker?.name || 'Client'}
                        </div>
                      </td>
                      <td>{s.scheduled_date ? new Date(s.scheduled_date + 'T00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}</td>
                      <td>{s.scheduled_time?.slice(0,5) || '—'}</td>
                      <td><span className="badge badge-blue">{s.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div>
          <p className="section-label" style={{ marginBottom: '12px' }}>QUICK ACTIONS</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
            {[
              { icon: '🗓️', label: 'Update Availability', to: '/coach/availability' },
              { icon: '📚', label: 'Create Content', to: '/coach/content' },
              { icon: '💰', label: 'View Earnings', to: '/coach/earnings' },
            ].map(a => (
              <button
                key={a.label}
                onClick={() => navigate(a.to)}
                style={{
                  background: 'var(--card-bg)', border: '1px solid var(--border-card)',
                  borderRadius: 'var(--r-md)', padding: '24px',
                  textAlign: 'center', cursor: 'pointer',
                  transition: 'box-shadow .15s, transform .15s',
                  boxShadow: 'var(--shadow-xs)',
                }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = 'var(--shadow-xs)'; e.currentTarget.style.transform = 'none'; }}
              >
                <span style={{ fontSize: '28px', display: 'block', marginBottom: '8px' }}>{a.icon}</span>
                <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-h)' }}>{a.label}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
