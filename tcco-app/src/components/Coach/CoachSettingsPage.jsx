import React, { useState, useEffect } from 'react';
import { useAuth } from '../../auth/useAuth';
import { supabase } from '../../lib/supabase';
import AppLayout from '../Layout/AppLayout';
import { showToast } from '../shared/Toast';
import AvatarUpload from '../shared/AvatarUpload';
import '../Layout/AppLayout.css';

const SPECIALTY_OPTIONS = [
  'Career coaching', 'Executive leadership', 'Life coaching', 'Business strategy',
  'Mindfulness', 'Relationships', 'Health & wellness', 'Confidence', 'Communication',
  'Entrepreneurship', 'Work-life balance', 'Financial coaching',
];

const LANGUAGE_OPTIONS = ['English', 'Spanish', 'French', 'German', 'Portuguese', 'Mandarin', 'Hindi', 'Arabic'];

const TIMEZONE_OPTIONS = [
  'UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'America/Vancouver', 'America/Toronto', 'Europe/London', 'Europe/Paris', 'Europe/Berlin',
  'Europe/Amsterdam', 'Asia/Dubai', 'Asia/Kolkata', 'Asia/Singapore', 'Asia/Tokyo',
  'Australia/Sydney', 'Pacific/Auckland',
];

const NOTIF_DEFAULTS = {
  new_booking:     true,
  session_reminder: true,
  new_message:     true,
  review_received: true,
};

const NOTIF_CONFIG = [
  { key: 'new_booking',      label: 'New booking',       desc: 'When a seeker books a session with you' },
  { key: 'session_reminder', label: 'Session reminder',  desc: 'Email 24h before each upcoming session' },
  { key: 'new_message',      label: 'New messages',      desc: 'When a client sends you a message' },
  { key: 'review_received',  label: 'Reviews received',  desc: 'When a client leaves you a review' },
];

