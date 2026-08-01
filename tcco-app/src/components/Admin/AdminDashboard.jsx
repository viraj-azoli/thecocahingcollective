import React, { useState, useEffect } from 'react';
import Icon from '../../ui/Icon';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import AppLayout from '../Layout/AppLayout';
import { showToast } from '../shared/Toast';
import { appBaseUrl } from '../../lib/appUrl';
import '../Layout/AppLayout.css';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats]                   = useState({});
  const [unverified, setUnverified]         = useState([]);
  const [recentSessions, setRecentSessions] = useState([]);
  const [recentSeekers, setRecentSeekers]   = useState([]);
  const [loading, setLoading]               = useState(true);
  const [confirmReject, setConfirmReject]   = useState(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      // Counts come from an RPC rather than four head-count queries. Those
      // ran under the caller's RLS, so an admin counted only their own rows
      // and the dashboard showed zeros. The RPC is admin-gated server-side
      // and returns counts only — it never exposes journal contents.
      const [
        { data: statData, error: statErr },
        { data: unverifiedCoaches },
        { data: sessions },
        { data: seekers },
      ] = await Promise.all([
        supabase.rpc('admin_platform_stats'),
        supabase.from('coach_profiles').select('*').eq('verified', false),
        supabase
          .from('sessions')
          .select('*, seeker:seeker_profiles(name), coach:coach_profiles(name)')
          .order('created_at', { ascending: false })
          .limit(5),
        supabase.from('seeker_profiles').select('*').order('created_at', { ascending: false }).limit(5),
      ]);

      if (statErr) {
        console.error('admin_platform_stats failed:', statErr.message);
        showToast('Platform stats unavailable — migration 005 may not be applied', 'error');
      }

      setStats({
        seekerCount:  statData?.seeker_count  ?? 0,
        coachCount:   statData?.coach_count   ?? 0,
        sessionCount: statData?.session_count ?? 0,
        journalCount: statData?.journal_count ?? 0,
      });
      setUnverified(unverifiedCoaches || []);
      setRecentSessions(sessions || []);
      setRecentSeekers(seekers || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const approveCoach = async (coach) => {
    const { data: updated, error } = await supabase
      .from('coach_profiles')
      .update({ verified: true })
      .eq('id', coach.id)
      .select();

    if (error) { showToast('Failed to approve coach', 'error'); return; }
    if (!updated || updated.length === 0) {
      showToast('Approval blocked — admin permissions may not be applied yet', 'error');
      return;
    }

    setUnverified(prev => prev.filter(c => c.id !== coach.id));
    showToast(`${coach.name} approved successfully`, 'success');

    // Approving here now sends the same email the Coaches page sends, instead
    // of silently skipping it and leaving the coach with no idea they're live.
    if (coach.user_id) {
      const { data: userRow } = await supabase
        .from('users').select('email').eq('id', coach.user_id).single();
      if (userRow?.email) {
        supabase.functions.invoke('send-email', {
          body: {
            to: userRow.email,
            template: 'coach_verification_approved',
            data: { name: coach.name, appUrl: appBaseUrl() },
          },
        }).catch(() => {/* non-blocking */});
      }
    }
  };

  const rejectCoach = async (coach) => {
    const { error, count } = await supabase
      .from('coach_profiles')
      .delete({ count: 'exact' })
      .eq('id', coach.id);

    if (error) { showToast('Failed to reject coach', 'error'); return; }
    if (!count) {
      showToast('Delete blocked — admin permissions may not be applied yet', 'error');
      return;
    }

    setUnverified(prev => prev.filter(c => c.id !== coach.id));
    setConfirmReject(null);
    showToast(`${coach.name} rejected and removed`, 'info');
  };

  const formatDate = d => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

  const statusBadge = (status) => {
    const map = { scheduled: 'badge-blue', completed: 'badge-green', cancelled: 'badge-red', in_progress: 'badge-yellow' };
    return map[status] || 'badge-gray';
  };

  const tierBadge = (tier) => {
    const map = { Mastery: 'badge-green', Growth: 'badge-blue', Discovery: 'badge-gray' };
    return map[tier] || 'badge-gray';
  };

  if (loading) {
    return (
      <AppLayout role="admin">
        <div className="page-loading"><div className="spinner" /><p>Loading admin dashboard…</p></div>
      </AppLayout>
    );
  }

  return (
    <AppLayout role="admin">
      <div className="page-body">
        <div className="page-header">
          <div>
            <h1 className="page-title">Platform Overview</h1>
            <p className="page-subtitle">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
          </div>
        </div>

        {/* Platform Stats */}
        <div className="stats-grid-4">
          <div className="stat-card">
            <span className="stat-icon"><Icon name="seekers" size={16} /></span>
            <div className="stat-value">{stats.seekerCount || 0}</div>
            <div className="stat-label">Total Seekers</div>
            <div className="stat-delta positive">All time</div>
          </div>
          <div className="stat-card">
            <span className="stat-icon"><Icon name="coaches" size={16} /></span>
            <div className="stat-value">{stats.coachCount || 0}</div>
            <div className="stat-label">Total Coaches</div>
            <div className="stat-delta">{unverified.length} pending</div>
          </div>
          <div className="stat-card">
            <span className="stat-icon"><Icon name="sessions" size={16} /></span>
            <div className="stat-value">{stats.sessionCount || 0}</div>
            <div className="stat-label">Total Sessions</div>
            <div className="stat-delta positive">All time</div>
          </div>
          <div className="stat-card">
            <span className="stat-icon"><Icon name="journal" size={16} /></span>
            <div className="stat-value">{stats.journalCount || 0}</div>
            <div className="stat-label">Journal Entries</div>
            <div className="stat-delta positive">All time</div>
          </div>
        </div>

        {/* Coach Verification Queue */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
            <p className="section-label" style={{ margin: 0 }}>COACH VERIFICATION QUEUE</p>
            {unverified.length > 0 && (
              <span className="badge badge-yellow">{unverified.length}</span>
            )}
          </div>
          {unverified.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon"><Icon name="success" size={22} /></span>
              <p>All coaches verified</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {unverified.map(coach => (
                <div key={coach.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div className="avatar avatar-md">{(coach.name || '?')[0]}</div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-h)', marginBottom: '2px' }}>{coach.name}</p>
                    <p style={{ fontSize: '12px', color: 'var(--text-soft)', marginBottom: '6px' }}>{coach.title || 'Coach'}</p>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {(coach.specialties || []).slice(0, 2).map(s => (
                        <span key={s} className="chip">{s}</span>
                      ))}
                    </div>
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--text-soft)' }}>Joined {formatDate(coach.created_at)}</p>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn btn-primary btn-sm" onClick={() => approveCoach(coach)}>Approve</button>
                    <button className="btn btn-danger btn-sm" onClick={() => setConfirmReject(coach)}>Reject</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Sessions */}
        <div>
          <p className="section-label" style={{ marginBottom: '14px' }}>RECENT SESSIONS</p>
          {recentSessions.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon"><Icon name="sessions" size={22} /></span>
              <p>No sessions yet.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="tcco-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Seeker</th>
                    <th>Coach</th>
                    <th>Status</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {recentSessions.map(s => (
                    <tr key={s.id}>
                      <td style={{ color: 'var(--text-soft)', fontSize: '13px' }}>{formatDate(s.scheduled_date || s.created_at)}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div className="avatar avatar-sm">{(s.seeker?.name || '?')[0]}</div>
                          {s.seeker?.name || '—'}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div className="avatar avatar-sm">{(s.coach?.name || '?')[0]}</div>
                          {s.coach?.name || '—'}
                        </div>
                      </td>
                      <td><span className={`badge ${statusBadge(s.status)}`}>{s.status || '—'}</span></td>
                      <td style={{ fontWeight: 600 }}>{s.amount_paid ? `$${s.amount_paid}` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Recent Seekers */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <p className="section-label" style={{ margin: 0 }}>RECENT SEEKERS</p>
            <button className="btn btn-outline btn-sm" onClick={() => navigate('/admin/seekers')}>View all →</button>
          </div>
          {recentSeekers.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon"><Icon name="seekers" size={22} /></span>
              <p>No seekers yet.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="tcco-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Tier</th>
                    <th>Sessions</th>
                    <th>Mood Avg</th>
                    <th>Streak</th>
                    <th>Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {recentSeekers.map(s => (
                    <tr key={s.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div className="avatar avatar-sm">{(s.name || '?')[0]}</div>
                          <span style={{ fontWeight: 600, color: 'var(--text-h)' }}>{s.name || 'Unknown'}</span>
                        </div>
                      </td>
                      <td><span className={`badge ${tierBadge(s.tier)}`}>{s.tier || 'Discovery'}</span></td>
                      <td style={{ fontWeight: 600 }}>{s.sessions_completed || 0}</td>
                      <td>{s.mood_average ? `${Number(s.mood_average).toFixed(1)}/5` : '—'}</td>
                      <td>{s.day_streak ? `🔥 ${s.day_streak}` : '0'}</td>
                      <td style={{ color: 'var(--text-soft)', fontSize: '13px' }}>{formatDate(s.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      {/* Reject permanently deletes the coach's profile, so make it deliberate. */}
      {confirmReject && (
        <div className="modal-overlay" onClick={() => setConfirmReject(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px', width: '90%' }}>
            <div className="modal-header">
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-h)', margin: 0 }}>
                Reject this coach?
              </h2>
              <button className="modal-close" onClick={() => setConfirmReject(null)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '14px', color: 'var(--text-soft)', lineHeight: 1.6 }}>
                This permanently deletes <strong style={{ color: 'var(--text-h)' }}>{confirmReject.name}</strong>'s
                coach profile, along with their availability and any sessions attached to it.
              </p>
              <p style={{ fontSize: '13px', color: '#B45309', lineHeight: 1.6, marginTop: '10px' }}>
                This cannot be undone.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setConfirmReject(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => rejectCoach(confirmReject)}>
                Delete profile
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
