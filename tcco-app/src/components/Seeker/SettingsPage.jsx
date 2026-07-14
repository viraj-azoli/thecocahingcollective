import React, { useState, useEffect } from 'react';
import { useAuth } from '../../auth/useAuth';
import { supabase } from '../../lib/supabase';
import { track } from '../../lib/analytics';
import AppLayout from '../Layout/AppLayout';
import { showToast } from '../shared/Toast';
import AvatarUpload from '../shared/AvatarUpload';
import '../Layout/AppLayout.css';

const GOALS_OPTIONS = [
  'Personal growth', 'Career advancement', 'Leadership', 'Work-life balance',
  'Relationships', 'Mental wellbeing', 'Confidence', 'Purpose & meaning',
];
const FORMAT_OPTIONS = ['1-on-1', 'Group sessions', 'Self-paced'];
const EXPERIENCE_OPTIONS = ['Beginner', 'Some experience', 'Experienced'];

const TIERS = [
  {
    name: 'Discovery',
    price: 'Free',
    features: ['1 session/month', 'Basic library access', 'Journal'],
  },
  {
    name: 'Growth',
    price: '$79/mo',
    features: ['4 sessions/month', 'Full library', 'Progress tracking', 'Community'],
  },
  {
    name: 'Mastery',
    price: '$149/mo',
    features: ['Unlimited sessions', 'Priority matching', '1-on-1 coaching', 'All features'],
  },
];

const NOTIF_DEFAULTS = {
  session_reminders: true,
  journal_prompts: true,
  community_updates: false,
  coach_messages: true,
  progress_milestones: true,
};

const NOTIF_CONFIG = [
  { key: 'session_reminders', label: 'Session reminders', desc: 'Email reminder 24h before each session' },
  { key: 'journal_prompts',   label: 'Journal prompts',   desc: 'Daily journal prompt in the morning' },
  { key: 'community_updates', label: 'Community updates', desc: 'New posts and events in your community' },
  { key: 'coach_messages',    label: 'Coach messages',    desc: 'When a coach sends you a message' },
  { key: 'progress_milestones', label: 'Progress milestones', desc: 'When you hit a new achievement' },
];

