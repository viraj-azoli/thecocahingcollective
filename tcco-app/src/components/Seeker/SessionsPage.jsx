import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/useAuth';
import { supabase } from '../../lib/supabase';
import AppLayout from '../Layout/AppLayout';
import VideoRoom from '../shared/VideoRoom';
import SEO from '../shared/SEO';
import { showToast } from '../shared/Toast';
import {
  PageHeader, Card, Button, Tabs, SessionCard, EmptyState,
  Modal, ConfirmDialog, StarRating, Badge,
} from '../../ui';
import { formatWhen } from '../../lib/datetime';
import '../Layout/AppLayout.css';

export default function SessionsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab]             = useState('upcoming');
  const [sessions, setSessions]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [prepNotes, setPrepNotes] = useState({});
  const [prepFor, setPrepFor]     = useState(null);   // session open in the notes dialog
  const [ratings, setRatings]     = useState({});
  const [feedback, setFeedback]   = useState({});
  const [savedReviews, setSavedReviews] = useState({});
  const [seekerProfileId, setSeekerProfileId] = useState(null);
  const [rescheduleSession, setRescheduleSession] = useState(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelling, setCancelling]     = useState(false);
  const [roomUrl, setRoomUrl]           = useState(null);
  const [activeSession, setActiveSession] = useState(null);
  const [joiningId, setJoiningId]       = useState(null);

  useEffect(() => { if (!user?.id) return; loadSessions(); }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Returning from Stripe Checkout — the booking is confirmed by the webhook,
  // which can land just after the redirect.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('payment') !== 'success') return;
    showToast('Payment received — your session is confirmed.', 'success');
    window.history.replaceState({}, '', window.location.pathname);
    const timers = [1500, 4000].map(ms => setTimeout(() => loadSessions(), ms));
    return () => timers.forEach(clearTimeout);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadSessions = async () => {
    try {
      const { data: profileRow } = await supabase
        .from('seeker_profiles').select('id').eq('user_id', user?.id).single();
      const profileId = profileRow?.id;
      setSeekerProfileId(profileId);
      if (!profileId) { setLoading(false); return; }

      const { data } = await supabase
        .from('sessions')
        .select('*, coach:coach_profiles(id, name, title, avatar_url)')
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
      setRatings(rMap); setFeedback(fMap); setPrepNotes(pMap);

      const completedIds = all.filter(s => s.status === 'completed').map(s => s.id);
      if (completedIds.length > 0) {
        const { data: revs } = await supabase.from('reviews').select('*').in('session_id', completedIds);
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
        setActiveSession(session); setRoomUrl(session.zoom_link); return;
      }
      const { data, error } = await supabase.functions.invoke('create-daily-room', {
        body: { sessionId: session.id },
      });
      if (error) throw error;
      if (data?.url) {
        await supabase.from('sessions').update({ zoom_link: data.url }).eq('id', session.id);
        setSessions(prev => prev.map(s => s.id === session.id ? { ...s, zoom_link: data.url } : s));
        setActiveSession(session); setRoomUrl(data.url);
      }
    } catch (err) {
      showToast('Could not start session. Please try again.', 'error');
    } finally {
      setJoiningId(null);
    }
  };

  // The query sorts newest-first, which is right for history but backwards for
  // what's coming: it put the furthest-away session at the top. Upcoming reads
  // soonest-first; past and cancelled stay most-recent-first.
  const byDate = (a, b) =>
    `${a.scheduled_date}T${a.scheduled_time || ''}`.localeCompare(`${b.scheduled_date}T${b.scheduled_time || ''}`);

  const upcoming  = sessions.filter(s => s.status === 'scheduled' || s.status === 'in_progress').sort(byDate);
  const past      = sessions.filter(s => s.status === 'completed');
  const cancelled = sessions.filter(s => s.status === 'cancelled');

  const savePrepNotes = async (sessionId) => {
    const { error } = await supabase
      .from('sessions').update({ notes_seeker: prepNotes[sessionId] || '' }).eq('id', sessionId);
    if (error) { showToast('Failed to save notes', 'error'); return; }
    setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, notes_seeker: prepNotes[sessionId] || '' } : s));
    setPrepFor(null);
    showToast('Notes saved');
  };

  // Late-cancellation window, surfaced in the dialog rather than in OS chrome.
  const hoursUntil = (session) => {
    if (!session) return Infinity;
    const at = new Date(`${session.scheduled_date}T${session.scheduled_time || '00:00'}`);
    return (at - new Date()) / 3600000;
  };

  const confirmCancel = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    const { error } = await supabase
      .from('sessions').update({ status: 'cancelled' }).eq('id', cancelTarget.id);
    setCancelling(false);
    if (error) { showToast('Failed to cancel session', 'error'); return; }
    setCancelTarget(null);
    showToast('Session cancelled');
    loadSessions();
  };

  const reschedule = async () => {
    if (!rescheduleSession || !rescheduleDate || !rescheduleTime) return;
    const { error } = await supabase.from('sessions').update({
      scheduled_date: rescheduleDate,
      scheduled_time: rescheduleTime + ':00',
      status: 'scheduled',
    }).eq('id', rescheduleSession.id);
    if (error) { showToast('Reschedule failed', 'error'); return; }
    showToast('Session rescheduled');
    setRescheduleSession(null); setRescheduleDate(''); setRescheduleTime('');
    loadSessions();
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
    if (error) { showToast('Failed to save review', 'error'); return; }
    showToast('Review published');
    loadSessions();
  };

  const TABS = [
    { value: 'upcoming',  label: 'Upcoming',  count: upcoming.length },
    { value: 'past',      label: 'Past',      count: past.length },
    { value: 'cancelled', label: 'Cancelled', count: cancelled.length },
  ];

  if (loading) {
    return (
      <AppLayout role="seeker">
        <div className="cc cc-page"><div className="cc-loading"><span /></div></div>
      </AppLayout>
    );
  }

  const late = hoursUntil(cancelTarget) < 24;

  return (
    <>
      <AppLayout role="seeker">
        <SEO title="Sessions" noIndex />
        <div className="cc cc-page">
          <PageHeader
            title="Sessions"
            subtitle="Your coaching sessions, past and upcoming."
            actions={<Button variant="primary" icon="plus" onClick={() => navigate('/coaches')}>Book a session</Button>}
          />

          <div>
            <Tabs tabs={TABS} value={tab} onChange={setTab} />

            {tab === 'upcoming' && (
              upcoming.length === 0 ? (
                <EmptyState
                  icon="sessions"
                  title="Nothing scheduled"
                  body="When you book with a coach, your sessions appear here."
                  action={<Button variant="primary" onClick={() => navigate('/coaches')}>Find a coach</Button>}
                />
              ) : (
                <div className="cc-stack cc-gap-3">
                  {upcoming.map(s => (
                    <SessionCard
                      key={s.id}
                      session={s}
                      variant="upcoming"
                      onJoin={joinSession}
                      onPrep={() => setPrepFor(s)}
                      onCancel={() => setCancelTarget(s)}
                    />
                  ))}
                </div>
              )
            )}

            {tab === 'past' && (
              past.length === 0 ? (
                <EmptyState icon="clock" title="No past sessions yet" body="Completed sessions will be listed here." />
              ) : (
                <div className="cc-stack cc-gap-3">
                  {past.map(s => {
                    const review = savedReviews[s.id];
                    return (
                      <Card key={s.id} flush>
                        <SessionCard session={s} variant="past" onRebook={() => navigate(`/coaches/${s.coach?.id || ''}`)} />
                        <div className="cc-session-review">
                          {review ? (
                            <div className="cc-inline cc-gap-3">
                              <StarRating value={review.rating} readOnly />
                              <span className="cc-muted" style={{ fontSize: 'var(--cc-text-sm)' }}>
                                {review.body || 'Review submitted'}
                              </span>
                            </div>
                          ) : (
                            <div className="cc-stack cc-gap-3">
                              <div className="cc-inline cc-gap-3">
                                <span className="cc-eyebrow" style={{ margin: 0 }}>How was it?</span>
                                <StarRating
                                  value={ratings[s.id] || 0}
                                  onChange={v => setRatings(p => ({ ...p, [s.id]: v }))}
                                />
                              </div>
                              {ratings[s.id] > 0 && (
                                <>
                                  <textarea
                                    className="cc-input cc-textarea"
                                    rows={2}
                                    placeholder="Anything you'd like to share (optional)"
                                    value={feedback[s.id] || ''}
                                    onChange={e => setFeedback(p => ({ ...p, [s.id]: e.target.value }))}
                                  />
                                  <div>
                                    <Button variant="primary" size="sm" onClick={() => saveReview(s.id)}>
                                      Publish review
                                    </Button>
                                  </div>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )
            )}

            {tab === 'cancelled' && (
              cancelled.length === 0 ? (
                <EmptyState icon="close" title="Nothing cancelled" body="Cancelled sessions would show up here." />
              ) : (
                <div className="cc-stack cc-gap-3">
                  {cancelled.map(s => (
                    <SessionCard key={s.id} session={s} variant="cancelled" />
                  ))}
                </div>
              )
            )}
          </div>
        </div>
      </AppLayout>

      {/* Prep notes */}
      <Modal
        open={!!prepFor}
        onClose={() => setPrepFor(null)}
        title="Prep notes"
        footer={
          <>
            <Button onClick={() => setPrepFor(null)}>Cancel</Button>
            <Button variant="primary" onClick={() => savePrepNotes(prepFor.id)}>Save notes</Button>
          </>
        }
      >
        {prepFor && (
          <>
            <p className="cc-muted" style={{ margin: 0, fontSize: 'var(--cc-text-sm)' }}>
              Session with {prepFor.coach?.name || 'your coach'} ·{' '}
              {formatWhen(prepFor.scheduled_date, prepFor.scheduled_time)}
            </p>
            <textarea
              className="cc-input cc-textarea"
              rows={6}
              autoFocus
              placeholder="What would you like to focus on?"
              value={prepNotes[prepFor.id] || ''}
              onChange={e => setPrepNotes(p => ({ ...p, [prepFor.id]: e.target.value }))}
            />
          </>
        )}
      </Modal>

      {/* Reschedule */}
      <Modal
        open={!!rescheduleSession}
        onClose={() => setRescheduleSession(null)}
        title="Reschedule session"
        size="sm"
        footer={
          <>
            <Button onClick={() => setRescheduleSession(null)}>Cancel</Button>
            <Button
              variant="primary"
              disabled={!rescheduleDate || !rescheduleTime}
              onClick={reschedule}
            >
              Reschedule
            </Button>
          </>
        }
      >
        <label className="cc-field">
          <span className="cc-field-label">New date</span>
          <input type="date" className="cc-input" value={rescheduleDate} onChange={e => setRescheduleDate(e.target.value)} />
        </label>
        <label className="cc-field">
          <span className="cc-field-label">New time</span>
          <input type="time" className="cc-input" value={rescheduleTime} onChange={e => setRescheduleTime(e.target.value)} />
        </label>
      </Modal>

      {/* Cancellation — the fee warning used to appear in OS browser chrome */}
      <ConfirmDialog
        open={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        onConfirm={confirmCancel}
        destructive
        loading={cancelling}
        title="Cancel this session?"
        body={cancelTarget
          ? `Your session with ${cancelTarget.coach?.name || 'your coach'} on ${formatWhen(cancelTarget.scheduled_date, cancelTarget.scheduled_time)} will be cancelled.`
          : ''}
        warning={late ? 'Less than 24 hours until this session — you may be charged a cancellation fee.' : undefined}
        confirmLabel="Cancel session"
        cancelLabel="Keep it"
      />

      {roomUrl && (
        <VideoRoom
          roomUrl={roomUrl}
          sessionTitle={activeSession?.coach?.name ? `Session with ${activeSession.coach.name}` : 'Coaching Session'}
          onLeave={() => { setRoomUrl(null); setActiveSession(null); }}
        />
      )}
    </>
  );
}
