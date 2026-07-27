import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import AppLayout from '../Layout/AppLayout';
import '../Layout/AppLayout.css';

function KPIStatsCard({ icon, label, value, delta, color = 'var(--primary)' }) {
  return (
    <div style={{
      background: 'var(--card-bg)', border: '1px solid var(--border-card)',
      borderRadius: 'var(--r-md)', padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '24px' }}>{icon}</span>
        {delta && <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--success)' }}>{delta}</span>}
      </div>
      <div style={{ fontSize: '32px', fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-soft)', letterSpacing: '0.05em' }}>{label}</div>
    </div>
  );
}

function AnalyticsBarChart({ data, label }) {
  if (!data?.length) return null;
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-soft)', letterSpacing: '0.05em' }}>{label}</p>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: '120px' }}>
        {data.map(d => (
          <div key={d.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '10px', color: 'var(--text-soft)', fontWeight: 600 }}>
              {d.value > 0 ? (d.value >= 1000 ? `$${(d.value/1000).toFixed(1)}k` : `$${d.value}`) : ''}
            </span>
            <div style={{
              width: '100%', background: 'var(--primary)',
              height: `${Math.max((d.value / max) * 90, d.value > 0 ? 4 : 0)}px`,
              borderRadius: '4px 4px 0 0',
              transition: 'height .3s',
            }} />
            <span style={{ fontSize: '9px', color: 'var(--text-soft)', textAlign: 'center' }}>{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminAnalyticsPage() {
  const [stats, setStats]     = useState(null);
  const [revenueByMonth, setRevenueByMonth] = useState([]);
  const [recentSessions, setRecentSessions] = useState([]);
  const [leadingCoaches, setLeadingCoaches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadAnalyticsData(); }, []);

  const loadAnalyticsData = async () => {
    try {
      const [
        { count: totalSeekers },
        { count: totalCoaches },
        { count: totalSessions },
        { count: totalCompleted },
        { data: rawRevenueData },
        { data: recent },
        { data: top },
        { data: completedByCoach },
      ] = await Promise.all([
        supabase.from('seeker_profiles').select('*', { count: 'exact', head: true }),
        supabase.from('coach_profiles').select('*', { count: 'exact', head: true }).eq('verified', true),
        supabase.from('sessions').select('*', { count: 'exact', head: true }),
        supabase.from('sessions').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
        supabase.from('sessions').select('scheduled_date, amount_paid').eq('status', 'completed').order('scheduled_date'),
        supabase.from('sessions').select('*, seeker:seeker_profiles(name), coach:coach_profiles(name)').order('created_at', { ascending: false }).limit(10),
        // coach_profiles has no sessions_completed column — asking for it made
        // PostgREST reject the whole query, which is why Top Coaches was empty.
        // The count is derived from the sessions table instead.
        supabase.from('coach_profiles').select('id, name, rating, review_count').eq('verified', true).order('rating', { ascending: false }).limit(5),
        supabase.from('sessions').select('coach_id').eq('status', 'completed'),
      ]);

      const completedCount = {};
      (completedByCoach || []).forEach(s => {
        completedCount[s.coach_id] = (completedCount[s.coach_id] || 0) + 1;
      });

      setStats({ totalSeekers, totalCoaches, totalSessions, totalCompleted });
      setRecentSessions(recent || []);
      setLeadingCoaches((top || []).map(c => ({ ...c, sessions_completed: completedCount[c.id] || 0 })));

      // Group revenue by month
      const byMonth = {};
      const MONTHS_LIST = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      (rawRevenueData || []).forEach(s => {
        if (!s.scheduled_date || !s.amount_paid) return;
        const d = new Date(s.scheduled_date + 'T00:00');
        const key = `${MONTHS_LIST[d.getMonth()]} '${String(d.getFullYear()).slice(2)}`;
        byMonth[key] = (byMonth[key] || 0) + Number(s.amount_paid);
      });
      setRevenueByMonth(Object.entries(byMonth).slice(-6).map(([label, value]) => ({ label, value })));
    } catch (err) {
      console.error('Error loading analytics', err);
    } finally {
      setLoading(false);
    }
  };

  const combinedRevenue = revenueByMonth.reduce((sum, d) => sum + d.value, 0);

  if (loading) return (
    <AppLayout role="admin">
      <div className="page-loading"><div className="spinner" /><p>Loading platform metrics data…</p></div>
    </AppLayout>
  );

  return (
    <AppLayout role="admin">
      <div className="page-body">
        <div className="page-header">
          <div>
            <h1 className="page-title">Analytics</h1>
            <p className="page-subtitle">Platform overview and performance metrics</p>
          </div>
        </div>

        {/* KPI cards */}
        <div className="admin-kpis" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
          <KPIStatsCard icon="🧭" label="TOTAL SEEKERS" value={stats?.totalSeekers ?? 0} />
          <KPIStatsCard icon="🎓" label="VERIFIED COACHES" value={stats?.totalCoaches ?? 0} />
          <KPIStatsCard icon="📅" label="SESSIONS COMPLETED" value={stats?.totalCompleted ?? 0} />
          <KPIStatsCard icon="💰" label="TOTAL REVENUE" value={`$${combinedRevenue.toLocaleString()}`} color="var(--accent)" />
        </div>

        {/* Revenue chart */}
        <div style={{
          background: 'var(--card-bg)', border: '1px solid var(--border-card)',
          borderRadius: 'var(--r-md)', padding: '24px',
        }}>
          {revenueByMonth.length > 0
            ? <AnalyticsBarChart data={revenueByMonth} label="REVENUE BY MONTH (LAST 6 MONTHS)" />
            : <p style={{ color: 'var(--text-soft)', fontSize: '14px' }}>No revenue data yet.</p>
          }
        </div>

        {/* Two-column: top coaches + recent sessions */}
        <div className="admin-cols" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          {/* Top coaches */}
          <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-card)', borderRadius: 'var(--r-md)', padding: '20px' }}>
            <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-soft)', marginBottom: '16px', letterSpacing: '0.05em' }}>TOP COACHES BY RATING</p>
            {leadingCoaches.length === 0
              ? <p style={{ color: 'var(--text-soft)', fontSize: '14px' }}>No coaches yet.</p>
              : leadingCoaches.map((c, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: i < leadingCoaches.length - 1 ? '1px solid var(--border-card)' : 'none' }}>
                  <div>
                    <p style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-h)' }}>{c.name}</p>
                    <p style={{ fontSize: '12px', color: 'var(--text-soft)' }}>{c.sessions_completed || 0} sessions · {c.review_count || 0} reviews</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: '#f59e0b' }}>★ {c.rating ? Number(c.rating).toFixed(1) : '—'}</span>
                  </div>
                </div>
              ))
            }
          </div>

          {/* Recent sessions */}
          <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-card)', borderRadius: 'var(--r-md)', padding: '20px' }}>
            <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-soft)', marginBottom: '16px', letterSpacing: '0.05em' }}>RECENT SESSIONS</p>
            {recentSessions.length === 0
              ? <p style={{ color: 'var(--text-soft)', fontSize: '14px' }}>No sessions yet.</p>
              : recentSessions.map((s, i) => (
                <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: i < recentSessions.length - 1 ? '1px solid var(--border-card)' : 'none', fontSize: '13px' }}>
                  <div>
                    <p style={{ fontWeight: 600, color: 'var(--text-h)' }}>{s.seeker?.name || '—'} → {s.coach?.name || '—'}</p>
                    <p style={{ color: 'var(--text-soft)' }}>{s.scheduled_date}</p>
                  </div>
                  <span className={`badge ${s.status === 'completed' ? 'badge-green' : s.status === 'scheduled' ? 'badge-blue' : 'badge-gray'}`}>
                    {s.status}
                  </span>
                </div>
              ))
            }
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .admin-kpis { grid-template-columns: repeat(2, 1fr) !important; }
          .admin-cols { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 600px) {
          .admin-kpis { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </AppLayout>
  );
}
