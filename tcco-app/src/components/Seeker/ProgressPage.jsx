import React, { useState, useEffect } from 'react';
import Icon from '../../ui/Icon';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/useAuth';
import { supabase } from '../../lib/supabase';
import AppLayout from '../Layout/AppLayout';
import '../Layout/AppLayout.css';

const MOOD_COLOR = { 1: '#D97706', 2: '#F59E0B', 3: '#EAB308', 4: '#16A34A', 5: '#06B6D4' };
const MOOD_EMOJI = { 1: '😔', 2: '😕', 3: '😐', 4: '😊', 5: '✨' };

export default function ProgressPage() {
  const { user } = useAuth();
  const [profile, setProfile]           = useState(null);
  const [journals, setJournals]         = useState([]);
  const [sessions, setSessions]         = useState([]);
  const [contentEng, setContentEng]     = useState([]);
  const [loading, setLoading]           = useState(true);

  useEffect(() => { if (!user?.id) return; loadData(); }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps // eslint-disable-line

  const loadData = async () => {
    try {
      const { data: profileRow } = await supabase
        .from('seeker_profiles').select('id').eq('user_id', user?.id).single();
      const profileId = profileRow?.id;
      if (!profileId) { setLoading(false); return; }

      const [{ data: sp }, { data: j }, { data: s }, { data: ce }] = await Promise.all([
        supabase.from('seeker_profiles').select('*').eq('id', profileId).single(),
        supabase.from('journal_entries').select('*').eq('seeker_id', profileId).order('date', { ascending: false }).limit(30),
        supabase.from('sessions').select('*').eq('seeker_id', profileId),
        supabase.from('content_engagement').select('*').eq('seeker_id', profileId),
      ]);
      setProfile(sp || {});
      setJournals(j || []);
      setSessions(s || []);
      setContentEng(ce || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AppLayout role="seeker">
        <div className="page-loading"><div className="spinner" /><p>Loading progress…</p></div>
      </AppLayout>
    );
  }

  const dayStreak = profile?.day_streak ?? 0;
  const sessionsCompleted = profile?.sessions_completed ?? 0;
  const moodAvg = profile?.mood_average ? Number(profile.mood_average).toFixed(1) : '—';
  const goals = profile?.onboarding_quiz?.goals || [];

  // Mood chart: last 14 entries with mood, reversed to oldest-first
  const moodEntries = journals.filter(j => j.mood).slice(0, 14).reverse();

  // Sessions by month (last 6 months)
  const sessionsByMonth = {};
  sessions.forEach(s => {
    if (!s.scheduled_date) return;
    const key = s.scheduled_date.slice(0, 7);
    sessionsByMonth[key] = (sessionsByMonth[key] || 0) + 1;
  });
  const monthKeys = Object.keys(sessionsByMonth).sort().slice(-6);
  const maxSess = Math.max(...monthKeys.map(k => sessionsByMonth[k]), 1);

  // Achievements
  const achievements = [
    { icon: 'seedling', label: 'First session',   desc: 'Completed your first coaching session',  earned: sessionsCompleted >= 1 },
    { icon: 'streak', label: '7-day streak',    desc: 'Maintained a 7-day practice streak',      earned: dayStreak >= 7 },
    { icon: 'journal', label: 'Journal starter', desc: 'Written your first journal entry',         earned: journals.length >= 1 },
    { icon: 'goal', label: '10 sessions',     desc: 'Completed 10 coaching sessions',           earned: sessionsCompleted >= 10 },
    { icon: 'mood', label: 'Mood tracker',    desc: 'Tracked mood for 7+ days',                earned: journals.length >= 7 },
    { icon: 'award', label: 'Library explorer',desc: 'Started 3+ pieces of content',            earned: contentEng.length >= 3 },
  ];

  return (
    <AppLayout role="seeker">
      <div className="page-body">
        <div className="page-header">
          <div>
            <h1 className="page-title">Progress</h1>
            <p className="page-subtitle">Track your coaching journey and celebrate your growth</p>
          </div>
        </div>

        {/* Hero stats */}
        <div className="stats-grid-4">
          <div className="stat-card">
            <span className="stat-icon"><Icon name="streak" size={16} /></span>
            <div className="stat-value">{dayStreak}</div>
            <div className="stat-label">Day Streak</div>
            <div className="stat-delta positive">Keep it going!</div>
          </div>
          <div className="stat-card">
            <span className="stat-icon"><Icon name="goal" size={16} /></span>
            <div className="stat-value">{sessionsCompleted}</div>
            <div className="stat-label">Sessions</div>
            <div className="stat-delta">All time</div>
          </div>
          <div className="stat-card">
            <span className="stat-icon"><Icon name="journal" size={16} /></span>
            <div className="stat-value">{journals.length}</div>
            <div className="stat-label">Journal Entries</div>
            <div className="stat-delta">Last 30 days</div>
          </div>
          <div className="stat-card">
            <span className="stat-icon"><Icon name="mood" size={16} /></span>
            <div className="stat-value">{moodAvg}</div>
            <div className="stat-label">Avg Mood</div>
            <div className="stat-delta">Out of 5.0</div>
          </div>
        </div>

        {/* Mood chart */}
        <div className="card">
          <p className="section-label" style={{ marginBottom: '20px' }}>MOOD OVER TIME</p>
          {moodEntries.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon"><Icon name="journal" size={22} /></span>
              <p>No mood data yet. Start journaling to track your mood.</p>
            </div>
          ) : (
            <div className="bar-chart" style={{ alignItems: 'flex-end', height: '140px' }}>
              {moodEntries.map((entry, i) => {
                const mood = entry.mood;
                const color = MOOD_COLOR[mood] || '#EAB308';
                const heightPct = (mood / 5) * 100;
                const dateShort = new Date(entry.date + 'T00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                return (
                  <div key={i} className="bar-col" style={{ flex: 1 }}>
                    <span className="bar-val">{mood}</span>
                    <div
                      className="bar"
                      style={{ height: `${heightPct}%`, background: color, minHeight: '8px' }}
                    />
                    <span className="bar-label" style={{ fontSize: '10px' }}>{dateShort}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Sessions by month */}
        <div className="card">
          <p className="section-label" style={{ marginBottom: '20px' }}>SESSIONS COMPLETED</p>
          {monthKeys.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon"><Icon name="goal" size={22} /></span>
              <p>No sessions recorded yet.</p>
            </div>
          ) : (
            <div className="bar-chart" style={{ alignItems: 'flex-end', height: '120px' }}>
              {monthKeys.map(key => {
                const count = sessionsByMonth[key];
                const pct = (count / maxSess) * 100;
                const [year, month] = key.split('-');
                const label = new Date(Number(year), Number(month) - 1).toLocaleDateString('en-US', { month: 'short' });
                return (
                  <div key={key} className="bar-col" style={{ flex: 1 }}>
                    <span className="bar-val">{count}</span>
                    <div className="bar" style={{ height: `${pct}%`, background: 'var(--accent)', minHeight: '8px' }} />
                    <span className="bar-label">{label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Achievements */}
        <div>
          <p className="section-label" style={{ marginBottom: '16px' }}>ACHIEVEMENTS</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
            {achievements.map((ach, i) => (
              <div
                key={i}
                className="card"
                style={{
                  borderLeft: ach.earned ? '4px solid var(--accent)' : undefined,
                  opacity: ach.earned ? 1 : 0.4,
                  filter: ach.earned ? 'none' : 'grayscale(1)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                <span style={{ fontSize: '28px' }}>{ach.icon}</span>
                <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-h)' }}>{ach.label}</p>
                <p style={{ fontSize: '13px', color: 'var(--text-soft)', lineHeight: 1.4 }}>{ach.desc}</p>
                {ach.earned && (
                  <span className="badge badge-green" style={{ width: 'fit-content', marginTop: '4px' }}>Earned</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Goals */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <p className="section-label">YOUR GOALS</p>
            <Link to="/settings" style={{ fontSize: '13px', color: 'var(--accent)' }}>Edit goals →</Link>
          </div>
          {goals.length === 0 ? (
            <p style={{ fontSize: '14px', color: 'var(--text-soft)' }}>Goals from your onboarding will appear here.</p>
          ) : (
            <div className="chips-row" style={{ flexWrap: 'wrap' }}>
              {goals.map((g, i) => (
                <span key={i} className="chip chip-active">{g}</span>
              ))}
            </div>
          )}
        </div>

        {/* Recent journal entries */}
        <div className="card">
          <p className="section-label" style={{ marginBottom: '16px' }}>RECENT ENTRIES</p>
          {journals.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon"><Icon name="journal" size={22} /></span>
              <p>No journal entries yet. Start writing to track your growth.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {journals.slice(0, 5).map((entry, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', paddingBottom: '12px', borderBottom: i < 4 ? '1px solid var(--border-card)' : 'none' }}>
                  <span style={{ fontSize: '20px', flexShrink: 0 }}>{MOOD_EMOJI[entry.mood] || '📓'}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '12px', color: 'var(--text-soft)', marginBottom: '2px' }}>
                      {new Date(entry.date + 'T00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </p>
                    <p style={{ fontSize: '14px', color: 'var(--text-h)', lineHeight: 1.4 }}>
                      {(entry.content || entry.mood_note || '').slice(0, 100)}
                      {(entry.content || entry.mood_note || '').length > 100 ? '…' : ''}
                    </p>
                  </div>
                  <Link to="/journal" style={{ fontSize: '13px', color: 'var(--accent)', flexShrink: 0 }}>Read →</Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
