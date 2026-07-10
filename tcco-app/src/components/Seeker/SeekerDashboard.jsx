import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/useAuth';
import { supabase } from '../../lib/supabase';
import AppLayout from '../Layout/AppLayout';
import SEO from '../shared/SEO';
import { showToast } from '../shared/Toast';
import { SkeletonDashboard } from '../shared/Skeleton';
import { SectionErrorBoundary } from '../shared/ErrorBoundary';
import ProfileCompleteness from '../shared/ProfileCompleteness';
import '../Layout/AppLayout.css';
import './Dashboard.css';


const QUICK_PATHS = [
  { icon: '🧭', label: 'Find a Coach',   sub: 'Browse coaches',        to: '/coaches' },
  { icon: '📓', label: 'Write in Journal', sub: 'Add an entry',        to: '/journal/new' },
  { icon: '📚', label: 'Explore Library', sub: '4 new resources',      to: '/library' },
  { icon: '📅', label: 'Book a Session',  sub: 'Next available: Mon',  to: '/coaches' },
];

const TYPE_META = {
  audio:      { icon: '🎧', label: 'Audio' },
  article:    { icon: '📄', label: 'Article' },
  live_event: { icon: '🎥', label: 'Live' },
  program:    { icon: '📋', label: 'Program' },
};

const moodConfig = [
  { rating: 1, emoji: '😔', label: 'Low',    color: '#D97706' },
  { rating: 2, emoji: '😕', label: 'Off',    color: '#F59E0B' },
  { rating: 3, emoji: '😐', label: 'Okay',   color: '#EAB308' },
  { rating: 4, emoji: '😊', label: 'Good',   color: '#16A34A' },
  { rating: 5, emoji: '✨', label: 'Bright', color: '#06B6D4' },
];

