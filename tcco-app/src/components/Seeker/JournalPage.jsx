import React, { useState, useEffect } from 'react';
import Icon from '../../ui/Icon';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../auth/useAuth';
import { supabase } from '../../lib/supabase';
import { track } from '../../lib/analytics';
import AppLayout from '../Layout/AppLayout';
import { showToast } from '../shared/Toast';
import '../Layout/AppLayout.css';

const MOODS = [
  { rating: 1, emoji: 'mood', label: 'Low',    color: '#D97706' },
  { rating: 2, emoji: 'mood', label: 'Off',    color: '#F59E0B' },
  { rating: 3, emoji: 'mood', label: 'Okay',   color: '#EAB308' },
  { rating: 4, emoji: 'mood', label: 'Good',   color: '#16A34A' },
  { rating: 5, emoji: 'spark', label: 'Bright', color: '#06B6D4' },
];

const PROMPTS = [
  '',
  'What are you grateful for today?',
  'What challenged you today?',
  'What did you do for yourself today?',
  'How are you feeling right now?',
  'What do you want to let go of?',
  'What intention do you carry into tomorrow?',
];

const today = () => new Date().toISOString().split('T')[0];

function formatDate(ds) {
  return new Date(ds + 'T00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });
}

function formatShort(ds) {
  return new Date(ds + 'T00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getMood(rating) {
  return MOODS.find(m => m.rating === rating) || MOODS[2];
}

export default function JournalPage() {
  const { user } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const isNewPath = location.pathname.includes('/new');

  const [entries, setEntries]     = useState([]);
  const [profileId, setProfileId] = useState(null);
  const [selected, setSelected]   = useState(null);
  const [showNew, setShowNew]     = useState(isNewPath);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);

  // New entry form state
  const [newDate, setNewDate]     = useState(today());
  const [newMood, setNewMood]     = useState(3);
  const [newPrompt, setNewPrompt] = useState('');
  const [newContent, setNewContent] = useState('');

  useEffect(() => { if (!user?.id) return; loadEntries(); }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (isNewPath) setShowNew(true); }, [isNewPath]);

  const loadEntries = async () => {
    try {
      const { data: profileRow } = await supabase
        .from('seeker_profiles').select('id').eq('user_id', user?.id).single();
      const pid = profileRow?.id;
      if (!pid) { setLoading(false); return; }
      setProfileId(pid);

      const { data } = await supabase
        .from('journal_entries')
        .select('*')
        .eq('seeker_id', pid)
        .order('date', { ascending: false });
      setEntries(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!newContent.trim()) return;
    setSaving(true);
    try {
      if (!profileId) { showToast('Profile not found', 'error'); setSaving(false); return; }

      const { error } = await supabase.from('journal_entries').insert({
        seeker_id: profileId,
        date: newDate,
        mood: newMood,
        content: newContent,
        prompt: newPrompt || null,
      });
      if (error) throw error;
      track('journal_entry_saved', { mood: newMood, hasContent: !!newContent });
      showToast('Entry saved!');
      setNewContent('');
      setNewMood(3);
      setNewPrompt('');
      setNewDate(today());
      const { data } = await supabase
        .from('journal_entries')
        .select('*')
        .eq('seeker_id', profileId)
        .order('date', { ascending: false });
      const refreshed = data || [];
      setEntries(refreshed);
      setSelected(refreshed[0] || null);
      setShowNew(false);
      if (isNewPath) navigate('/journal');
    } catch (err) {
      showToast('Error saving entry', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (entry) => {
    if (!window.confirm('Delete this journal entry?')) return;
    const { error } = await supabase.from('journal_entries').delete().eq('id', entry.id);
    if (!error) {
      showToast('Entry deleted');
      setSelected(null);
      loadEntries();
    } else {
      showToast('Failed to delete entry', 'error');
    }
  };

  if (loading) {
    return (
      <AppLayout role="seeker">
        <div className="page-loading"><div className="spinner" /><p>Loading journal…</p></div>
      </AppLayout>
    );
  }

  return (
    <AppLayout role="seeker">
      {/* Full-height two-column layout */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', height: '100%' }}>

        {/* ── Left panel ── */}
        <div style={{
          width: 320,
          flexShrink: 0,
          background: 'var(--beige)',
          borderRight: '1px solid var(--border-card)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            padding: '24px 20px 16px',
            borderBottom: '1px solid var(--border-card)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--beige)',
          }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-h)' }}>Journal</h2>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => { setShowNew(true); setSelected(null); }}
            >
              + New entry
            </button>
          </div>

          {/* Entry list */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
            {entries.length === 0 ? (
              <div style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--text-soft)', fontSize: '14px' }}>
                No entries yet.<br />Start writing!
              </div>
            ) : entries.map(entry => {
              const mood = getMood(entry.mood);
              const isActive = selected?.id === entry.id && !showNew;
              return (
                <button
                  key={entry.id}
                  onClick={() => { setSelected(entry); setShowNew(false); }}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '12px 14px',
                    borderRadius: 8,
                    background: isActive ? '#fff' : 'transparent',
                    border: 'none',
                    borderLeft: isActive ? '3px solid var(--accent)' : '3px solid transparent',
                    display: 'flex',
                    gap: '10px',
                    alignItems: 'flex-start',
                    marginBottom: '2px',
                    cursor: 'pointer',
                    transition: 'background .1s',
                  }}
                >
                  <span style={{ fontSize: '20px', flexShrink: 0, marginTop: 1 }}>{mood.emoji}</span>
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <p style={{ fontSize: '13px', color: 'var(--text-soft)', marginBottom: '3px' }}>{formatShort(entry.date)}</p>
                    <p style={{
                      fontSize: '14px',
                      color: 'var(--text-b)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {entry.content?.slice(0, 80) || '(no content)'}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Right panel ── */}
        <div style={{ flex: 1, overflowY: 'auto', background: '#fff', padding: '32px' }}>

          {/* New entry form */}
          {showNew && (
            <div style={{ maxWidth: 640 }}>
              <h2 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-h)', marginBottom: '24px' }}>
                New Journal Entry
              </h2>

              {/* Date */}
              <div className="form-group">
                <label className="form-label">Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={newDate}
                  onChange={e => setNewDate(e.target.value)}
                />
              </div>

              {/* Mood */}
              <div className="form-group">
                <label className="form-label">How are you feeling?</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  {MOODS.map(m => {
                    const selected = newMood === m.rating;
                    return (
                      <button
                        key={m.rating}
                        onClick={() => setNewMood(m.rating)}
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: '50%',
                          border: `2px solid ${selected ? m.color : 'var(--border-card)'}`,
                          background: selected ? m.color : '#fff',
                          color: selected ? '#fff' : 'var(--text-b)',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 2,
                          cursor: 'pointer',
                          transition: 'all .15s',
                          fontFamily: 'inherit',
                          flexShrink: 0,
                        }}
                        title={m.label}
                      >
                        <span style={{ fontSize: '20px', lineHeight: 1 }}>{m.emoji}</span>
                      </button>
                    );
                  })}
                  {/* Label next to selected mood */}
                  <div style={{ display: 'flex', alignItems: 'center', marginLeft: 8 }}>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: getMood(newMood).color }}>
                      {getMood(newMood).label}
                    </span>
                  </div>
                </div>
              </div>

              {/* Prompt */}
              <div className="form-group">
                <label className="form-label">Prompt (optional)</label>
                <select className="form-select" value={newPrompt} onChange={e => setNewPrompt(e.target.value)}>
                  {PROMPTS.map((p, i) => (
                    <option key={i} value={p}>{p || '— No prompt —'}</option>
                  ))}
                </select>
              </div>

              {/* Content */}
              <div className="form-group">
                <label className="form-label">Entry</label>
                <textarea
                  className="form-textarea"
                  rows={8}
                  placeholder="What's on your mind?"
                  value={newContent}
                  onChange={e => setNewContent(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  className="btn btn-primary"
                  onClick={handleSave}
                  disabled={saving || !newContent.trim()}
                >
                  {saving ? 'Saving…' : 'Save entry'}
                </button>
                <button
                  className="btn btn-outline"
                  onClick={() => { setShowNew(false); setSelected(null); }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Entry detail */}
          {!showNew && selected && (
            <div style={{ maxWidth: 640 }}>
              {/* Date + mood header */}
              <div style={{ marginBottom: '24px' }}>
                <p style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-h)', marginBottom: '8px' }}>
                  {formatDate(selected.date)}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '28px' }}>{getMood(selected.mood).emoji}</span>
                  <span style={{
                    fontSize: '13px',
                    fontWeight: 700,
                    padding: '3px 10px',
                    borderRadius: 99,
                    background: getMood(selected.mood).color + '22',
                    color: getMood(selected.mood).color,
                  }}>
                    {getMood(selected.mood).label}
                  </span>
                </div>
              </div>

              {/* Prompt */}
              {selected.prompt && (
                <p style={{
                  fontStyle: 'italic',
                  color: 'var(--text-soft)',
                  fontSize: '14px',
                  borderLeft: '3px solid var(--accent)',
                  paddingLeft: '12px',
                  marginBottom: '20px',
                  lineHeight: 1.6,
                }}>
                  {selected.prompt}
                </p>
              )}

              {/* Content */}
              <p style={{ fontSize: '16px', color: 'var(--text-b)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                {selected.content}
              </p>

              {/* Delete */}
              <div style={{ marginTop: '40px', paddingTop: '20px', borderTop: '1px solid var(--border-card)' }}>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => handleDelete(selected)}
                >
                  Delete entry
                </button>
              </div>
            </div>
          )}

          {/* Placeholder */}
          {!showNew && !selected && (
            <div className="empty-state" style={{ marginTop: '80px' }}>
              <span className="empty-icon"><Icon name="journal" size={22} /></span>
              <p>Select an entry or create a new one</p>
              <button className="btn btn-primary btn-sm" onClick={() => setShowNew(true)}>
                + New entry
              </button>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
