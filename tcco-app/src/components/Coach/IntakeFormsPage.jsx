import React, { useState, useEffect } from 'react';
import { useAuth } from '../../auth/useAuth';
import { supabase } from '../../lib/supabase';
import AppLayout from '../Layout/AppLayout';
import { showToast } from '../shared/Toast';
import '../Layout/AppLayout.css';

const QUESTION_TYPES = [
  { value: 'text',   label: '✏️ Text answer' },
  { value: 'choice', label: '☑️ Multiple choice' },
  { value: 'scale',  label: '📊 Rating scale (1–10)' },
];

function newQuestion() {
  return { id: crypto.randomUUID(), type: 'text', question: '', options: [], required: false };
}

export default function IntakeFormsPage() {
  const { user } = useAuth();
  const [coachId, setCoachId]   = useState(null);
  const [form, setForm]         = useState(null);   // the coach's single intake form
  const [title, setTitle]       = useState('New Client Intake');
  const [questions, setQuestions] = useState([]);
  const [required, setRequired] = useState(true);
  const [saving, setSaving]     = useState(false);
  const [loading, setLoading]   = useState(true);
  const [responses, setResponses] = useState([]);
  const [tab, setTab]           = useState('builder'); // 'builder' | 'responses'

  useEffect(() => { if (user?.id) load(); }, [user?.id]); // eslint-disable-line

  const load = async () => {
    const { data: cp } = await supabase.from('coach_profiles').select('id').eq('user_id', user.id).single();
    if (!cp) { setLoading(false); return; }
    setCoachId(cp.id);

    const { data: f } = await supabase.from('intake_forms').select('*').eq('coach_id', cp.id).single();
    if (f) {
      setForm(f);
      setTitle(f.title);
      setQuestions(f.questions || []);
      setRequired(f.is_required ?? true);

      const { data: r } = await supabase
        .from('intake_responses')
        .select('*, seeker:seeker_profiles(name)')
        .eq('form_id', f.id)
        .order('created_at', { ascending: false });
      setResponses(r || []);
    }
    setLoading(false);
  };

  const save = async () => {
    if (!coachId) return;
    setSaving(true);
    const payload = { coach_id: coachId, title, questions, is_required: required };
    let error;
    if (form?.id) {
      ({ error } = await supabase.from('intake_forms').update(payload).eq('id', form.id));
    } else {
      const { data, error: e } = await supabase.from('intake_forms').insert(payload).select().single();
      error = e;
      if (data) setForm(data);
    }
    setSaving(false);
    if (error) { showToast('Save failed: ' + error.message, 'error'); return; }
    showToast('Intake form saved!');
  };

  const addQuestion = () => setQuestions(q => [...q, newQuestion()]);

  const updateQuestion = (id, patch) =>
    setQuestions(q => q.map(x => x.id === id ? { ...x, ...patch } : x));

  const removeQuestion = (id) =>
    setQuestions(q => q.filter(x => x.id !== id));

  const moveQuestion = (id, dir) => {
    setQuestions(q => {
      const idx = q.findIndex(x => x.id === id);
      const next = idx + dir;
      if (next < 0 || next >= q.length) return q;
      const arr = [...q];
      [arr[idx], arr[next]] = [arr[next], arr[idx]];
      return arr;
    });
  };

  if (loading) return (
    <AppLayout role="coach">
      <div className="page-loading"><div className="spinner" /><p>Loading…</p></div>
    </AppLayout>
  );

  return (
    <AppLayout role="coach">
      <div className="page-body">
        <div className="page-header">
          <div>
            <h1 className="page-title">Intake Forms</h1>
            <p className="page-subtitle">Collect info from new clients before their first session</p>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
          {['builder', 'responses'].map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`chip ${tab === t ? 'chip-active' : ''}`}
              style={{ textTransform: 'capitalize' }}
            >
              {t === 'builder' ? '🔨 Form Builder' : `📥 Responses (${responses.length})`}
            </button>
          ))}
        </div>

        {tab === 'builder' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '720px' }}>
            {/* Form settings */}
            <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label className="form-label">Form title</label>
                <input
                  className="form-input"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. New Client Intake"
                />
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px' }}>
                <input
                  type="checkbox"
                  checked={required}
                  onChange={e => setRequired(e.target.checked)}
                  style={{ width: '16px', height: '16px' }}
                />
                Require seekers to complete before booking
              </label>
            </div>

            {/* Questions */}
            {questions.length === 0 && (
              <div className="empty-state" style={{ padding: '32px' }}>
                <span className="empty-icon">📋</span>
                <p>No questions yet. Add your first question below.</p>
              </div>
            )}

            {questions.map((q, idx) => (
              <div key={q.id} className="card" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-soft)' }}>
                    Question {idx + 1}
                  </span>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button className="btn btn-outline btn-xs" onClick={() => moveQuestion(q.id, -1)} disabled={idx === 0}>↑</button>
                    <button className="btn btn-outline btn-xs" onClick={() => moveQuestion(q.id,  1)} disabled={idx === questions.length - 1}>↓</button>
                    <button className="btn btn-outline btn-xs" style={{ color: 'var(--error)' }} onClick={() => removeQuestion(q.id)}>✕</button>
                  </div>
                </div>

                <div>
                  <label className="form-label">Question text</label>
                  <input
                    className="form-input"
                    value={q.question}
                    onChange={e => updateQuestion(q.id, { question: e.target.value })}
                    placeholder="What do you hope to achieve through coaching?"
                  />
                </div>

                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: '180px' }}>
                    <label className="form-label">Type</label>
                    <select
                      className="form-input"
                      value={q.type}
                      onChange={e => updateQuestion(q.id, { type: e.target.value })}
                    >
                      {QUESTION_TYPES.map(t => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px', marginTop: '20px' }}>
                    <input
                      type="checkbox"
                      checked={q.required}
                      onChange={e => updateQuestion(q.id, { required: e.target.checked })}
                    />
                    Required
                  </label>
                </div>

                {q.type === 'choice' && (
                  <div>
                    <label className="form-label">Options (one per line)</label>
                    <textarea
                      className="form-input"
                      style={{ minHeight: '80px' }}
                      value={(q.options || []).join('\n')}
                      onChange={e => updateQuestion(q.id, { options: e.target.value.split('\n').filter(Boolean) })}
                      placeholder={"Option A\nOption B\nOption C"}
                    />
                  </div>
                )}
              </div>
            ))}

            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn btn-outline" onClick={addQuestion}>+ Add question</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>
                {saving ? 'Saving…' : 'Save form'}
              </button>
            </div>
          </div>
        ) : (
          /* Responses tab */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '800px' }}>
            {responses.length === 0 ? (
              <div className="empty-state">
                <span className="empty-icon">📥</span>
                <p>No responses yet. Share your profile with seekers to collect intake responses.</p>
              </div>
            ) : (
              responses.map(r => (
                <div key={r.id} className="card" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-h)' }}>{r.seeker?.name || 'Unknown seeker'}</span>
                    <span style={{ fontSize: '12px', color: 'var(--text-soft)' }}>
                      {new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                  {Object.entries(r.answers || {}).map(([qId, answer]) => {
                    const question = questions.find(q => q.id === qId);
                    return (
                      <div key={qId}>
                        <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-soft)', marginBottom: '2px' }}>
                          {question?.question || qId}
                        </p>
                        <p style={{ fontSize: '14px', color: 'var(--text-b)' }}>
                          {Array.isArray(answer) ? answer.join(', ') : String(answer)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <style>{`
        .card { background: var(--card-bg); border: 1px solid var(--border-card); border-radius: var(--r-md); box-shadow: var(--shadow-sm); }
        .btn-xs { padding: 3px 8px; font-size: 11px; }
      `}</style>
    </AppLayout>
  );
}
