import React, { useState, useEffect } from 'react';
import { useAuth } from '../../auth/useAuth';
import { supabase } from '../../lib/supabase';
import AppLayout from '../Layout/AppLayout';
import { showToast } from '../shared/Toast';
import '../Layout/AppLayout.css';

function getMonthKey(date) {
  return date.toISOString().slice(0, 7);
}

function monthLabel(key) {
  const [year, month] = key.split('-');
  return new Date(Number(year), Number(month) - 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

export default function EarningsPage() {
  const { user } = useAuth();
  const [coach, setCoach]           = useState(null);
  const [sessions, setSessions]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => { if (!user?.id) return; loadData(); }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadData = async () => {
    try {
      const { data: c } = await supabase
        .from('coach_profiles').select('id, price_per_session, name, stripe_account_id').eq('user_id', user?.id).single();
      const coachId = c?.id;
      if (!coachId) { setLoading(false); return; }

      const [{ data: s }] = await Promise.all([
        supabase
          .from('sessions')
          .select('*, seeker:seeker_profiles(name)')
          .eq('coach_id', coachId)
          .eq('status', 'completed')
          .order('scheduled_date', { ascending: false }),
      ]);
      setCoach(c);
      setSessions(s || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    if (!user?.email) return;
    setConnecting(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-connect-account', {
        body: { coachUserId: user.id, email: user.email },
      });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (err) {
      showToast('Could not connect Stripe. Please try again.', 'error');
    } finally {
      setConnecting(false);
    }
  };

  if (loading) {
    return (
      <AppLayout role="coach">
        <div className="page-loading"><div className="spinner" /><p>Loading earnings…</p></div>
      </AppLayout>
    );
  }

  const rate = coach?.price_per_session || 0;
  const now  = new Date();
  const thisMonthKey = getMonthKey(now);
  const lastMonthKey = getMonthKey(new Date(now.getFullYear(), now.getMonth() - 1, 1));

  const thisMonthSessions = sessions.filter(s => s.scheduled_date?.startsWith(thisMonthKey));
  const lastMonthSessions = sessions.filter(s => s.scheduled_date?.startsWith(lastMonthKey));
  const thisMonthTotal    = thisMonthSessions.length * rate;
  const lastMonthTotal    = lastMonthSessions.length * rate;
  const allTimeTotal      = sessions.length * rate;

  // Last 6 months bar chart
  const last6 = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    last6.push(getMonthKey(d));
  }
  const byMonth = {};
  sessions.forEach(s => {
    const key = s.scheduled_date?.slice(0, 7);
    if (key) byMonth[key] = (byMonth[key] || 0) + 1;
  });
  const maxCount = Math.max(...last6.map(k => byMonth[k] || 0), 1);

  const formatDate = d =>
    d ? new Date(d + 'T00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

  return (
    <AppLayout role="coach">
      <div className="page-body">
        <div className="page-header">
          <div>
            <h1 className="page-title">Earnings</h1>
            <p className="page-subtitle">Your coaching revenue overview</p>
          </div>
        </div>

        {/* Stats */}
        <div className="stats-grid-3">
          <div className="stat-card">
            <span className="stat-icon">&#128197;</span>
            <div className="stat-value">${thisMonthTotal.toLocaleString()}</div>
            <div className="stat-label">This Month</div>
            <div className="stat-delta">{thisMonthSessions.length} session{thisMonthSessions.length !== 1 ? 's' : ''}</div>
          </div>
          <div className="stat-card">
            <span className="stat-icon">&#128198;</span>
            <div className="stat-value">${lastMonthTotal.toLocaleString()}</div>
            <div className="stat-label">Last Month</div>
            <div className="stat-delta">{lastMonthSessions.length} session{lastMonthSessions.length !== 1 ? 's' : ''}</div>
          </div>
          <div className="stat-card">
            <span className="stat-icon">&#128176;</span>
            <div className="stat-value">${allTimeTotal.toLocaleString()}</div>
            <div className="stat-label">All Time</div>
            <div className="stat-delta positive">{sessions.length} total sessions</div>
          </div>
        </div>

        {/* Monthly bar chart */}
        <div className="card">
          <p className="section-label" style={{ marginBottom: '20px' }}>SESSIONS LAST 6 MONTHS</p>
          <div className="bar-chart">
            {last6.map(key => {
              const count = byMonth[key] || 0;
              const pct   = maxCount > 0 ? (count / maxCount) * 100 : 0;
              const earn  = count * rate;
              return (
                <div className="bar-col" key={key}>
                  <span className="bar-val">{earn > 0 ? `$${earn.toLocaleString()}` : '—'}</span>
                  <div
                    className="bar"
                    style={{ height: `${Math.max(pct, count > 0 ? 8 : 0)}%` }}
                    title={`${count} session${count !== 1 ? 's' : ''} · $${earn.toLocaleString()}`}
                  />
                  <span className="bar-label">{monthLabel(key)}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sessions table */}
        <div>
          <p className="section-label" style={{ marginBottom: '12px' }}>COMPLETED SESSIONS</p>
          {sessions.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">&#128176;</span>
              <p>No completed sessions yet.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="tcco-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Client</th>
                    <th>Type</th>
                    <th>Duration</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map(s => (
                    <tr key={s.id}>
                      <td style={{ color: 'var(--text-soft)' }}>{formatDate(s.scheduled_date)}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div className="avatar avatar-sm">{(s.seeker?.name || '?')[0]}</div>
                          <span style={{ fontWeight: 600, color: 'var(--text-h)' }}>
                            {s.seeker?.name || 'Client'}
                          </span>
                        </div>
                      </td>
                      <td style={{ color: 'var(--text-soft)', textTransform: 'capitalize' }}>
                        {s.session_type || '—'}
                      </td>
                      <td>{s.duration_minutes || 55} min</td>
                      <td style={{ fontWeight: 700, color: 'var(--text-h)' }}>
                        ${(s.amount_paid || rate).toLocaleString()}
                      </td>
                      <td>
                        <span className="badge badge-green">completed</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Payout section */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <p style={{ fontWeight: 700, fontSize: '16px', color: 'var(--text-h)', marginBottom: '4px' }}>
                Payouts via Stripe Connect
              </p>
              <p style={{ fontSize: '13px', color: 'var(--text-soft)' }}>
                {coach?.stripe_account_id
                  ? `Next payout: ${new Date(now.getFullYear(), now.getMonth() + 1, 1).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} (estimated) · Monthly, 1st of each month`
                  : 'Connect your Stripe account to receive payouts.'}
              </p>
            </div>
            <button
              className="btn btn-outline"
              disabled={connecting}
              onClick={handleConnect}
            >
              {coach?.stripe_account_id
                ? (connecting ? 'Redirecting…' : 'Manage Payouts')
                : (connecting ? 'Connecting…' : 'Connect Stripe')}
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