export default function SettingsPage() {
  const { user } = useAuth();
  const [upgrading, setUpgrading] = useState(false);
  const [profile, setProfile]     = useState(null);
  const [profileId, setProfileId] = useState(null);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [tab, setTab]             = useState('profile');

  // Password change state
  const [currentPw, setCurrentPw]   = useState('');
  const [newPw, setNewPw]           = useState('');
  const [confirmPw, setConfirmPw]   = useState('');
  const [pwSaving, setPwSaving]     = useState(false);

  // Profile tab state
  const [name, setName]               = useState('');
  const [bio, setBio]                 = useState('');
  const [goals, setGoals]             = useState([]);
  const [formats, setFormats]         = useState([]);
  const [experience, setExperience]   = useState('');

  // Notification tab state
  const [notif, setNotif] = useState(() => {
    try {
      const stored = localStorage.getItem('tcco_notif');
      return stored ? JSON.parse(stored) : NOTIF_DEFAULTS;
    } catch {
      return NOTIF_DEFAULTS;
    }
  });

  useEffect(() => { if (!user?.id) return; loadProfile(); }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('seeker_profiles').select('*').eq('user_id', user?.id).single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows

      if (data) {
        setProfileId(data.id);
        setProfile(data);
        setName(data.name || '');
        setBio(data.bio || data.onboarding_quiz?.bio || '');
        setGoals(data.onboarding_quiz?.goals || []);
        setFormats(data.preferences?.preferred_format ? [data.preferences.preferred_format] : []);
        setExperience(data.onboarding_quiz?.experience_level || '');
      }
    } catch (err) {
      console.error('Error loading seeker profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (tierName) => {
    if (!user?.email) return;
    track('upgrade_clicked', { tier: tierName });
    setUpgrading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: { tier: tierName, userId: user.id, email: user.email },
      });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (err) {
      showToast('Could not start checkout. Please try again.', 'error');
    } finally {
      setUpgrading(false);
    }
  };

  const toggleGoal = (g) => setGoals(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g]);
  const toggleFormat = (f) => setFormats(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f]);

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      // Step 1: Ensure public.users row exists (FK prerequisite)
      await supabase.from('users').upsert({ id: user.id, user_type: 'seeker' }, { onConflict: 'id' });

      // Step 2: Build patch (include bio column now that it is created in database)
      const patch = {
        user_id: user.id,
        name,
        bio,
        onboarding_quiz: { ...(profile?.onboarding_quiz || {}), goals, experience_level: experience, bio },
        preferences: { ...(profile?.preferences || {}), preferred_format: formats[0] || null },
        updated_at: new Date().toISOString(),
      };

      const dbPayload = {
        ...patch,
        avatar_url: profile?.avatar_url || null,
      };

      // Step 3: Save seeker profile using upsert to prevent unique constraint failures
      const { data, error } = await supabase
        .from('seeker_profiles')
        .upsert(
          { ...dbPayload, tier: profile?.tier || 'Discovery' },
          { onConflict: 'user_id' }
        )
        .select('id')
        .single();

      if (error) throw error;
      if (data?.id) setProfileId(data.id);

      setProfile(prev => ({ ...prev, ...patch, bio }));
      showToast('Profile saved!');
    } catch (err) {
      console.error('Failed to save seeker profile details:', err);
      showToast(`Failed to save profile. ${err.message || ''}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNotif = () => {
    localStorage.setItem('tcco_notif', JSON.stringify(notif));
    showToast('Notification preferences saved!');
  };

  const toggleNotif = (key) => setNotif(prev => ({ ...prev, [key]: !prev[key] }));

  const handleChangePassword = async () => {
    if (!newPw || newPw.length < 6) { showToast('Password must be at least 6 characters', 'error'); return; }
    if (newPw !== confirmPw) { showToast('Passwords do not match', 'error'); return; }
    setPwSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPw });
      if (error) throw error;
      showToast('Password updated!');
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
    } catch (err) {
      showToast(err.message || 'Failed to update password', 'error');
    } finally {
      setPwSaving(false);
    }
  };

  const currentTier = profile?.tier || 'Discovery';

  if (loading) {
    return (
      <AppLayout role="seeker">
        <div className="page-loading"><div className="spinner" /><p>Loading settings…</p></div>
      </AppLayout>
    );
  }

  return (
    <AppLayout role="seeker">
      <div className="page-body">
        <div className="page-header">
          <div>
            <h1 className="page-title">Settings</h1>
            <p className="page-subtitle">Manage your account and preferences</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="tabs">
          {['profile', 'membership', 'notifications', 'account'].map(t => (
            <button key={t} className={`tab${tab === t ? ' tab-active' : ''}`} onClick={() => setTab(t)}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* Tab 1: Profile */}
        {tab === 'profile' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '600px' }}>
            {/* Personal */}
            <div className="card">
              <p className="section-label" style={{ marginBottom: '16px' }}>PERSONAL</p>
              <div style={{ marginBottom: '20px' }}>
                <AvatarUpload
                  currentUrl={profile?.avatar_url}
                  userId={user?.id}
                  bucket="avatars"
                  onUpload={(url) => {
                    setProfile(prev => ({ ...prev, avatar_url: url }));
                    supabase.from('seeker_profiles').upsert({
                      user_id: user?.id,
                      avatar_url: url,
                      name: name || user?.email?.split('@')[0] || 'Friend',
                      tier: profile?.tier || 'Discovery',
                      updated_at: new Date().toISOString(),
                    }, { onConflict: 'user_id' }).then(({ error }) => {
                      if (error) console.error('Error upserting avatar:', error);
                    });
                  }}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Name</label>
                <input type="text" className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder="Your name" />
              </div>
              <div className="form-group">
                <label className="form-label">Bio</label>
                <textarea className="form-textarea" value={bio} onChange={e => setBio(e.target.value)} placeholder="A short bio…" rows={3} />
              </div>
            </div>

            {/* Coaching preferences */}
            <div className="card">
              <p className="section-label" style={{ marginBottom: '16px' }}>COACHING PREFERENCES</p>

               <div className="form-group">
                <label className="form-label">Goals (select all that apply)</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px', marginTop: '4px' }}>
                  {GOALS_OPTIONS.map(g => (
                    <label key={g} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', cursor: 'pointer', color: 'var(--text-soft)' }}>
                      <input 
                        type="checkbox" 
                        checked={goals.includes(g)} 
                        onChange={() => toggleGoal(g)} 
                        style={{ width: '18px', height: '18px', margin: 0, padding: 0, flexShrink: 0, cursor: 'pointer', accentColor: 'var(--primary)' }}
                      />
                      <span>{g}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Preferred format</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px', marginTop: '4px' }}>
                  {FORMAT_OPTIONS.map(f => (
                    <label key={f} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', cursor: 'pointer', color: 'var(--text-soft)' }}>
                      <input 
                        type="checkbox" 
                        checked={formats.includes(f)} 
                        onChange={() => toggleFormat(f)} 
                        style={{ width: '18px', height: '18px', margin: 0, padding: 0, flexShrink: 0, cursor: 'pointer', accentColor: 'var(--primary)' }}
                      />
                      <span>{f}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Experience level</label>
                <select className="form-select" value={experience} onChange={e => setExperience(e.target.value)}>
                  <option value="">Select…</option>
                  {EXPERIENCE_OPTIONS.map(o => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </div>
            </div>

            <button className="btn btn-primary" onClick={handleSaveProfile} disabled={saving} style={{ width: 'fit-content' }}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>

            {/* Referral section */}
            {profile?.referral_code && (
              <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <p className="section-label">REFER A FRIEND</p>
                <p style={{ fontSize: '14px', color: 'var(--text-soft)' }}>
                  Share your link and earn 1 free session when your friend subscribes.
                </p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    className="form-input"
                    value={`${window.location.origin}/signup?ref=${profile.referral_code}`}
                    readOnly
                    style={{ flex: 1 }}
                  />
                  <button
                    className="btn btn-outline"
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/signup?ref=${profile.referral_code}`);
                      showToast('Copied!');
                    }}
                  >Copy</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Membership */}
        {tab === 'membership' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Current plan highlight */}
            <div className="card" style={{ maxWidth: '420px', borderLeft: '4px solid var(--accent)' }}>
              <p className="section-label" style={{ marginBottom: '10px' }}>CURRENT PLAN</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '32px' }}>🌱</span>
                <div>
                  <p style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-h)' }}>{currentTier}</p>
                  <p style={{ fontSize: '13px', color: 'var(--text-soft)' }}>Active · Renews monthly</p>
                </div>
              </div>
            </div>

            {/* Tier comparison */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
              {TIERS.map(tier => {
                const isCurrent = currentTier === tier.name;
                return (
                  <div
                    key={tier.name}
                    className="card"
                    style={{ border: isCurrent ? '2px solid var(--accent)' : undefined, position: 'relative' }}
                  >
                    {isCurrent && (
                      <span className="badge badge-green" style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', whiteSpace: 'nowrap' }}>
                        Current plan
                      </span>
                    )}
                    <p style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-h)', marginBottom: '4px' }}>{tier.name}</p>
                    <p style={{ fontSize: '22px', fontWeight: 700, color: 'var(--accent)', marginBottom: '12px' }}>{tier.price}</p>
                    <ul style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
                      {tier.features.map(f => (
                        <li key={f} style={{ fontSize: '13px', color: 'var(--text-h)', display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <span style={{ color: 'var(--accent)' }}>✓</span> {f}
                        </li>
                      ))}
                    </ul>
                    <button
                      className={`btn ${isCurrent ? 'btn-outline' : 'btn-primary'}`}
                      style={{ width: '100%', justifyContent: 'center' }}
                      disabled={isCurrent || upgrading || tier.price === 'Free'}
                      onClick={() => !isCurrent && tier.price !== 'Free' && handleUpgrade(tier.name)}
                    >
                      {upgrading ? 'Redirecting…' : isCurrent ? 'Current plan' : tier.price === 'Free' ? 'Free' : `Upgrade to ${tier.name}`}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 3: Notifications */}
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
                      <input type="checkbox" checked={!!notif[key]} onChange={() => toggleNotif(key)} style={{ display: 'none' }} />
                      <span className="toggle-slider" onClick={() => toggleNotif(key)} />
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
        {/* Tab 4: Account */}
        {tab === 'account' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '480px' }}>
            <div className="card">
              <p className="section-label" style={{ marginBottom: '16px' }}>CHANGE PASSWORD</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">New password</label>
                  <input
                    type="password"
                    className="form-input"
                    placeholder="Min. 6 characters"
                    value={newPw}
                    onChange={e => setNewPw(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Confirm new password</label>
                  <input
                    type="password"
                    className="form-input"
                    placeholder="Repeat password"
                    value={confirmPw}
                    onChange={e => setConfirmPw(e.target.value)}
                  />
                </div>
                <button
                  className="btn btn-primary"
                  style={{ width: 'fit-content' }}
                  onClick={handleChangePassword}
                  disabled={pwSaving}
                >
                  {pwSaving ? 'Saving…' : 'Update password'}
                </button>
              </div>
            </div>

            <div className="card" style={{ borderLeft: '4px solid var(--error)' }}>
              <p className="section-label" style={{ marginBottom: '8px', color: 'var(--error)' }}>DANGER ZONE</p>
              <p style={{ fontSize: '13px', color: 'var(--text-soft)', marginBottom: '12px' }}>
                To delete your account, please contact support at info@thecoachingcollectiveonline.com
              </p>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