export default function SeekerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [seekerProfile, setSeekerProfile] = useState(null);
  const [nextSession, setNextSession]     = useState(null);
  const [content, setContent]             = useState([]);
  const [loading, setLoading]             = useState(true);

  const [intention, setIntention]         = useState('');
  const [editingIntent, setEditingIntent] = useState(false);
  const [intentDraft, setIntentDraft]     = useState('');
  const [moodRating, setMoodRating]       = useState(null);
  const [moodNote, setMoodNote]           = useState('');
  const [moodSaved, setMoodSaved]         = useState(false);

  // Load on mount
  useEffect(() => { if (!user?.id) return; loadAll(); }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadAll = async () => {
    try {
      const { data: profile, error: pe } = await supabase
        .from('seeker_profiles').select('*')
        .eq('user_id', user?.id)
        .single();
      if (pe) console.warn('profile fetch:', pe.message);
      setSeekerProfile(profile);

      const profileId = profile?.id;
      if (!profileId) { setLoading(false); return; }

      const { data: sessions } = await supabase
        .from('sessions')
        .select('*, coach:coach_profiles(name, title)')
        .eq('seeker_id', profileId)
        .in('status', ['scheduled', 'in_progress'])
        .order('scheduled_date', { ascending: true })
        .limit(1);
      setNextSession(sessions?.[0] || null);

      const { data: items } = await supabase
        .from('content')
        .select('*, coach:coach_profiles(name)')
        .eq('published', true)
        .eq('featured', true)
        .limit(3);
      setContent(items || []);
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const saveMood = async () => {
    if (!moodRating) return;
    const profileId = seekerProfile?.id;
    if (!profileId) { showToast('Profile not loaded yet', 'error'); return; }
    await supabase.from('journal_entries').insert({
      seeker_id: profileId,
      date: new Date().toISOString().split('T')[0],
      mood: moodRating,
      mood_note: moodNote,
      content: moodNote || 'Daily check-in',
    });
    setMoodSaved(true);
  };

  const saveIntention = () => { setIntention(intentDraft); setEditingIntent(false); };

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const formatDate = (dateStr, timeStr) => {
    if (!dateStr) return '';
    const d = new Date(`${dateStr}T${timeStr || '00:00'}`);
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
      + ' · ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <AppLayout role="seeker" profileName="Loading..." profileInitial="?">
        <SkeletonDashboard />
      </AppLayout>
    );
  }

  const name = seekerProfile?.name?.split(' ')[0] || 'Friend';

  return (
    <AppLayout role="seeker" seekerProfile={seekerProfile} profileName={seekerProfile?.name} profileInitial={seekerProfile?.name?.[0]} profileAvatar={seekerProfile?.avatar_url}>
      <SEO title="Dashboard" noIndex />
      <div className="db-main">

        {/* Profile completeness nudge */}
        <ProfileCompleteness
          settingsPath="/settings"
          fields={[
            { label: 'Name',       done: !!seekerProfile?.name },
            { label: 'Photo',      done: !!seekerProfile?.avatar_url },
            { label: 'Bio',        done: !!(seekerProfile?.bio?.length > 10) },
            { label: 'Goals',      done: !!(seekerProfile?.onboarding_quiz?.goals?.length > 0) },
          ]}
        />

        {/* Hero */}
        <div className="db-hero">
          <div className="db-hero-body">
            <h1 className="db-hero-greeting">{getGreeting()}, {name}.</h1>
            <p className="db-hero-tagline">One small thing today.</p>
            <p className="db-hero-message">
              You've been showing up. Keep the door open today.
            </p>
            <div className="db-hero-actions">
              {nextSession && (
                <button className="db-hero-btn db-hero-btn-primary" onClick={() => navigate('/sessions')}>
                  ▶ Join {nextSession.scheduled_time?.slice(0,5)} session
                </button>
              )}
              <button className="db-hero-btn db-hero-btn-outline" onClick={() => navigate('/journal/new')}>
                ✏️ Write a check-in
              </button>
            </div>
          </div>

          <div className="db-intention">
            <p className="db-intention-label">TODAY'S INTENTION</p>
            {editingIntent ? (
              <div className="db-intention-edit-row">
                <input
                  className="db-intention-input"
                  value={intentDraft}
                  onChange={e => setIntentDraft(e.target.value)}
                  placeholder="What's your intention for today?"
                  autoFocus
                />
                <button className="db-intention-save" onClick={saveIntention}>Save</button>
              </div>
            ) : (
              <div className="db-intention-display">
                <p className="db-intention-text">
                  "{intention || 'Set your intention for today'}"
                </p>
                <button
                  className="db-intention-edit-btn"
                  onClick={() => { setIntentDraft(intention); setEditingIntent(true); }}
                >Edit</button>
              </div>
            )}
          </div>
        </div>

        {/* Quick Paths */}
        <section className="db-section">
          <p className="db-section-title">QUICK PATHS</p>
          <div className="db-quick-grid">
            {QUICK_PATHS.map(p => (
              <button key={p.label} className="db-quick-card" onClick={() => navigate(p.to)}>
                <span className="db-quick-icon">{p.icon}</span>
                <span className="db-quick-label">{p.label}</span>
                <span className="db-quick-sub">{p.sub}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Stats */}
        <div className="db-stats-grid">
          <div className="db-stat-card">
            <span className="db-stat-icon">💧</span>
            <div className="db-stat-value">{seekerProfile?.day_streak ?? 0}</div>
            <div className="db-stat-label">DAY STREAK</div>
            <div className="db-stat-delta positive">+3 this week</div>
          </div>
          <div className="db-stat-card">
            <span className="db-stat-icon">⏱️</span>
            <div className="db-stat-value">4h 28m</div>
            <div className="db-stat-label">PRACTICE THIS WEEK</div>
            <div className="db-stat-delta positive">+12% vs last week</div>
          </div>
          <div className="db-stat-card">
            <span className="db-stat-icon">🎯</span>
            <div className="db-stat-value">{seekerProfile?.sessions_completed ?? 0}</div>
            <div className="db-stat-label">SESSIONS COMPLETED</div>
            <div className="db-stat-delta neutral">Next milestone: 10</div>
          </div>
          <div className="db-stat-card">
            <span className="db-stat-icon">❤️</span>
            <div className="db-stat-value">{Number(seekerProfile?.mood_average ?? 0).toFixed(1)}</div>
            <div className="db-stat-label">AVG MOOD · 14 DAYS</div>
            <div className="db-stat-delta positive">Trending up</div>
          </div>
        </div>

        {/* Next Session */}
        {nextSession ? (
          <section className="db-section">
            <p className="db-section-title">UPCOMING SESSION</p>
            <div className="db-session-card">
              <div className="db-session-left">
                <div className="db-coach-avatar">{nextSession.coach?.name?.[0] ?? '?'}</div>
                <div>
                  <p className="db-coach-name">{nextSession.coach?.name ?? 'Your Coach'}</p>
                  <p className="db-coach-title">{nextSession.coach?.title ?? 'Coach'}</p>
                </div>
              </div>
              <div className="db-session-meta">
                <p className="db-session-when">{formatDate(nextSession.scheduled_date, nextSession.scheduled_time)}</p>
                <p className="db-session-type">📹 Video · {nextSession.duration_minutes ?? 55} min</p>
              </div>
              <div className="db-session-actions">
                <button className="db-session-btn" onClick={() => navigate('/sessions')}>Prep notes</button>
                <button className="db-session-btn db-session-join">🔗 Join</button>
              </div>
            </div>
          </section>
        ) : (
          <section className="db-section">
            <p className="db-section-title">UPCOMING SESSION</p>
            <div className="db-session-empty">
              <span>📅</span>
              <p>No sessions scheduled yet.</p>
              <button className="db-session-book-btn" onClick={() => navigate('/coaches')}>Book a session →</button>
            </div>
          </section>
        )}

        {/* Daily Check-in */}
        <section className="db-section">
          <div className="db-checkin-card">
            <div className="db-checkin-header">
              <p className="db-section-title" style={{ margin: 0 }}>DAILY CHECK-IN</p>
              <button className="db-skip-btn">Skip</button>
            </div>
            {moodSaved ? (
              <div className="db-checkin-saved">
                <span>✅</span>
                <p>Check-in saved. See you tomorrow.</p>
              </div>
            ) : (
              <>
                <p className="db-checkin-q">How are you arriving today?</p>
                <div className="db-mood-row">
                  {moodConfig.map(m => (
                    <button
                      key={m.rating}
                      className={`db-mood-btn ${moodRating === m.rating ? 'db-mood-active' : ''}`}
                      style={moodRating === m.rating ? { background: m.color, borderColor: m.color } : {}}
                      onClick={() => setMoodRating(m.rating)}
                    >
                      <span className="db-mood-emoji">{m.emoji}</span>
                      <span className="db-mood-label" style={moodRating === m.rating ? { color: '#fff' } : {}}>{m.label}</span>
                    </button>
                  ))}
                </div>
                <textarea
                  className="db-checkin-note"
                  placeholder="Add a note (optional) →"
                  value={moodNote}
                  onChange={e => setMoodNote(e.target.value)}
                />
                {moodRating && (
                  <button className="db-checkin-submit" onClick={saveMood}>Save check-in</button>
                )}
              </>
            )}
          </div>
        </section>

        {/* Library */}
        {content.length > 0 && (
          <SectionErrorBoundary label="library">
            <section className="db-section">
              <div className="db-section-header">
                <p className="db-section-title">FROM THE LIBRARY</p>
                <button className="db-see-all" onClick={() => navigate('/library')}>See all →</button>
              </div>
              <div className="db-library-grid">
                {content.map(item => {
                  const meta = TYPE_META[item.type] || { icon: '📄', label: item.type };
                  return (
                    <div key={item.id} className="db-library-card">
                      <div className="db-library-type">
                        <span>{meta.icon}</span>
                        <span>{meta.label}</span>
                        {item.duration_minutes && <span className="db-library-dur">{item.duration_minutes} min</span>}
                      </div>
                      <p className="db-library-title">{item.title}</p>
                      <p className="db-library-desc">{item.description}</p>
                      {item.coach?.name && <p className="db-library-coach">by {item.coach.name}</p>}
                    </div>
                  );
                })}
              </div>
            </section>
          </SectionErrorBoundary>
        )}

      </div>
    </AppLayout>
  );
}
