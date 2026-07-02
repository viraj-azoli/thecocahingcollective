import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/useAuth';
import { supabase } from '../../lib/supabase';
import AppLayout from '../Layout/AppLayout';
import VideoRoom from '../Shared/VideoRoom';
import { showToast } from '../shared/Toast';
import '../Layout/AppLayout.css';

function formatSessionDate(dateStr, timeStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T00:00');
  const today = new Date(); today.setHours(0,0,0,0);
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  const timeFormatted = timeStr
    ? new Date(`2000-01-01T${timeStr}`).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    : '';
  if (d.getTime() === today.getTime()) return `Today at ${timeFormatted}`;
  if (d.getTime() === tomorrow.getTime()) return `Tomorrow at ${timeFormatted}`;
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }) + (timeFormatted ? ` · ${timeFormatted}` : '');
}

function initials(name) {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  return parts.length >= 2 ? parts[0][0] + parts[parts.length - 1][0] : parts[0][0];
}

const AVATAR_COLORS = [
  'linear-gradient(135deg,#2D9E6B,#1a7a52)',
  'linear-gradient(135deg,#6366f1,#4f46e5)',
  'linear-gradient(135deg,#f59e0b,#d97706)',
  'linear-gradient(135deg,#ec4899,#be185d)',
  'linear-gradient(135deg,#06b6d4,#0284c7)',
];
function avatarColor(name) {
  let sum = 0; for (let c of (name || '')) sum += c.charCodeAt(0);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}

function StarPicker({ value, onChange }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="stars-row">
      {[1,2,3,4,5].map(i => (
        <span
          key={i}
          className={`star ${i <= (hover || value) ? 'filled' : ''}`}
          style={{ fontSize: '24px', cursor: 'pointer' }}
          onMouseEnter={() => setHover(i)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(i)}
        >★</span>
      ))}
    </div>
  );
}

function StaticStars({ value }) {
  return (
    <div className="stars-row">
      {[1,2,3,4,5].map(i => (
        <span key={i} className={`star star-static ${i <= value ? 'filled' : ''}`} style={{ fontSize: '16px' }}>★</span>
      ))}
    </div>
  );
}

