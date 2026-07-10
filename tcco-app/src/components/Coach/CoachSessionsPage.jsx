import React, { useState, useEffect } from 'react';
import { useAuth } from '../../auth/useAuth';
import { supabase } from '../../lib/supabase';
import AppLayout from '../Layout/AppLayout';
import VideoRoom from '../shared/VideoRoom';
import { showToast } from '../shared/Toast';
import '../Layout/AppLayout.css';

const DAY_ABBR = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function getWeekDates(weekOffset = 0) {
  const now = new Date();
  now.setDate(now.getDate() + weekOffset * 7);
  const dayOfWeek = now.getDay(); // 0=Sun
  const monday = new Date(now);
  monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  return DAY_ABBR.map((_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function formatWeekLabel(dates) {
  const opts = { month: 'long', day: 'numeric' };
  return `Week of ${dates[0].toLocaleDateString('en-US', opts)}`;
}

export default function CoachSessionsPage() {
  const { user } = useAuth();
  const [sessions, setSessions]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [weekOffset, setWeekOffset]   = useState(0);
  const [tab, setTab]                 = useState('upcoming'); // 'upcoming' | 'past'
  const [notesModal, setNotesModal]   = useState(null); // session object
  const [coachNotes, setCoachNotes]   = useState('');
  const [saving, setSaving]           = useState(false);
  const [roomUrl, setRoomUrl]         = useState(null);
  const [activeSession, setActiveSession] = useState(null);
  const [joiningId, setJoiningId]     = useState(null);

  useEffect(() => { if (!user?.id) return; loadSessions(); }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadSessions = async () => {
    try {
      const { data: coachRow } = await supabase
        .from('coach_profiles').select('id').eq('user_id', user?.id).single();
      const coachId = coachRow?.id;
      if (!coachId) { setLoading(false); return; }

      const { data, error } = await supabase
        .from('sessions')
        .select('*, seeker:seeker_profiles(id, name, avatar_url)')
        .eq('coach_id', coachId)
        .order('scheduled_date', { ascending: false });
      if (error) throw error;
      setSessions(data || []);
    } catch (err) {
      console.error(err);
      showToast('Failed to load sessions', 'error');
    } finally {
      setLoading(false);
    }
  };

  const openNotes = (session) => {
    setNotesModal(session);
    setCoachNotes(session.notes_coach || '');
  };

  const closeNotes = () => {
    setNotesModal(null);
    setCoachNotes('');
  };

  const saveNotes = async () => {
    if (!notesModal) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('sessions')
        .update({ notes_coach: coachNotes })
        .eq('id', notesModal.id);
      if (error) throw error;
      setSessions(prev => prev.map(s => s.id === notesModal.id ? { ...s, notes_coach: coachNotes } : s));
      showToast('Notes saved!');
      closeNotes();
    } catch (err) {
      showToast('Failed to save notes', 'error');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = d =>
    d ? new Date(d + 'T00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : '—';

  const todayStr = new Date().toISOString().split('T')[0];

  const weekDates = getWeekDates(weekOffset);
  const weekStart = weekDates[0].toISOString().split('T')[0];
  const weekEnd   = weekDates[6].toISOString().split('T')[0];

  const getSessionsForDay = (date) => {
    const ds = date.toISOString().split('T')[0];
    return sessions.filter(s => s.scheduled_date === ds);
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

  const upcomingSessions = sessions.filter(s => s.scheduled_date >= todayStr && s.status !== 'cancelled');
  const pastSessions     = sessions.filter(s => s.scheduled_date < todayStr || s.status === 'completed');

  const displayedSessions = tab === 'upcoming' ? upcomingSessions : pastSessions;

  if (loading) {
    return (
      <AppLayout role="coach">
        <div className="page-loading"><div className="spinner" /><p>Loading sessions…</p></div>
      </AppLayout>
    );
  }

  return (
    <>
    <AppLayout role="coach">
      <div className="page-body">
        <div className="page-header">
          <div>
            <h1 className="page-title">Sessions</h1>
            <p className="page-subtitle">Manage your coaching sessions</p>
          </div>
        </div>

        {/* Week view */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <button
              className="btn btn-outline btn-sm"
              onClick={() => setWeekOffset(o => o - 1)}
            >
              &#8592; Prev
            </button>
            <p style={{ fontWeight: 700, color: 'var(--text-h)', fontSize: '14px' }}>
              {formatWeekLabel(weekDates)}
            </p>
            <button
              className="btn btn-outline btn-sm"
              onClick={() => setWeekOffset(o => o + 1)}
            >
              Next &#8594;
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
            {weekDates.map((date, i) => {
              const daySessions = getSessionsForDay(date);
              const ds = date.toISOString().split('T')[0];
              const isToday = ds === todayStr;
              return (
                <div
                  key={i}
                  style={{
                    borderRadius: 'var(--r-md)',
                    border: isToday ? '2px solid var(--accent)' : '1px solid var(--border-card)',
                    padding: '10px 6px',
                    minHeight: '90px',
                    background: isToday ? '#F0FAF5' : '#fff',
                  }}
                >
                  <p style={{
                    fontSize: '11px', fontWeight: 700,
                    color: isToday ? 'var(--accent)' : 'var(--text-soft)',
                    textAlign: 'center', marginBottom: '2px',
                  }}>
                    {DAY_ABBR[i]}
                  </p>
                  <p style={{
                    fontSize: '13px', fontWeight: isToday ? 700 : 400,
                    color: isToday ? 'var(--accent)' : 'var(--text-b)',
                    textAlign: 'center', marginBottom: '6px',
                  }}>
                    {date.getDate()}
                  </p>
                  {daySessions.map(s => (
                    <div
                      key={s.id}
                      onClick={() => openNotes(s)}
                      style={{
                        background: 'var(--accent)', color: '#fff',
                        borderRadius: '4px', padding: '3px 5px',
                        fontSize: '10px', fontWeight: 600,
                        marginBottom: '3px', cursor: 'pointer',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}
                      title={`${s.seeker?.name || 'Client'} at ${s.scheduled_time?.slice(0,5)}`}
                    >
                      {s.seeker?.name?.split(' ')[0] || 'Client'} {s.scheduled_time?.slice(0,5)}
                    </div>
                  ))}
                  {daySessions.length === 0 && (
                    <p style={{ fontSize: '11px', color: 'var(--text-soft)', textAlign: 'center' }}>—</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Session list */}
        <div>
          <div className="tabs" style={{ marginBottom: '16px' }}>
            <button
              className={`tab ${tab === 'upcoming' ? 'tab-active' : ''}`}
              onClick={() => setTab('upcoming')}
            >
              Upcoming ({upcomingSessions.length})
            </button>
            <button
              className={`tab ${tab === 'past' ? 'tab-active' : ''}`}
              onClick={() => setTab('past')}
            >
              Past ({pastSessions.length})
            </button>
          </div>

          {displayedSessions.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">&#128197;</span>
              <p>{tab === 'upcoming' ? 'No upcoming sessions.' : 'No past sessions.'}</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="tcco-table">
                <thead>
                  <tr>
                    <th>Client</th>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Duration</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedSessions.map(s => (
                    <tr key={s.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div className="avatar avatar-sm">{(s.seeker?.name || '?')[0]}</div>
                          <span style={{ fontWeight: 600, color: 'var(--text-h)' }}>
                            {s.seeker?.name || 'Client'}
                          </span>
                        </div>
                      </td>
                      <td style={{ color: 'var(--text-soft)' }}>{formatDate(s.scheduled_date)}</td>
                      <td style={{ color: 'var(--text-soft)' }}>{s.scheduled_time?.slice(0,5) || '—'}</td>
                      <td>{s.duration_minutes || 55} min</td>
                      <td>
                        <span className={`badge ${
                          s.status === 'completed' ? 'badge-green' :
                          s.status === 'scheduled' ? 'badge-blue' : 'badge-gray'
                        }`}>
                          {s.status}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            className="btn btn-outline btn-sm"
                            onClick={() => openNotes(s)}
                          >
                            Notes
                          </button>
                          {s.status === 'scheduled' && (
                            <button
                              className="btn btn-primary btn-sm"
                              disabled={joiningId === s.id}
                              onClick={() => joinSession(s)}
                            >
                              {joiningId === s.id ? '…' : '🔗 Join'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Notes modal */}
      {notesModal && (
        <div className="modal-overlay" onClick={closeNotes}>
          <div className="modal" style={{ maxWidth: '520px', width: '100%' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <p style={{ fontWeight: 700, fontSize: '16px', color: 'var(--text-h)' }}>
                  Session Notes
                </p>
                <p style={{ fontSize: '13px', color: 'var(--text-soft)', marginTop: '2px' }}>
                  {notesModal.seeker?.name || 'Client'} · {formatDate(notesModal.scheduled_date)}
                </p>
              </div>
              <button className="modal-close" onClick={closeNotes}>×</button>
            </div>

            <div className="modal-body">
              {notesModal.notes_seeker && (
                <div className="form-group">
                  <label className="form-label">Seeker Notes (read-only)</label>
                  <div style={{
                    background: 'var(--beige)', borderRadius: 'var(--r-md)',
                    padding: '12px', fontSize: '13px', color: 'var(--text-b)',
                    lineHeight: 1.6, border: '1px solid var(--border-card)',
                  }}>
                    {notesModal.notes_seeker}
                  </div>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Your Notes</label>
                <textarea
                  className="form-textarea"
                  style={{ minHeight: '120px' }}
                  placeholder="Add your coaching notes for this session…"
                  value={coachNotes}
                  onChange={e => setCoachNotes(e.target.value)}
                />
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-outline" onClick={closeNotes}>Cancel</button>
              <button
                className="btn btn-primary"
                onClick={saveNotes}
                disabled={saving}
              >
                {saving ? 'Saving…' : 'Save Notes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>

    {roomUrl && (
      <VideoRoom
        roomUrl={roomUrl}
        sessionTitle={activeSession?.seeker?.name ? `Session with ${activeSession.seeker.name}` : 'Coaching Session'}
        onLeave={() => { setRoomUrl(null); setActiveSession(null); }}
      />
    )}
    </>
  );
}
