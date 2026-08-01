import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../auth/useAuth';
import { supabase } from '../../lib/supabase';
import { appBaseUrl } from '../../lib/appUrl';
import { track } from '../../lib/analytics';
import AppLayout from '../Layout/AppLayout';
import SEO from '../shared/SEO';
import {
  PageHeader, SectionHeader, Card, Button, Badge, Tag, Avatar, Icon,
  StarRating, Modal, EmptyState, DateGrid, TimeSlotGrid,
} from '../../ui';
import { formatDateLong } from '../../lib/datetime';
import '../Layout/AppLayout.css';

const SLOTS = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'];
const CONTENT_ICON = { audio: 'audio', article: 'article', live_event: 'live', program: 'program' };

const timeLabel = (t) => {
  if (!t) return '';
  const h = parseInt(t.split(':')[0], 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h === 0 ? 12 : h > 12 ? h - 12 : h}:00 ${ampm}`;
};

// ── Booking wizard ───────────────────────────────────────────────────────────
//
// step was 1-4 with a separate showIntake boolean, and the two were
// independent — so the header could render "Pick a time" and "Intake form"
// at once, and step 4 (a success screen) became unreachable when booking
// started redirecting to Stripe. One enum makes those states impossible.
const STEPS = {
  date:    { title: 'Pick a date',      back: null },
  time:    { title: 'Pick a time',      back: 'date' },
  intake:  { title: 'A few questions',  back: 'time' },
  confirm: { title: 'Confirm booking',  back: 'time' },
};

function BookingModal({ coach, seekerProfileId, open, onClose }) {
  const [step, setStep]                 = useState('date');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [taken, setTaken]               = useState([]);
  const [saving, setSaving]             = useState(false);
  const [error, setError]               = useState('');
  const [intakeForm, setIntakeForm]     = useState(null);
  const [answers, setAnswers]           = useState({});

  useEffect(() => {
    supabase.from('intake_forms').select('*').eq('coach_id', coach.id).maybeSingle()
      .then(({ data }) => setIntakeForm(data));
  }, [coach.id]);

  const days = [];
  for (let i = 1; i <= 14; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    days.push(d);
  }

  useEffect(() => {
    if (!selectedDate) return;
    supabase
      .from('sessions')
      .select('scheduled_time, status, created_at')
      .eq('coach_id', coach.id)
      .eq('scheduled_date', selectedDate)
      .in('status', ['scheduled', 'in_progress', 'pending_payment'])
      .then(({ data }) => {
        // A slot mid-checkout is held so two seekers can't both pay for it,
        // but only for the 30-minute life of the Stripe session.
        const cutoff = Date.now() - 30 * 60 * 1000;
        setTaken((data || [])
          .filter(s => s.status !== 'pending_payment' || new Date(s.created_at).getTime() > cutoff)
          .map(s => s.scheduled_time?.slice(0, 5)));
      });
  }, [selectedDate, coach.id]);

  const needsIntake = !!(intakeForm?.is_required && intakeForm?.questions?.length);

  const pickTime = (t) => {
    setSelectedTime(t);
    setStep(needsIntake ? 'intake' : 'confirm');
  };

  const handleBook = async () => {
    setSaving(true);
    setError('');
    try {
      // Payment-first: the row starts as pending_payment and the webhook
      // promotes it once the seeker has actually paid the coach.
      const { data: session, error: err } = await supabase.from('sessions').insert({
        coach_id: coach.id,
        seeker_id: seekerProfileId,
        scheduled_date: selectedDate,
        scheduled_time: selectedTime + ':00',
        duration_minutes: 55,
        session_type: 'video',
        status: 'pending_payment',
      }).select().single();
      if (err) throw err;

      if (intakeForm?.id && Object.keys(answers).length > 0 && seekerProfileId) {
        const { error: intakeErr } = await supabase.from('intake_responses').insert({
          form_id: intakeForm.id,
          seeker_id: seekerProfileId,
          session_id: session?.id,
          answers,
        });
        if (intakeErr) console.warn('Could not save intake response:', intakeErr.message);
      }

      track('booking_payment_started', { coachId: coach.id, coachName: coach.name, date: selectedDate });

      const { data: checkout, error: checkoutErr } = await supabase.functions.invoke(
        'create-session-checkout', { body: { sessionId: session.id } },
      );
      if (checkoutErr || !checkout?.url) {
        await supabase.from('sessions').delete().eq('id', session.id);
        throw new Error(checkout?.error || 'Could not start payment. Please try again.');
      }
      window.location.href = checkout.url;
    } catch (e) {
      setError(e.message || 'Booking failed. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const back = STEPS[step].back;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={STEPS[step].title}
      size="lg"
      footer={back && (
        <Button icon="chevronLeft" onClick={() => setStep(back)}>Back</Button>
      )}
    >
      {step === 'date' && (
        <>
          <p className="cc-muted" style={{ margin: 0 }}>
            Choose a day for your session with {coach.name}.
          </p>
          <DateGrid
            days={days}
            value={selectedDate}
            onChange={(d) => { setSelectedDate(d); setStep('time'); }}
          />
        </>
      )}

      {step === 'time' && (
        <>
          <p className="cc-muted" style={{ margin: 0 }}>
            {formatDateLong(selectedDate)} · 55 minute video session
          </p>
          <TimeSlotGrid slots={SLOTS} value={selectedTime} taken={taken} onChange={pickTime} />
        </>
      )}

      {step === 'intake' && intakeForm && (
        <>
          <p className="cc-muted" style={{ margin: 0 }}>
            {coach.name} would like to learn a little about you first.
          </p>
          {(intakeForm.questions || []).map(q => (
            <div key={q.id} className="cc-field">
              <span className="cc-field-label">
                {q.question}{q.required && <span style={{ color: 'var(--cc-danger)' }}> *</span>}
              </span>

              {q.type === 'text' && (
                <textarea
                  className="cc-input cc-textarea"
                  rows={3}
                  value={answers[q.id] || ''}
                  onChange={e => setAnswers(a => ({ ...a, [q.id]: e.target.value }))}
                />
              )}

              {q.type === 'choice' && (
                <div className="cc-stack cc-gap-2">
                  {(q.options || []).map(opt => (
                    <label key={opt} className="cc-check">
                      <input
                        type="checkbox"
                        checked={(answers[q.id] || []).includes(opt)}
                        onChange={e => {
                          const prev = answers[q.id] || [];
                          setAnswers(a => ({
                            ...a,
                            [q.id]: e.target.checked ? [...prev, opt] : prev.filter(x => x !== opt),
                          }));
                        }}
                      />
                      <span>{opt}</span>
                    </label>
                  ))}
                </div>
              )}

              {q.type === 'scale' && (
                <div className="cc-slots" style={{ gridTemplateColumns: 'repeat(10, 1fr)' }}>
                  {[1,2,3,4,5,6,7,8,9,10].map(n => (
                    <button
                      key={n}
                      type="button"
                      className={`cc-slot${answers[q.id] === n ? ' cc-slot-on' : ''}`}
                      onClick={() => setAnswers(a => ({ ...a, [q.id]: n }))}
                    >{n}</button>
                  ))}
                </div>
              )}
            </div>
          ))}
          <div>
            <Button variant="primary" iconAfter="chevronRight" onClick={() => setStep('confirm')}>
              Continue
            </Button>
          </div>
        </>
      )}

      {step === 'confirm' && (
        <>
          <Card quiet>
            <SectionHeader label="Session summary" />
            <div className="cc-inline cc-gap-3" style={{ marginBottom: 'var(--cc-space-4)' }}>
              <Avatar name={coach.name} src={coach.avatar_url} size="md" />
              <div>
                <div className="cc-row-title">{coach.name}</div>
                <div className="cc-row-meta">{coach.title}</div>
              </div>
            </div>
            <dl className="cc-defs">
              <div className="cc-def"><dt>Date</dt><dd>{formatDateLong(selectedDate)}</dd></div>
              <div className="cc-def"><dt>Time</dt><dd>{timeLabel(selectedTime)}</dd></div>
              <div className="cc-def"><dt>Duration</dt><dd>55 minutes</dd></div>
              <div className="cc-def"><dt>Format</dt><dd>Video</dd></div>
              {coach.price_per_session && (
                <div className="cc-def cc-def-total">
                  <dt>Total</dt><dd>${coach.price_per_session}</dd>
                </div>
              )}
            </dl>
          </Card>

          <p className="cc-quiet" style={{ fontSize: 'var(--cc-text-sm)', margin: 0 }}>
            You'll be taken to Stripe to pay {coach.name} directly. Your session is
            confirmed once payment completes.
          </p>

          {error && (
            <p className="cc-alert cc-alert-danger" role="alert">
              <Icon name="alert" size={14} /><span>{error}</span>
            </p>
          )}

          <Button variant="primary" size="lg" block loading={saving} onClick={handleBook}>
            Continue to payment
          </Button>
        </>
      )}
    </Modal>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function CoachProfilePage() {
  const { user } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [coach, setCoach]     = useState(null);
  const [content, setContent] = useState([]);
  const [packages, setPackages] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [seekerProfileId, setSeekerProfileId] = useState(null);

  useEffect(() => {
    loadData();
    if (new URLSearchParams(location.search).get('book') === 'true') setShowModal(true);
  }, []); // eslint-disable-line

  const loadData = async () => {
    try {
      const [{ data: c }, { data: cont }, { data: profileRow }, { data: pkgs }, { data: revRows }] = await Promise.all([
        supabase.from('coach_profiles').select('*').eq('id', id).single(),
        supabase.from('content').select('*').eq('coach_id', id).eq('published', true).order('created_at', { ascending: false }),
        supabase.from('seeker_profiles').select('id').eq('user_id', user?.id).single(),
        supabase.from('session_packages').select('*').eq('coach_id', id).eq('is_active', true).order('price'),
        supabase.from('reviews').select('*, seeker:seeker_profiles(name)').eq('coach_id', id).eq('is_public', true).order('created_at', { ascending: false }).limit(10),
      ]);
      setCoach(c);
      setContent(cont || []);
      setPackages(pkgs || []);
      setReviews(revRows || []);
      setSeekerProfileId(profileRow?.id || null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AppLayout role="seeker">
        <div className="cc cc-page"><div className="cc-loading"><span /></div></div>
      </AppLayout>
    );
  }

  if (!coach) {
    return (
      <AppLayout role="seeker">
        <div className="cc cc-page">
          <EmptyState
            icon="search"
            title="Coach not found"
            body="This profile may have been removed."
            action={<Button variant="primary" onClick={() => navigate('/coaches')}>Browse coaches</Button>}
          />
        </div>
      </AppLayout>
    );
  }

  const bookable = !!coach.stripe_charges_enabled;
  // Seekers pay the coach directly, so there is nothing to book until Stripe
  // has enabled charges. Both entry points are gated — the sidebar button
  // previously was not, so the guard on the header button could be walked past.
  const bookButton = (size) => (
    <Button
      variant="primary"
      size={size}
      icon="sessions"
      block={size === 'lg'}
      disabled={!bookable}
      title={bookable ? undefined : 'This coach has not finished setting up payments yet'}
      onClick={() => setShowModal(true)}
    >
      Book a session
    </Button>
  );

  return (
    <AppLayout role="seeker">
      <SEO
        title={coach.name + (coach.title ? ` — ${coach.title}` : '')}
        description={coach.bio || `Work with ${coach.name}, a verified coach on The Coaching Collective.`}
        url={`${appBaseUrl()}/coaches/${coach.id}`}
      />
      <div className="cc cc-page">
        <div>
          <Button variant="ghost" size="sm" icon="chevronLeft" onClick={() => navigate('/coaches')}>
            All coaches
          </Button>
        </div>

        {/* Profile header */}
        <Card>
          <div className="cc-coachhead">
            <Avatar name={coach.name} src={coach.avatar_url} size="xl" />

            <div className="cc-grow">
              <div className="cc-inline cc-gap-3" style={{ flexWrap: 'wrap' }}>
                <h1 className="cc-pagehead-title" style={{ fontSize: 'var(--cc-text-2xl)' }}>{coach.name}</h1>
                {coach.verified && <Badge tone="success">Verified</Badge>}
              </div>
              {coach.title && <p className="cc-pagehead-sub">{coach.title}</p>}

              <div className="cc-inline cc-gap-4" style={{ flexWrap: 'wrap', marginTop: 'var(--cc-space-3)' }}>
                <StarRating value={coach.rating || 0} readOnly showValue count={coach.review_count || undefined} />
                {coach.price_per_session && (
                  <span className="cc-price">
                    <span className="cc-figure">${coach.price_per_session}</span>
                    <span className="cc-quiet"> / session</span>
                  </span>
                )}
                {coach.languages?.length > 0 && (
                  <span className="cc-inline cc-gap-2 cc-quiet" style={{ fontSize: 'var(--cc-text-sm)' }}>
                    <Icon name="globe" size={14} /> {coach.languages.join(', ')}
                  </span>
                )}
              </div>

              {coach.specialties?.length > 0 && (
                <div className="cc-inline cc-gap-2" style={{ flexWrap: 'wrap', marginTop: 'var(--cc-space-3)' }}>
                  {coach.specialties.map(s => <Tag key={s}>{s}</Tag>)}
                </div>
              )}
            </div>

            <div className="cc-stack cc-gap-2">
              {bookButton('md')}
              {seekerProfileId && (
                <Button
                  icon="messages"
                  onClick={async () => {
                    await supabase.from('message_threads')
                      .upsert({ seeker_id: seekerProfileId, coach_id: coach.id }, { onConflict: 'seeker_id,coach_id' })
                      .select().single();
                    navigate('/messages');
                  }}
                >
                  Message
                </Button>
              )}
            </div>
          </div>

          {!bookable && (
            <p className="cc-alert cc-alert-info" style={{ marginTop: 'var(--cc-space-4)' }} role="status">
              <Icon name="pending" size={14} />
              <span>This coach isn't accepting bookings yet — they're still setting up payments.</span>
            </p>
          )}
        </Card>

        {/* Packages */}
        {packages.length > 0 && (
          <section>
            <SectionHeader label="Session packages" />
            <div className="cc-action-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
              {packages.map(pkg => (
                <Card key={pkg.id}>
                  <div className="cc-row-title">{pkg.name}</div>
                  {pkg.description && (
                    <p className="cc-muted" style={{ fontSize: 'var(--cc-text-sm)', margin: 'var(--cc-space-2) 0 0' }}>
                      {pkg.description}
                    </p>
                  )}
                  <div className="cc-inline cc-gap-3 cc-quiet" style={{ fontSize: 'var(--cc-text-xs)', marginTop: 'var(--cc-space-3)' }}>
                    <span className="cc-inline cc-gap-1"><Icon name="sessions" size={12} /> {pkg.session_count} sessions</span>
                    {pkg.validity_days && <span className="cc-inline cc-gap-1"><Icon name="clock" size={12} /> {pkg.validity_days} days</span>}
                  </div>
                  <div className="cc-inline" style={{ justifyContent: 'space-between', marginTop: 'var(--cc-space-4)', paddingTop: 'var(--cc-space-3)', borderTop: '1px solid var(--cc-border-hairline)' }}>
                    <span className="cc-figure" style={{ fontSize: 'var(--cc-text-lg)' }}>${pkg.price}</span>
                    <Button size="sm" disabled={!bookable} onClick={() => setShowModal(true)}>Enquire</Button>
                  </div>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Two columns */}
        <div className="cc-coachcols">
          <div className="cc-stack cc-gap-6">
            {coach.bio && (
              <Card>
                <SectionHeader label="About" />
                <p className="cc-prose">{coach.bio}</p>
              </Card>
            )}
            {coach.approach && (
              <Card>
                <SectionHeader label="Coaching approach" />
                <p className="cc-prose">{coach.approach}</p>
              </Card>
            )}

            {reviews.length > 0 && (
              <section>
                <SectionHeader label={`Reviews (${reviews.length})`} />
                <div className="cc-stack cc-gap-3">
                  {reviews.map(r => (
                    <Card key={r.id}>
                      <div className="cc-inline cc-gap-3">
                        <Avatar name={r.seeker?.name} size="sm" />
                        <div className="cc-grow">
                          <div className="cc-row-title" style={{ fontSize: 'var(--cc-text-sm)' }}>
                            {r.seeker?.name || 'Anonymous'}
                          </div>
                          <StarRating value={r.rating} readOnly size={13} />
                        </div>
                        <span className="cc-quiet" style={{ fontSize: 'var(--cc-text-xs)' }}>
                          {new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                      {r.body && <p className="cc-prose" style={{ marginTop: 'var(--cc-space-3)' }}>{r.body}</p>}
                    </Card>
                  ))}
                </div>
              </section>
            )}

            {content.length > 0 && (
              <section>
                <SectionHeader label={`Content by ${coach.name?.split(' ')[0]}`} />
                <div className="cc-action-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                  {content.map(item => (
                    <Card key={item.id}>
                      <span className="cc-quiet"><Icon name={CONTENT_ICON[item.type] || 'article'} size={18} /></span>
                      <div className="cc-row-title" style={{ fontSize: 'var(--cc-text-sm)', marginTop: 'var(--cc-space-3)' }}>
                        {item.title}
                      </div>
                      {item.description && (
                        <p className="cc-muted" style={{ fontSize: 'var(--cc-text-xs)', margin: 'var(--cc-space-2) 0 0' }}>
                          {item.description.slice(0, 80)}
                        </p>
                      )}
                    </Card>
                  ))}
                </div>
              </section>
            )}
          </div>

          <div className="cc-stack cc-gap-4">
            <Card>
              <SectionHeader label="Quick facts" />
              {/* years_experience and sessions_completed were read here but
                  neither column exists on coach_profiles, so both rows were
                  permanently invisible. Only real fields are shown. */}
              <dl className="cc-defs">
                <div className="cc-def"><dt>Session length</dt><dd>55 minutes</dd></div>
                <div className="cc-def"><dt>Format</dt><dd>Video</dd></div>
                {coach.review_count > 0 && (
                  <div className="cc-def"><dt>Reviews</dt><dd>{coach.review_count}</dd></div>
                )}
                {coach.languages?.length > 0 && (
                  <div className="cc-def"><dt>Languages</dt><dd>{coach.languages.join(', ')}</dd></div>
                )}
                {coach.cancellation_policy && (
                  <div className="cc-def"><dt>Cancellation</dt><dd>{coach.cancellation_policy}</dd></div>
                )}
              </dl>
            </Card>

            {bookButton('lg')}
          </div>
        </div>
      </div>

      <BookingModal
        coach={coach}
        seekerProfileId={seekerProfileId}
        open={showModal}
        onClose={() => setShowModal(false)}
      />
    </AppLayout>
  );
}