export default function SessionsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab]             = useState('upcoming');
  const [sessions, setSessions]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [prepNotes, setPrepNotes] = useState({});
  const [prepOpen, setPrepOpen]   = useState({});
  const [ratings, setRatings]     = useState({});
  const [feedback, setFeedback]   = useState({});
  const [savedReviews, setSavedReviews] = useState({}); // sessionId → review row
  const [seekerProfileId, setSeekerProfileId] = useState(null);
  const [rescheduleSession, setRescheduleSession] = useState(null); // session being rescheduled
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [roomUrl, setRoomUrl]         = useState(null);
  const [activeSession, setActiveSession] = useState(null);
  const [joiningId, setJoiningId]     = useState(null);

  useEffect(() => { if (!user?.id) return; loadSessions(); }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadSessions = async () => {
    try {
      const { data: profileRow } = await supabase
        .from('seeker_profiles').select('id').eq('user_id', user?.id).single();
      const profileId = profileRow?.id;
      if (!profileId) { setLoading(false); return; }
      setSeekerProfileId(profileId);

      const { data } = await supabase
        .from('sessions')
        .select('*, coach:coach_profiles(name, title, avatar_url)')
        .eq('seeker_id', profileId)
        .order('scheduled_date', { ascending: false });

      const all = data || [];
      setSessions(all);

      const rMap = {}, fMap = {}, pMap = {};
      all.forEach(s => {
        if (s.rating_by_seeker) rMap[s.id] = s.rating_by_seeker;
        if (s.feedback_by_seeker) fMap[s.id] = s.feedback_by_seeker;
        if (s.notes_seeker) pMap[s.id] = s.notes_seeker;
      });
      setRatings(rMap);
      setFeedback(fMap);
      setPrepNotes(pMap);

      // Load existing reviews for completed sessions
      const completedIds = all.filter(s => s.status === 'completed').map(s => s.id);
      if (completedIds.length > 0) {
        const { data: revs } = await supabase
          .from('reviews')
          .select('*')
          .in('session_id', completedIds);
        const revMap = {};
        (revs || []).forEach(r => { revMap[r.session_id] = r; });
        setSavedReviews(revMap);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const joinSession = async (session) => {
    setJoiningId(session.id);
    try {
      if (session.zoom_link) {
        setActiveSession(session);
        setRoomUrl(session.zoom_link);
        return;
      }
      const { data, error } = await supabase.functions.invoke('create-daily-room', {
        body: { sessionId: session.id },
      });
      if (error) throw error;
      if (data?.url) {
        await supabase.from('sessions').update({ zoom_link: data.url }).eq('id', session.id);
        setSessions(prev => prev.map(s => s.id === session.id ? { ...s, zoom_link: data.url } : s));
        setActiveSession(session);
        setRoomUrl(data.url);
      }
    } catch (err) {
      showToast('Could not start session. Please try again.', 'error');
    } finally {
      setJoiningId(null);
    }
  };

  const upcoming   = sessions.filter(s => s.status === 'scheduled' || s.status === 'in_progress');
  const past       = sessions.filter(s => s.status === 'completed');
  const cancelled  = sessions.filter(s => s.status === 'cancelled');

  const savePrepNotes = async (sessionId) => {
    const { error } = await supabase
      .from('sessions')
      .update({ notes_seeker: prepNotes[sessionId] || '' })
      .eq('id', sessionId);
    if (!error) showToast('Notes saved!');
    else showToast('Failed to save notes', 'error');
  };

  const cancelSession = async (session) => {
    const sessionDate = new Date(`${session.scheduled_date}T${session.scheduled_time}`);
    const hoursUntil = (sessionDate - new Date()) / 3600000;

    if (hoursUntil < 24) {
      const proceed = window.confirm(
        `⚠️ Late cancellation: less than 24 hours until your session. You may be charged a cancellation fee. Continue?`
      );
      if (!proceed) return;
    } else {
      if (!window.confirm('Cancel this session?')) return;
    }

    const { error } = await supabase
      .from('sessions')
      .update({ status: 'cancelled' })
      .eq('id', session.id);
    if (!error) {
      showToast('Session cancelled');
      loadSessions();
    } else {
      showToast('Failed to cancel session', 'error');
    }
  };

  const reschedule = async () => {
    if (!rescheduleSession || !rescheduleDate || !rescheduleTime) return;
    const { error } = await supabase.from('sessions').update({
      scheduled_date: rescheduleDate,
      scheduled_time: rescheduleTime + ':00',
      status: 'scheduled',
    }).eq('id', rescheduleSession.id);
    if (!error) {
      showToast('Session rescheduled!');
      setRescheduleSession(null);
      setRescheduleDate('');
      setRescheduleTime('');
      loadSessions();
    } else {
      showToast('Reschedule failed', 'error');
    }
  };

  const saveReview = async (sessionId) => {
    const session = sessions.find(s => s.id === sessionId);
    if (!session || !seekerProfileId) return;

    const { error } = await supabase.from('reviews').insert({
      session_id: sessionId,
      coach_id: session.coach_id,
      seeker_id: seekerProfileId,
      rating: ratings[sessionId],
      body: feedback[sessionId] || '',
      is_public: true,
    });
    if (!error) {
      showToast('Review published!');
      loadSessions();
    } else {
      showToast('Failed to save review', 'error');
    }
  };

  if (loading) {
    return (
      <AppLayout role="seeker">
        <div className="page-loading"><div className="spinner" /><p>Loading sessions…</p></div>
      </AppLayout>
    );
  }

  return (
    <>
    <AppLayout role="seeker">
      <div className="page-body">
        <div className="page-header">
          <div>
            <h1 className="page-title">Sessions</h1>
            <p className="page-subtitle">Manage your coaching sessions</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="tabs">
          <button className={`tab ${tab === 'upcoming' ? 'tab-active' : ''}`} onClick={() => setTab('upcoming')}>
            Upcoming ({upcoming.length})
          </button>
          <button className={`tab ${tab === 'past' ? 'tab-active' : ''}`} onClick={() => setTab('past')}>
            Past ({past.length})
          </button>
          <button className={`tab ${tab === 'cancelled' ? 'tab-active' : ''}`} onClick={() => setTab('cancelled')}>
            Cancelled ({cancelled.length})
          </button>
        </div>

        {/* Upcoming */}
        {tab === 'upcoming' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {upcoming.length === 0 ? (
              <div className="empty-state">
                <span className="empty-icon">📅</span>
                <p>No upcoming sessions.</p>
                <button className="btn btn-primary btn-sm" onClick={() => navigate('/coaches')}>Browse coaches</button>
              </div>
            ) : upcoming.map(s => (
              <div key={s.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Top row */}
                <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  <div
                    className="avatar avatar-md"
                    style={{ background: avatarColor(s.coach?.name), color: '#fff', fontWeight: 700, flexShrink: 0 }}
                  >
                    {initials(s.coach?.name)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-h)' }}>{s.coach?.name || 'Coach'}</p>
                    <p style={{ fontSize: '13px', color: 'var(--text-soft)' }}>{s.coach?.title}</p>
                    <p style={{ fontSize: '14px', color: 'var(--text-b)', marginTop: '6px' }}>
                      📅 {formatSessionDate(s.scheduled_date, s.scheduled_time)}
                    </p>
                    <p style={{ fontSize: '13px', color: 'var(--text-soft)', marginTop: '2px' }}>
                      📹 {s.session_type === 'video' ? 'Video' : s.session_type} · {s.duration_minutes || 55} min
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', flexWrap: 'wrap', flexShrink: 0 }}>
                    <span className={`badge ${s.status === 'in_progress' ? 'badge-green' : 'badge-blue'}`}>
                      {s.status === 'in_progress' ? '🔴 Live now' : '⏳ Upcoming'}
                    </span>
                    <button
                      className="btn btn-primary btn-sm"
                      disabled={joiningId === s.id}
                      onClick={() => joinSession(s)}
                    >
                      {joiningId === s.id ? '…' : '🔗 Join'}
                    </button>
                  </div>
                </div>

                {/* Prep notes */}
                <div style={{ borderTop: '1px solid var(--border-card)', paddingTop: '12px' }}>
                  <button
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600, color: 'var(--text-b)', padding: 0, display: 'flex', alignItems: 'center', gap: '6px' }}
                    onClick={() => setPrepOpen(o => ({ ...o, [s.id]: !o[s.id] }))}
                  >
                    📝 Prep notes {prepOpen[s.id] ? '▲' : '▼'}
                  </button>
                  {prepOpen[s.id] && (
                    <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <textarea
                        className="form-textarea"
                        style={{ minHeight: '80px' }}
                        placeholder="Add notes to prepare for your session…"
                        value={prepNotes[s.id] || ''}
                        onChange={e => setPrepNotes(n => ({ ...n, [s.id]: e.target.value }))}
                      />
                      <button className="btn btn-outline btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => savePrepNotes(s.id)}>
                        Save notes
                      </button>
                    </div>
                  )}
                </div>

                {/* Reschedule + Cancel */}
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => { setRescheduleSession(s); setRescheduleDate(''); setRescheduleTime(''); }}
                  >
                    🔄 Reschedule
                  </button>
                  <button
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: '#dc2626', padding: 0, textAlign: 'left' }}
                    onClick={() => cancelSession(s)}
                  >
                    Cancel session
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Past */}
        {tab === 'past' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {past.length === 0 ? (
              <div className="empty-state">
                <span className="empty-icon">📋</span>
                <p>No past sessions yet.</p>
              </div>
            ) : past.map(s => {
              const savedRev = savedReviews[s.id];
              const alreadyRated = !!(savedRev || (s.rating_by_seeker && s.rating_by_seeker > 0));
              return (
                <div key={s.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Top */}
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                    <div
                      className="avatar avatar-md"
                      style={{ background: avatarColor(s.coach?.name), color: '#fff', fontWeight: 700, flexShrink: 0 }}
                    >
                      {initials(s.coach?.name)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-h)' }}>{s.coach?.name || 'Coach'}</p>
                      <p style={{ fontSize: '13px', color: 'var(--text-soft)' }}>{s.coach?.title}</p>
                      <p style={{ fontSize: '14px', color: 'var(--text-b)', marginTop: '6px' }}>
                        📅 {formatSessionDate(s.scheduled_date, s.scheduled_time)}
                      </p>
                    </div>
                    <span className="badge badge-green">✓ Completed</span>
                  </div>

                  {/* Review section */}
                  <div style={{ borderTop: '1px solid var(--border-card)', paddingTop: '14px' }}>
                    {alreadyRated ? (
                      <div>
                        <p style={{ fontSize: '13px', color: 'var(--text-soft)', marginBottom: '6px' }}>Your review</p>
                        <StaticStars value={savedRev?.rating || s.rating_by_seeker || 0} />
                        {(savedRev?.body || s.feedback_by_seeker) && (
                          <p style={{ fontSize: '14px', color: 'var(--text-b)', marginTop: '8px', fontStyle: 'italic' }}>
                            "{savedRev?.body || s.feedback_by_seeker}"
                          </p>
                        )}
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-h)' }}>Leave a review</p>
                        <StarPicker
                          value={ratings[s.id] || 0}
                          onChange={v => setRatings(r => ({ ...r, [s.id]: v }))}
                        />
                        <textarea
                          className="form-textarea"
                          style={{ minHeight: '72px' }}
                          placeholder="Share feedback for your coach…"
                          value={feedback[s.id] || ''}
                          onChange={e => setFeedback(f => ({ ...f, [s.id]: e.target.value }))}
                        />
                        <button
                          className="btn btn-primary btn-sm"
                          style={{ alignSelf: 'flex-start' }}
                          disabled={!ratings[s.id]}
                          onClick={() => saveReview(s.id)}
                        >
                          Save review
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Cancelled */}
        {tab === 'cancelled' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {cancelled.length === 0 ? (
              <div className="empty-state">
                <span className="empty-icon">🚫</span>
                <p>No cancelled sessions.</p>
              </div>
            ) : cancelled.map(s => (
              <div key={s.id} className="card" style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap', opacity: 0.7 }}>
                <div
                  className="avatar avatar-md"
                  style={{ background: avatarColor(s.coach?.name), color: '#fff', fontWeight: 700, flexShrink: 0 }}
                >
                  {initials(s.coach?.name)}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-h)' }}>{s.coach?.name || 'Coach'}</p>
                  <p style={{ fontSize: '13px', color: 'var(--text-soft)' }}>
                    {formatSessionDate(s.scheduled_date, s.scheduled_time)}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span className="badge badge-gray">Cancelled</span>
                  <button className="btn btn-outline btn-sm" onClick={() => navigate('/coaches')}>Book again</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>

    {roomUrl && (
      <VideoRoom
        roomUrl={roomUrl}
        sessionTitle={activeSession?.coach?.name ? `Session with ${activeSession.coach.name}` : 'Coaching Session'}
        onLeave={() => { setRoomUrl(null); setActiveSession(null); }}
      />
    )}

    {/* Reschedule modal */}
    {rescheduleSession && (
      <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setRescheduleSession(null); }}>
        <div className="modal">
          <div className="modal-header">
            <h3>Reschedule session</h3>
            <button className="modal-close" onClick={() => setRescheduleSession(null)}>×</button>
          </div>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <p style={{ fontSize: '14px', color: 'var(--text-soft)' }}>
              Rescheduling session with {rescheduleSession.coach?.name}
            </p>
            <div>
              <label className="form-label">New date</label>
              <input
                className="form-input"
                type="date"
                min={new Date().toISOString().split('T')[0]}
                value={rescheduleDate}
                onChange={e => setRescheduleDate(e.target.value)}
              />
            </div>
            <div>
              <label className="form-label">New time</label>
              <select
                className="form-input"
                value={rescheduleTime}
                onChange={e => setRescheduleTime(e.target.value)}
              >
                <option value="">Pick a time</option>
                {['09:00','10:00','11:00','14:00','15:00','16:00','17:00'].map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-outline" onClick={() => setRescheduleSession(null)}>Cancel</button>
            <button
              className="btn btn-primary"
              onClick={reschedule}
              disabled={!rescheduleDate || !rescheduleTime}
            >
              Confirm reschedule
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
