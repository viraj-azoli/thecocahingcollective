import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../auth/useAuth';
import { supabase } from '../../lib/supabase';
import { appBaseUrl } from '../../lib/appUrl';
import { track } from '../../lib/analytics';
import AppLayout from '../Layout/AppLayout';
import SEO from '../shared/SEO';
import '../Layout/AppLayout.css';

const AVATAR_COLORS = [
  'linear-gradient(135deg,#2D9E6B,#1a7a52)',
  'linear-gradient(135deg,#6366f1,#4f46e5)',
  'linear-gradient(135deg,#f59e0b,#d97706)',
  'linear-gradient(135deg,#ec4899,#be185d)',
  'linear-gradient(135deg,#06b6d4,#0284c7)',
];

function avatarColor(name) {
  let sum = 0;
  for (let c of (name || '')) sum += c.charCodeAt(0);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}

function initials(name) {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  return parts.length >= 2 ? parts[0][0] + parts[parts.length - 1][0] : parts[0][0];
}

function StarDisplay({ rating = 0, size = 16 }) {
  return (
    <div className="stars-row">
      {[1,2,3,4,5].map(i => (
        <span key={i} className={`star star-static ${i <= Math.round(rating) ? 'filled' : ''}`} style={{ fontSize: size }}>★</span>
      ))}
    </div>
  );
}

