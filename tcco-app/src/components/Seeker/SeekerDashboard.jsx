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
import {
  PageHeader, SectionHeader, Card, Button, StatTile, StatRow,
  EmptyState, Avatar, Tag, MoodScale, ActionCard, ActionGrid, Icon,
} from '../../ui';
import { greeting, formatWhen } from '../../lib/datetime';
import '../Layout/AppLayout.css';

const QUICK_PATHS = [
  { icon: 'coaches',  label: 'Find a coach',   sub: 'Browse the collective', to: '/coaches' },
  { icon: 'journal',  label: 'Write an entry', sub: 'Journal',               to: '/journal/new' },
  { icon: 'library',  label: 'Explore library', sub: 'Audio and reading',    to: '/library' },
  { icon: 'sessions', label: 'Book a session', sub: 'Find a time',           to: '/coaches' },
];

const TYPE_LABEL = { audio: 'Audio', article: 'Article', live_event: 'Live', program: 'Program' };

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
    const { error } = await supabase.from('journal_entries').insert({
      seeker_id: profileId,
      date: new Date().toISOString().split('T')[0],
      mood: moodRating,
      mood_note: moodNote,
      content: moodNote || 'Daily check-in',
    });
    if (error) { showToast('Could not save check-in. Please try again.', 'error'); return; }
    setMoodSaved(true);
  };

  const saveIntention = () => { setIntention(intentDraft); setEditingIntent(false); };

  if (loading) {
    return (
      <AppLayout role="seeker" profileName="Loading..." profileInitial="?">
        <SkeletonDashboard />
      </AppLayout>
    );
  }

  const name = seekerProfile?.name?.split(' ')[0] || 'Friend';

  return (
    <AppLayout
      role="seeker"
      seekerProfile={seekerProfile}
      profileName={seekerProfile?.name}
      profileInitial={seekerProfile?.name?.[0]}
      profileAvatar={seekerProfile?.avatar_url}
    >
      <SEO title="Dashboard" noIndex />
      <div className="cc cc-page">

        <ProfileCompleteness
          settingsPath="/settings"
          fields={[
            { label: 'Name',  done: !!seekerProfile?.name },
            { label: 'Photo', done: !!seekerProfile?.avatar_url },
            { label: 'Bio',   done: !!((seekerProfile?.bio || seekerProfile?.onboarding_quiz?.bio)?.length > 10) },
            { label: 'Goals', done: !!(seekerProfile?.onboarding_quiz?.goals?.length > 0) },
          ]}
        />

        <PageHeader
          eyebrow={new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' })}
          title={`${greeting()}, ${name}.`}
          subtitle="One small thing today."
          actions={
            <>
              {nextSession && (
                <Button variant="primary" icon="video" onClick={() => navigate('/sessions')}>
                  Join session
                </Button>
              )}
              <Button icon="journal" onClick={() => navigate('/journal/new')}>Write a check-in</Button>
            </>
          }
        />

        {/* Today's intention */}
        <Card>
          <SectionHeader label="Today's intention" />
          {editingIntent ? (
            <div className="cc-inline cc-gap-2">
              <input
                className="cc-input cc-grow"
                value={intentDraft}
                onChange={e => setIntentDraft(e.target.value)}
                placeholder="What's your intention for today?"
                onKeyDown={e => e.key === 'Enter' && saveIntention()}
                autoFocus
              />
              <Button variant="primary" onClick={saveIntention}>Save</Button>
            </div>
          ) : (
            <div className="cc-inline cc-gap-3">
              <p className={`cc-grow${intention ? '' : ' cc-quiet'}`} style={{ margin: 0 }}>
                {intention || 'Set your intention for today.'}
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setIntentDraft(intention); setEditingIntent(true); }}
              >
                {intention ? 'Edit' : 'Set'}
              </Button>
            </div>
          )}
        </Card>

        {/* Quick paths */}
        <section>
          <SectionHeader label="Quick paths" />
          <ActionGrid>
            {QUICK_PATHS.map(p => (
              <ActionCard key={p.label} icon={p.icon} label={p.label} sub={p.sub} onClick={() => navigate(p.to)} />
            ))}
          </ActionGrid>
        </section>

        {/* Stats — three real figures. The previous fourth tile read
            seekerProfile.total_sessions, a column that does not exist on
            seeker_profiles, so it always rendered 0. */}
        <StatRow columns={3}>
          <StatTile
            icon="streak"
            value={seekerProfile?.day_streak ?? 0}
            label="Day streak"
          />
          <StatTile
            icon="goal"
            value={seekerProfile?.sessions_completed ?? 0}
            label="Sessions completed"
          />
          <StatTile
            icon="mood"
            value={Number(seekerProfile?.mood_average ?? 0).toFixed(1)}
            label="Average mood · 14 days"
          />
        </StatRow>

        {/* Next session */}
        <section>
          <SectionHeader
            label="Upcoming session"
            action={nextSession && (
              <Button variant="ghost" size="sm" iconAfter="chevronRight" onClick={() => navigate('/sessions')}>
                All sessions
              </Button>
            )}
          />
          {nextSession ? (
            <Card flush>
              <div className="cc-row">
                <Avatar name={nextSession.coach?.name} size="md" />
                <div className="cc-row-main">
                  <div className="cc-row-title">{nextSession.coach?.name ?? 'Your coach'}</div>
                  <div className="cc-row-meta">{nextSession.coach?.title ?? 'Coach'}</div>
                </div>
                <div className="cc-stack" style={{ textAlign: 'right' }}>
                  <div className="cc-row-title" style={{ fontWeight: 400 }}>
                    {formatWhen(nextSession.scheduled_date, nextSession.scheduled_time)}
                  </div>
                  <div className="cc-row-meta">Video · {nextSession.duration_minutes ?? 55} min</div>
                </div>
                <Button variant="primary" size="sm" icon="video" onClick={() => navigate('/sessions')}>
                  Join
                </Button>
              </div>
            </Card>
          ) : (
            <EmptyState
              icon="sessions"
              title="No sessions scheduled"
              body="When you book with a coach, your next session will appear here."
              action={<Button variant="primary" onClick={() => navigate('/coaches')}>Find a coach</Button>}
            />
          )}
        </section>

        {/* Daily check-in */}
        <section>
          <SectionHeader
            label="Daily check-in"
            action={!moodSaved && (
              <Button variant="ghost" size="sm" onClick={() => setMoodSaved(true)}>Skip</Button>
            )}
          />
          <Card>
            {moodSaved ? (
              <div className="cc-inline cc-gap-2 cc-muted">
                <Icon name="success" size={16} />
                <span>Check-in saved. See you tomorrow.</span>
              </div>
            ) : (
              <div className="cc-stack cc-gap-4">
                <p style={{ margin: 0 }}>How are you arriving today?</p>
                <MoodScale value={moodRating} onChange={setMoodRating} />
                <textarea
                  className="cc-input cc-textarea"
                  placeholder="Add a note (optional)"
                  value={moodNote}
                  onChange={e => setMoodNote(e.target.value)}
                  rows={3}
                />
                <div>
                  <Button variant="primary" disabled={!moodRating} onClick={saveMood}>
                    Save check-in
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </section>

        {/* Library */}
        {content.length > 0 && (
          <SectionErrorBoundary label="library">
            <section>
              <SectionHeader
                label="From the library"
                action={
                  <Button variant="ghost" size="sm" iconAfter="chevronRight" onClick={() => navigate('/library')}>
                    See all
                  </Button>
                }
              />
              <div className="cc-action-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                {content.map(item => (
                  <Card key={item.id} interactive onClick={() => navigate('/library')}>
                    <div className="cc-inline cc-gap-2" style={{ marginBottom: 'var(--cc-space-3)' }}>
                      <Tag>{TYPE_LABEL[item.type] || item.type}</Tag>
                      {item.duration_minutes && <span className="cc-quiet" style={{ fontSize: 'var(--cc-text-xs)' }}>{item.duration_minutes} min</span>}
                    </div>
                    <div className="cc-row-title">{item.title}</div>
                    {item.description && <p className="cc-muted" style={{ fontSize: 'var(--cc-text-sm)', margin: 'var(--cc-space-2) 0 0' }}>{item.description}</p>}
                    {item.coach?.name && <p className="cc-quiet" style={{ fontSize: 'var(--cc-text-xs)', margin: 'var(--cc-space-3) 0 0' }}>by {item.coach.name}</p>}
                  </Card>
                ))}
              </div>
            </section>
          </SectionErrorBoundary>
        )}

      </div>
    </AppLayout>
  );
}