export default function CoachSettingsPage() {
  const { user } = useAuth();
  const [profile, setProfile]   = useState(null);
  const [coachId, setCoachId]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [tab, setTab]           = useState('profile');

  // Profile fields
  const [name, setName]                     = useState('');
  const [title, setTitle]                   = useState('');
  const [bio, setBio]                       = useState('');
  const [approach, setApproach]             = useState('');
  const [specialties, setSpecialties]       = useState([]);
  const [languages, setLanguages]           = useState([]);
  const [pricePerSession, setPricePerSession] = useState('');
  const [zoomLink, setZoomLink]             = useState('');
  const [timezone, setTimezone]             = useState('UTC');
  const [cancellationPolicy, setCancellationPolicy] = useState('');
  const [maxClients, setMaxClients]         = useState('');

  // Account / password
  const [newPw, setNewPw]       = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwSaving, setPwSaving] = useState(false);

  // Notifications
  const [notif, setNotif] = useState(() => {
    try {
      const stored = localStorage.getItem('tcco_coach_notif');
      return stored ? JSON.parse(stored) : NOTIF_DEFAULTS;
    } catch { return NOTIF_DEFAULTS; }
  });

  useEffect(() => { if (!user?.id) return; loadProfile(); }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadProfile = async () => {
    try {
      const { data } = await supabase
        .from('coach_profiles').select('*').eq('user_id', user.id).single();
      if (!data) { setLoading(false); return; }
      setProfile(data);
      setCoachId(data.id);
      setName(data.name || '');
      setTitle(data.title || '');
      setBio(data.bio || '');
      setApproach(data.approach || '');
      setSpecialties(data.specialties || []);
      setLanguages(data.languages || []);
      setPricePerSession(data.price_per_session?.toString() || '');
      setZoomLink(data.zoom_link || '');
      setTimezone(data.timezone || 'UTC');
      setCancellationPolicy(data.cancellation_policy || '');
      setMaxClients(data.max_clients?.toString() || '');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleSpecialty = (s) =>
    setSpecialties(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);

  const toggleLanguage = (l) =>
    setLanguages(prev => prev.includes(l) ? prev.filter(x => x !== l) : [...prev, l]);

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const patch = {
        name, title, bio, approach,
        specialties, languages,
        price_per_session: pricePerSession ? parseFloat(pricePerSession) : null,
        zoom_link: zoomLink,
        timezone,
        cancellation_policy: cancellationPolicy,
        max_clients: maxClients ? parseInt(maxClients, 10) : null,
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase.from('coach_profiles').update(patch).eq('id', coachId);
      if (error) throw error;
      setProfile(prev => ({ ...prev, ...patch }));
      showToast('Profile saved!');
    } catch (err) {
      console.error(err);
      showToast('Failed to save profile.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!newPw || newPw.length < 6) { showToast('Password must be at least 6 characters', 'error'); return; }
    if (newPw !== confirmPw) { showToast('Passwords do not match', 'error'); return; }
    setPwSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPw });
      if (error) throw error;
      showToast('Password updated!');
      setNewPw(''); setConfirmPw('');
    } catch (err) {
      showToast(err.message || 'Failed to update password', 'error');
    } finally {
      setPwSaving(false);
    }
  };

  const handleSaveNotif = () => {
    localStorage.setItem('tcco_coach_notif', JSON.stringify(notif));
    showToast('Notification preferences saved!');
  };

  if (loading) {
    return (
      <AppLayout role="coach">
        <div className="page-loading"><div className="spinner" /><p>Loading settings…</p></div>
      </AppLayout>
    );
  }

  return (
    <AppLayout role="coach">
      <div className="page-body">
        <div className="page-header">
          <div>
            <h1 className="page-title">Settings</h1>
            <p className="page-subtitle">Manage your coach profile and account</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="tabs">
          {['profile', 'notifications', 'account'].map(t => (
            <button key={t} className={`tab${tab === t ? ' tab-active' : ''}`} onClick={() => setTab(t)}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* ── Profile tab ── */}
        {tab === 'profile' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '640px' }}>

            {/* Photo */}
            <div className="card" style={{ alignItems: 'center' }}>
              <p className="section-label" style={{ marginBottom: '16px' }}>PROFILE PHOTO</p>
              <AvatarUpload
                currentUrl={profile?.avatar_url}
                userId={user?.id}
                onUpload={(url) => {
                  setProfile(prev => ({ ...prev, avatar_url: url }));
                  supabase.from('coach_profiles').update({ avatar_url: url }).eq('id', coachId);
                }}
              />
            </div>

            {/* Basic info */}
            <div className="card">
              <p className="section-label" style={{ marginBottom: '16px' }}>BASIC INFO</p>
              <div className="form-group">
                <label className="form-label">Full name</label>
                <input type="text" className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder="Your full name" />
              </div>
              <div className="form-group">
                <label className="form-label">Professional title</label>
                <input type="text" className="form-input" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Executive Life Coach" />
              </div>
              <div className="form-group">
                <label className="form-label">Bio</label>
                <textarea className="form-textarea" value={bio} onChange={e => setBio(e.target.value)} placeholder="Tell seekers about yourself…" rows={4} />
              </div>
              <div className="form-group">
                <label className="form-label">Coaching approach</label>
                <textarea className="form-textarea" value={approach} onChange={e => setApproach(e.target.value)} placeholder="Describe your methodology and style…" rows={3} />
              </div>
            </div>

            {/* Specialties */}
            <div className="card">
              <p className="section-label" style={{ marginBottom: '16px' }}>SPECIALTIES</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {SPECIALTY_OPTIONS.map(s => (
                  <label key={s} style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    fontSize: '13px', cursor: 'pointer',
                    padding: '5px 10px', borderRadius: '20px',
                    background: specialties.includes(s) ? 'var(--primary)' : 'var(--gray-100)',
                    color: specialties.includes(s) ? '#fff' : 'var(--gray-700)',
                    border: `1px solid ${specialties.includes(s) ? 'var(--primary)' : 'var(--gray-200)'}`,
                    transition: 'all 0.15s',
                  }}>
                    <input type="checkbox" checked={specialties.includes(s)} onChange={() => toggleSpecialty(s)} style={{ display: 'none' }} />
                    {s}
                  </label>
                ))}
              </div>
            </div>

            {/* Languages */}
            <div className="card">
              <p className="section-label" style={{ marginBottom: '16px' }}>LANGUAGES</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {LANGUAGE_OPTIONS.map(l => (
                  <label key={l} style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    fontSize: '13px', cursor: 'pointer',
                    padding: '5px 10px', borderRadius: '20px',
                    background: languages.includes(l) ? 'var(--primary)' : 'var(--gray-100)',
                    color: languages.includes(l) ? '#fff' : 'var(--gray-700)',
                    border: `1px solid ${languages.includes(l) ? 'var(--primary)' : 'var(--gray-200)'}`,
                    transition: 'all 0.15s',
                  }}>
                    <input type="checkbox" checked={languages.includes(l)} onChange={() => toggleLanguage(l)} style={{ display: 'none' }} />
                    {l}
                  </label>
                ))}
              </div>
            </div>

            {/* Pricing & availability */}
            <div className="card">
              <p className="section-label" style={{ marginBottom: '16px' }}>PRICING & AVAILABILITY</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Price per session (USD)</label>
                  <input type="number" min="0" className="form-input" value={pricePerSession} onChange={e => setPricePerSession(e.target.value)} placeholder="e.g. 150" />
                </div>
                <div className="form-group">
                  <label className="form-label">Max active clients</label>
                  <input type="number" min="1" className="form-input" value={maxClients} onChange={e => setMaxClients(e.target.value)} placeholder="e.g. 20" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Cancellation policy</label>
                <textarea className="form-textarea" value={cancellationPolicy} onChange={e => setCancellationPolicy(e.target.value)} placeholder="e.g. 24-hour notice required for cancellations." rows={2} />
              </div>
            </div>

            {/* Session setup */}
            <div className="card">
              <p className="section-label" style={{ marginBottom: '16px' }}>SESSION SETUP</p>
              <div className="form-group">
                <label className="form-label">Default Zoom / Meet link</label>
                <input type="url" className="form-input" value={zoomLink} onChange={e => setZoomLink(e.target.value)} placeholder="https://zoom.us/j/..." />
                <p style={{ fontSize: '12px', color: 'var(--text-soft)', marginTop: '4px' }}>
                  Used as the default join link for all your sessions
                </p>
              </div>
              <div className="form-group">
                <label className="form-label">Timezone</label>
                <select className="form-select" value={timezone} onChange={e => setTimezone(e.target.value)}>
                  {TIMEZONE_OPTIONS.map(tz => <option key={tz} value={tz}>{tz}</option>)}
                </select>
              </div>
            </div>

            <button
              className="btn btn-primary"
              style={{ width: 'fit-content' }}
              onClick={handleSaveProfile}
              disabled={saving}
            >
              {saving ? 'Saving…' : 'Save profile'}
            </button>
          </div>
        )}

        {/* ── Notifications tab ── */}
        {tab === 'notifications' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '560px' }}>
            <div className="card">
              <p className="section-label" style={{ marginBottom: '16px' }}>NOTIFICATION PREFERENCES</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {NOTIF_CONFIG.map(({ key, label, desc }) => (
                  <div key={key} className="toggle-row">
                    <div className="toggle-info">
                      <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-h)' }}>{label}</p>
                      <p style={{ fontSize: '13px', color: 'var(--text-soft)' }}>{desc}</p>
                    </div>
                    <label className="toggle">
                      <input type="checkbox" checked={!!notif[key]} onChange={() => setNotif(p => ({ ...p, [key]: !p[key] }))} style={{ display: 'none' }} />
                      <span className="toggle-slider" onClick={() => setNotif(p => ({ ...p, [key]: !p[key] }))} />
                    </label>
                  </div>
                ))}
              </div>
            </div>
            <button className="btn btn-primary" onClick={handleSaveNotif} style={{ width: 'fit-content' }}>
              Save preferences
            </button>
          </div>
        )}

        {/* ── Account tab ── */}
        {tab === 'account' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '480px' }}>
            <div className="card">
              <p className="section-label" style={{ marginBottom: '16px' }}>CHANGE PASSWORD</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">New password</label>
                  <input type="password" className="form-input" placeholder="Min. 6 characters" value={newPw} onChange={e => setNewPw(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Confirm new password</label>
                  <input type="password" className="form-input" placeholder="Repeat password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} />
                </div>
                <button className="btn btn-primary" style={{ width: 'fit-content' }} onClick={handleChangePassword} disabled={pwSaving}>
                  {pwSaving ? 'Saving…' : 'Update password'}
                </button>
              </div>
            </div>
            <div className="card" style={{ borderLeft: '4px solid var(--error)' }}>
              <p className="section-label" style={{ marginBottom: '8px', color: 'var(--error)' }}>DANGER ZONE</p>
              <p style={{ fontSize: '13px', color: 'var(--text-soft)' }}>
                To delete your account please contact support@thecoachingcollective.com
              </p>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