// ── Booking Modal ────────────────────────────────────────────────────────────
function BookingModal({ coach, seekerProfileId, userEmail, onClose, onBooked }) {
  const navigate = useNavigate();
  const [step, setStep]             = useState(1);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [bookedSessions, setBookedSessions] = useState([]);
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState('');
  const [success, setSuccess]       = useState(false);
  // Intake form
  const [intakeForm, setIntakeForm]       = useState(null);
  const [intakeAnswers, setIntakeAnswers] = useState({});
  const [showIntake, setShowIntake]       = useState(false);

  useEffect(() => {
    supabase.from('intake_forms').select('*').eq('coach_id', coach.id).maybeSingle()
      .then(({ data }) => setIntakeForm(data));
  }, [coach.id]);

  // Build next 14 days
  const days = [];
  for (let i = 1; i <= 14; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    days.push(d);
  }

  const formatDateKey = d => d.toISOString().split('T')[0];

  const STANDARD_SLOTS = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'];

  // Load booked slots when date selected
  useEffect(() => {
    if (!selectedDate) return;
    supabase
      .from('sessions')
      .select('scheduled_time, status, created_at')
      .eq('coach_id', coach.id)
      .eq('scheduled_date', selectedDate)
      .in('status', ['scheduled', 'in_progress', 'pending_payment'])
      .then(({ data }) => {
        // A slot mid-checkout is held so two seekers can't both pay the coach
        // for it — but only for as long as the Stripe session lives (30 min),
        // otherwise an abandoned checkout would block the slot indefinitely.
        const cutoff = Date.now() - 30 * 60 * 1000;
        const held = (data || []).filter(s =>
          s.status !== 'pending_payment' || new Date(s.created_at).getTime() > cutoff
        );
        setBookedSessions(held.map(s => s.scheduled_time?.slice(0, 5)));
      });
  }, [selectedDate, coach.id]);

  const handleBook = async () => {
    setSaving(true);
    setError('');
    try {
      // Payment-first. The row starts as pending_payment and is promoted to
      // scheduled by the stripe-webhook once the seeker actually pays the
      // coach. amount_paid is set from the real charge, not from the list
      // price — this flow used to record the price as paid without ever
      // taking a payment.
      const { data: sessionData, error: err } = await supabase.from('sessions').insert({
        coach_id: coach.id,
        seeker_id: seekerProfileId,
        scheduled_date: selectedDate,
        scheduled_time: selectedTime + ':00',
        duration_minutes: 55,
        session_type: 'video',
        status: 'pending_payment',
      }).select().single();
      if (err) throw err;

      // Save intake response if present
      if (intakeForm?.id && Object.keys(intakeAnswers).length > 0 && seekerProfileId) {
        // A PostgREST query builder is a thenable, not a Promise — it has no
        // .catch(). Calling one threw a TypeError here, which the outer catch
        // reported as a failed booking even though the session had already
        // been created. Check the returned error instead.
        const { error: intakeErr } = await supabase.from('intake_responses').insert({
          form_id: intakeForm.id,
          seeker_id: seekerProfileId,
          session_id: sessionData?.id,
          answers: intakeAnswers,
        });
        if (intakeErr) console.warn('Could not save intake response:', intakeErr.message);
      }

      track('booking_payment_started', { coachId: coach.id, coachName: coach.name, date: selectedDate });

      // Hand off to Stripe Checkout on the coach's own account. The
      // confirmation email is sent by the webhook after payment clears, so a
      // seeker who abandons checkout is never told the session is booked.
      const { data: checkout, error: checkoutErr } = await supabase.functions.invoke(
        'create-session-checkout',
        { body: { sessionId: sessionData.id } },
      );

      if (checkoutErr || !checkout?.url) {
        // Don't leave an orphaned pending row holding the slot.
        await supabase.from('sessions').delete().eq('id', sessionData.id);
        throw new Error(checkout?.error || 'Could not start payment. Please try again.');
      }

      window.location.href = checkout.url;
    } catch (e) {
      setError(e.message || 'Booking failed. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const formatDateLabel = (d) => {
    const today = new Date(); today.setHours(0,0,0,0);
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
    const target = new Date(formatDateKey(d) + 'T00:00');
    if (target.getTime() === today.getTime()) return 'Today';
    if (target.getTime() === tomorrow.getTime()) return 'Tomorrow';
    return null;
  };

  const formatTime12 = (t) => {
    const [h] = t.split(':');
    const hour = parseInt(h, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${h12}:00 ${ampm}`;
  };

  const formatFullDate = (ds) => new Date(ds + 'T00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal modal-lg">
        <div className="modal-header">
          <h3>
            {step === 1 && 'Pick a date'}
            {step === 2 && 'Pick a time'}
            {showIntake && 'Intake form'}
            {!showIntake && step === 3 && 'Confirm booking'}
            {step === 4 && 'Booking confirmed!'}
          </h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {/* Step 1 – Date */}
          {step === 1 && (
            <div>
              <p style={{ fontSize: '14px', color: 'var(--text-soft)', marginBottom: '16px' }}>
                Select a date for your session with {coach.name}
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
                {days.map(d => {
                  const ds = formatDateKey(d);
                  const label = formatDateLabel(d);
                  const isSelected = selectedDate === ds;
                  return (
                    <button
                      key={ds}
                      onClick={() => { setSelectedDate(ds); setStep(2); }}
                      style={{
                        border: `2px solid ${isSelected ? 'var(--accent)' : 'var(--border-card)'}`,
                        borderRadius: 'var(--r-md)',
                        background: isSelected ? 'var(--accent)' : 'var(--card-bg)',
                        color: isSelected ? '#fff' : 'var(--text-b)',
                        padding: '10px 4px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '2px',
                        cursor: 'pointer',
                        transition: 'all .15s',
                        fontFamily: 'inherit',
                      }}
                    >
                      <span style={{ fontSize: '11px', fontWeight: 600, opacity: isSelected ? 0.85 : 1, color: isSelected ? '#fff' : 'var(--text-soft)' }}>
                        {label || d.toLocaleDateString('en-US', { weekday: 'short' })}
                      </span>
                      <span style={{ fontSize: '18px', fontWeight: 700 }}>{d.getDate()}</span>
                      <span style={{ fontSize: '11px', opacity: isSelected ? 0.85 : 1, color: isSelected ? '#fff' : 'var(--text-soft)' }}>
                        {d.toLocaleDateString('en-US', { month: 'short' })}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 2 – Time */}
          {step === 2 && (
            <div>
              <p style={{ fontSize: '14px', color: 'var(--text-soft)', marginBottom: '16px' }}>
                {formatFullDate(selectedDate)} · 55 min video session
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                {STANDARD_SLOTS.map(t => {
                  const booked = bookedSessions.includes(t);
                  const isSelected = selectedTime === t;
                  return (
                    <button
                      key={t}
                      disabled={booked}
                      onClick={() => {
                        setSelectedTime(t);
                        if (intakeForm?.is_required && intakeForm?.questions?.length > 0) {
                          setShowIntake(true);
                        } else {
                          setStep(3);
                        }
                      }}
                      style={{
                        border: `2px solid ${isSelected ? 'var(--accent)' : booked ? 'var(--border-card)' : 'var(--border-card)'}`,
                        borderRadius: 'var(--r-md)',
                        background: isSelected ? 'var(--accent)' : booked ? '#f3f4f6' : 'var(--card-bg)',
                        color: isSelected ? '#fff' : booked ? '#9ca3af' : 'var(--text-b)',
                        padding: '14px 8px',
                        fontWeight: 600,
                        fontSize: '15px',
                        cursor: booked ? 'not-allowed' : 'pointer',
                        opacity: booked ? 0.5 : 1,
                        transition: 'all .15s',
                        fontFamily: 'inherit',
                        textDecoration: booked ? 'line-through' : 'none',
                      }}
                    >
                      {formatTime12(t)}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Intake form step */}
          {showIntake && intakeForm && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <p style={{ fontSize: '14px', color: 'var(--text-soft)' }}>
                {coach.name} would like to learn a bit about you before your first session.
              </p>
              {(intakeForm.questions || []).map(q => (
                <div key={q.id}>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '14px', marginBottom: '6px', color: 'var(--text-h)' }}>
                    {q.question}{q.required && <span style={{ color: '#dc2626' }}> *</span>}
                  </label>
                  {q.type === 'text' && (
                    <textarea
                      className="form-input"
                      style={{ minHeight: '72px' }}
                      value={intakeAnswers[q.id] || ''}
                      onChange={e => setIntakeAnswers(a => ({ ...a, [q.id]: e.target.value }))}
                    />
                  )}
                  {q.type === 'choice' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {(q.options || []).map(opt => (
                        <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px' }}>
                          <input
                            type="checkbox"
                            checked={(intakeAnswers[q.id] || []).includes(opt)}
                            onChange={e => {
                              const prev = intakeAnswers[q.id] || [];
                              setIntakeAnswers(a => ({
                                ...a,
                                [q.id]: e.target.checked ? [...prev, opt] : prev.filter(x => x !== opt),
                              }));
                            }}
                          />
                          {opt}
                        </label>
                      ))}
                    </div>
                  )}
                  {q.type === 'scale' && (
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {[1,2,3,4,5,6,7,8,9,10].map(n => (
                        <button
                          key={n}
                          onClick={() => setIntakeAnswers(a => ({ ...a, [q.id]: n }))}
                          style={{
                            width: '38px', height: '38px', border: '2px solid',
                            borderColor: intakeAnswers[q.id] === n ? 'var(--accent)' : 'var(--border-card)',
                            borderRadius: '8px', fontWeight: 700, fontSize: '14px', cursor: 'pointer',
                            background: intakeAnswers[q.id] === n ? 'var(--accent)' : 'var(--card-bg)',
                            color: intakeAnswers[q.id] === n ? '#fff' : 'var(--text-b)',
                            fontFamily: 'inherit',
                          }}
                        >{n}</button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              <button
                className="btn btn-primary btn-lg"
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={() => { setShowIntake(false); setStep(3); }}
              >
                Continue →
              </button>
            </div>
          )}

          {/* Step 3 – Confirm */}
          {!showIntake && step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <p style={{ fontSize: '13px', color: 'var(--text-soft)', fontWeight: 600 }}>SESSION SUMMARY</p>
                <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                  <div
                    className="avatar avatar-md"
                    style={{ background: avatarColor(coach.name), color: '#fff', fontWeight: 700, flexShrink: 0 }}
                  >
                    {initials(coach.name)}
                  </div>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: '16px', color: 'var(--text-h)' }}>{coach.name}</p>
                    <p style={{ fontSize: '13px', color: 'var(--text-soft)' }}>{coach.title}</p>
                  </div>
                </div>
                <div style={{ borderTop: '1px solid var(--border-card)', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                    <span style={{ color: 'var(--text-soft)' }}>Date</span>
                    <span style={{ fontWeight: 600, color: 'var(--text-b)' }}>{formatFullDate(selectedDate)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                    <span style={{ color: 'var(--text-soft)' }}>Time</span>
                    <span style={{ fontWeight: 600, color: 'var(--text-b)' }}>{formatTime12(selectedTime)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                    <span style={{ color: 'var(--text-soft)' }}>Duration</span>
                    <span style={{ fontWeight: 600, color: 'var(--text-b)' }}>55 min</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                    <span style={{ color: 'var(--text-soft)' }}>Type</span>
                    <span style={{ fontWeight: 600, color: 'var(--text-b)' }}>📹 Video</span>
                  </div>
                  {coach.price_per_session && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', borderTop: '1px solid var(--border-card)', paddingTop: '8px', marginTop: '4px' }}>
                      <span style={{ fontWeight: 700, color: 'var(--text-h)' }}>Total</span>
                      <span style={{ fontWeight: 700, color: 'var(--accent)' }}>${coach.price_per_session}</span>
                    </div>
                  )}
                </div>
              </div>
              {error && <p style={{ color: '#dc2626', fontSize: '13px' }}>{error}</p>}
              <button
                className="btn btn-primary btn-lg"
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={handleBook}
                disabled={saving}
              >
                {saving ? 'Booking…' : 'Confirm & Book'}
              </button>
            </div>
          )}

          {/* Step 4 – Success */}
          {step === 4 && (
            <div style={{ textAlign: 'center', padding: '20px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
              <span style={{ fontSize: '56px' }}>✅</span>
              <h2 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-h)' }}>Session booked!</h2>
              <p style={{ color: 'var(--text-soft)', fontSize: '15px' }}>
                Your session with {coach.name} on {formatFullDate(selectedDate)} at {formatTime12(selectedTime)} is confirmed.
              </p>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button className="btn btn-primary" onClick={() => { onBooked(); onClose(); }}>View my sessions</button>
                <button className="btn btn-outline" onClick={onClose}>Close</button>
              </div>
            </div>
          )}
        </div>

        {(step === 2 || step === 3 || showIntake) && (
          <div className="modal-footer">
            <button
              className="btn btn-outline"
              onClick={() => {
                if (showIntake) { setShowIntake(false); }
                else setStep(s => s - 1);
              }}
            >← Back</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function CoachProfilePage() {
  const { user } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [coach, setCoach]           = useState(null);
  const [content, setContent]       = useState([]);
  const [packages, setPackages]     = useState([]);
  const [reviews, setReviews]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [showModal, setShowModal]   = useState(false);
  const [seekerProfileId, setSeekerProfileId] = useState(null);

  useEffect(() => {
    loadData();
    if (new URLSearchParams(location.search).get('book') === 'true') {
      setShowModal(true);
    }
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
        <div className="page-loading"><div className="spinner" /><p>Loading coach profile…</p></div>
      </AppLayout>
    );
  }

  if (!coach) {
    return (
      <AppLayout role="seeker">
        <div className="empty-state" style={{ marginTop: 80 }}>
          <span className="empty-icon">😔</span>
          <p>Coach not found.</p>
          <button className="btn btn-outline" onClick={() => navigate('/coaches')}>← All Coaches</button>
        </div>
      </AppLayout>
    );
  }

  const bg = avatarColor(coach.name);

  return (
    <AppLayout role="seeker">
      <SEO
        title={coach.name + (coach.title ? ` — ${coach.title}` : '')}
        description={coach.bio || `Work with ${coach.name}, a verified coach on TCCO.`}
        url={`${appBaseUrl()}/coaches/${coach.id}`}
      />
      <div className="page-body">
        {/* Back */}
        <button className="btn btn-outline btn-sm" onClick={() => navigate('/coaches')}>← All Coaches</button>

        {/* Profile header card */}
        <div className="card" style={{ padding: '32px' }}>
          <div style={{ display: 'flex', gap: '28px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
            {/* Avatar XL */}
            <div style={{
              width: 96, height: 96, borderRadius: '50%',
              background: coach.avatar_url ? 'transparent' : bg,
              backgroundImage: coach.avatar_url ? `url(${coach.avatar_url})` : undefined,
              backgroundSize: 'cover', backgroundPosition: 'center',
              color: '#fff', fontWeight: 700, fontSize: '28px',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              border: '3px solid var(--gray-200)',
            }}>
              {!coach.avatar_url && initials(coach.name)}
            </div>

            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <h1 style={{ fontSize: '32px', fontWeight: 700, color: 'var(--text-h)', lineHeight: 1.1 }}>{coach.name}</h1>
                {coach.verified && <span className="badge badge-green">✓ Verified</span>}
              </div>
              <p style={{ fontSize: '16px', color: 'var(--text-soft)', marginTop: '6px' }}>{coach.title}</p>

              {/* Stats row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginTop: '14px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <StarDisplay rating={coach.rating || 0} size={18} />
                  <span style={{ fontWeight: 700, color: 'var(--text-h)' }}>
                    {coach.rating ? Number(coach.rating).toFixed(1) : '—'}
                  </span>
                </div>
                {coach.review_count > 0 && (
                  <span style={{ fontSize: '13px', color: 'var(--text-soft)' }}>{coach.review_count} reviews</span>
                )}
                {coach.price_per_session && (
                  <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-h)' }}>
                    ${coach.price_per_session}<span style={{ fontSize: '13px', fontWeight: 400, color: 'var(--text-soft)' }}>/session</span>
                  </span>
                )}
                {coach.languages?.length > 0 && (
                  <span style={{ fontSize: '13px', color: 'var(--text-soft)' }}>🌐 {coach.languages.join(', ')}</span>
                )}
              </div>

              {/* Specialties */}
              {coach.specialties?.length > 0 && (
                <div className="chips-row" style={{ marginTop: '12px' }}>
                  {coach.specialties.map(s => (
                    <span key={s} className="chip" style={{ fontSize: '12px', padding: '4px 10px' }}>{s}</span>
                  ))}
                </div>
              )}
            </div>

            {/* Book + Message buttons */}
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {/* Seekers pay the coach directly, so there is nothing to book
                  until Stripe has enabled charges on the coach's account. */}
              <button
                className="btn btn-primary btn-lg"
                onClick={() => setShowModal(true)}
                disabled={!coach.stripe_charges_enabled}
                title={coach.stripe_charges_enabled ? undefined : 'This coach has not finished setting up payments yet'}
              >
                📅 Book a Session
              </button>
              {!coach.stripe_charges_enabled && (
                <p style={{ width: '100%', fontSize: '13px', color: 'var(--text-soft)', margin: '4px 0 0' }}>
                  This coach isn't accepting bookings yet — they're still setting up payments.
                </p>
              )}
              {seekerProfileId && (
                <button
                  className="btn btn-outline btn-lg"
                  onClick={async () => {
                    await supabase
                      .from('message_threads')
                      .upsert({ seeker_id: seekerProfileId, coach_id: coach.id }, { onConflict: 'seeker_id,coach_id' })
                      .select().single();
                    navigate('/messages');
                  }}
                >
                  💬 Message
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Session Packages */}
        {packages.length > 0 && (
          <div>
            <p className="section-label" style={{ marginBottom: '12px' }}>SESSION PACKAGES</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '14px' }}>
              {packages.map(pkg => (
                <div key={pkg.id} className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <p style={{ fontWeight: 700, fontSize: '16px', color: 'var(--text-h)' }}>{pkg.name}</p>
                  {pkg.description && <p style={{ fontSize: '13px', color: 'var(--text-soft)' }}>{pkg.description}</p>}
                  <div style={{ display: 'flex', gap: '12px', fontSize: '13px', color: 'var(--text-soft)' }}>
                    <span>📅 {pkg.session_count} sessions</span>
                    {pkg.validity_days && <span>⏳ {pkg.validity_days} days</span>}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-card)', paddingTop: '10px' }}>
                    <span style={{ fontWeight: 700, fontSize: '18px', color: 'var(--accent)' }}>${pkg.price}</span>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => setShowModal(true)}
                    >
                      Buy package
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Two-column body */}
        <div className="coach-profile-cols" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', alignItems: 'start' }}>
          {/* Left */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {coach.bio && (
              <div className="card">
                <p className="section-label">ABOUT</p>
                <p style={{ fontSize: '15px', color: 'var(--text-b)', lineHeight: 1.7, marginTop: '8px' }}>{coach.bio}</p>
              </div>
            )}
            {coach.approach && (
              <div className="card">
                <p className="section-label">COACHING APPROACH</p>
                <p style={{ fontSize: '15px', color: 'var(--text-b)', lineHeight: 1.7, marginTop: '8px' }}>{coach.approach}</p>
              </div>
            )}

            {/* Reviews */}
            {reviews.length > 0 && (
              <div>
                <p className="section-label" style={{ marginBottom: '12px' }}>
                  REVIEWS ({reviews.length})
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {reviews.map(r => (
                    <div key={r.id} className="card" style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                        <div
                          className="avatar avatar-sm"
                          style={{ background: 'var(--primary, #1B9B7D)', color: '#fff', fontWeight: 700, fontSize: '13px' }}
                        >
                          {r.seeker?.name?.[0] || '?'}
                        </div>
                        <div>
                          <p style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-h)' }}>
                            {r.seeker?.name || 'Anonymous'}
                          </p>
                          <div style={{ display: 'flex', gap: '2px' }}>
                            {[1,2,3,4,5].map(i => (
                              <span key={i} style={{ color: i <= r.rating ? '#f59e0b' : '#d1d5db', fontSize: '14px' }}>★</span>
                            ))}
                          </div>
                        </div>
                        <span style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--text-soft)' }}>
                          {new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                      {r.body && (
                        <p style={{ fontSize: '14px', color: 'var(--text-soft)', fontStyle: 'italic' }}>"{r.body}"</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Coach content */}
            {content.length > 0 && (
              <div>
                <p className="section-label" style={{ marginBottom: '12px' }}>
                  CONTENT BY {coach.name?.split(' ')[0]?.toUpperCase()}
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                  {content.map(item => (
                    <div key={item.id} className="card" style={{ padding: '16px' }}>
                      <span style={{ fontSize: '24px' }}>
                        {item.type === 'audio' ? '🎧' : item.type === 'article' ? '📄' : item.type === 'live_event' ? '🎥' : '📋'}
                      </span>
                      <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-h)', marginTop: '8px' }}>{item.title}</p>
                      <p style={{ fontSize: '12px', color: 'var(--text-soft)', marginTop: '4px' }}>{item.description?.slice(0, 80)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="card">
              <p className="section-label">QUICK FACTS</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '14px', marginTop: '12px' }}>
                {coach.years_experience && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-soft)' }}>Experience</span>
                    <span style={{ fontWeight: 600 }}>{coach.years_experience} years</span>
                  </div>
                )}
                {coach.sessions_completed > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-soft)' }}>Sessions done</span>
                    <span style={{ fontWeight: 600 }}>{coach.sessions_completed}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-soft)' }}>Session length</span>
                  <span style={{ fontWeight: 600 }}>55 min</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-soft)' }}>Format</span>
                  <span style={{ fontWeight: 600 }}>📹 Video</span>
                </div>
              </div>
            </div>

            <button
              className="btn btn-primary btn-lg"
              style={{ width: '100%', justifyContent: 'center' }}
              onClick={() => setShowModal(true)}
            >
              📅 Book a Session
            </button>
          </div>
        </div>
      </div>

      {showModal && (
        <BookingModal
          coach={coach}
          seekerProfileId={seekerProfileId}
          userEmail={user?.email}
          onClose={() => setShowModal(false)}
          onBooked={() => navigate('/sessions')}
        />
      )}

      <style>{`
        @media (max-width: 900px) {
          .coach-profile-cols { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </AppLayout>
  );
}
