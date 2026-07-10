import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../auth/useAuth';
import { supabase } from '../../lib/supabase';
import AppLayout from '../Layout/AppLayout';
import { showToast } from '../shared/Toast';
import '../Layout/AppLayout.css';

const ALLOWED_FILE_TYPES = {
  audio:      'audio/*,.mp3,.m4a,.wav',
  article:    '.pdf,.doc,.docx',
  live_event: 'video/*,.mp4,.mov',
  program:    '.pdf,.zip,.mp4,.mov,audio/*',
};

const CONTENT_TYPE_METADATA = {
  audio:      { label: 'Audio',      icon: '🎧' },
  article:    { label: 'Article',    icon: '📄' },
  live_event: { label: 'Live Event', icon: '🎥' },
  program:    { label: 'Program',    icon: '📋' },
};

const VALID_CONTENT_TYPES = ['audio', 'article', 'live_event', 'program'];

const defaultContentForm = {
  title: '',
  type: 'article',
  description: '',
  duration_minutes: '',
  tags: '',
  published: true,
  featured: false,
};

function ContentDetailsModal({ mode, initial, coachId, onClose, onSaved }) {
  const [form, setForm] = useState(initial || defaultContentForm);
  const [saving, setSaving] = useState(false);
  const [contentFile, setContentFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const uploadContentFile = async (file) => {
    setUploading(true);
    try {
      const ext = file.name.split('.').pop().toLowerCase();
      const path = `${coachId}/${Date.now()}-${file.name.replace(/[^a-z0-9._-]/gi, '_')}`;
      const { error } = await supabase.storage.from('content-files').upload(path, file, { upsert: false });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('content-files').getPublicUrl(path);
      return publicUrl;
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!form.title.trim()) { showToast('Title is required', 'error'); return; }
    setSaving(true);
    try {
      let contentUrl = form.content_url || null;

      // Upload file if one was selected
      if (contentFile) {
        contentUrl = await uploadContentFile(contentFile);
      }

      const tags = form.tags
        ? form.tags.split(',').map(t => t.trim()).filter(Boolean)
        : (Array.isArray(form.tags) ? form.tags : []);

      const payload = {
        coach_id: coachId,
        title: form.title.trim(),
        type: form.type,
        description: form.description,
        duration_minutes: form.duration_minutes ? parseInt(form.duration_minutes) : null,
        tags,
        content_url: contentUrl,
        published: form.published,
        featured: form.featured,
      };

      if (mode === 'create') {
        const { error } = await supabase.from('content').insert(payload);
        if (error) throw error;
        showToast('Content created successfully!');
      } else {
        const { error } = await supabase.from('content').update(payload).eq('id', initial.id);
        if (error) throw error;
        showToast('Content updated successfully!');
      }
      onSaved();
      onClose();
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  // Normalize tags for display in input
  const tagsValue = Array.isArray(form.tags) ? form.tags.join(', ') : form.tags;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: '560px', width: '100%' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <p style={{ fontWeight: 700, fontSize: '16px', color: 'var(--text-h)' }}>
            {mode === 'create' ? 'Create New Content' : 'Edit Content'}
          </p>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="form-row">
            <div className="form-group" style={{ flex: 2 }}>
              <label className="form-label">Title *</label>
              <input
                type="text"
                className="form-input"
                placeholder="Content title"
                value={form.title}
                onChange={e => set('title', e.target.value)}
              />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Type</label>
              <select
                className="form-select"
                value={form.type}
                onChange={e => set('type', e.target.value)}
              >
                {VALID_CONTENT_TYPES.map(t => (
                  <option key={t} value={t}>{CONTENT_TYPE_METADATA[t]?.label || t}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              className="form-textarea"
              style={{ minHeight: '80px' }}
              placeholder="Brief description…"
              value={form.description}
              onChange={e => set('description', e.target.value)}
            />
          </div>

          <div className="form-row">
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Duration (minutes)</label>
              <input
                type="number"
                className="form-input"
                placeholder="e.g. 20"
                value={form.duration_minutes}
                onChange={e => set('duration_minutes', e.target.value)}
              />
            </div>
            <div className="form-group" style={{ flex: 2 }}>
              <label className="form-label">Tags (comma separated)</label>
              <input
                type="text"
                className="form-input"
                placeholder="leadership, career, mindset"
                value={tagsValue}
                onChange={e => set('tags', e.target.value)}
              />
            </div>
          </div>

          {/* File upload */}
          <div className="form-group">
            <label className="form-label">
              {form.content_url && !contentFile ? 'Replace file (optional)' : 'Upload file (optional)'}
            </label>
            {form.content_url && !contentFile && (
              <p style={{ fontSize: '12px', color: 'var(--text-soft)', marginBottom: '6px' }}>
                Current: <a href={form.content_url} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>View file</a>
              </p>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? 'Uploading…' : contentFile ? '📎 ' + contentFile.name : '📎 Choose file'}
              </button>
              {contentFile && (
                <button
                  type="button"
                  className="btn btn-sm"
                  style={{ background: 'none', color: 'var(--error)', border: 'none', padding: '4px' }}
                  onClick={() => setContentFile(null)}
                >✕</button>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept={ALLOWED_FILE_TYPES[form.type] || '*/*'}
              style={{ display: 'none' }}
              onChange={e => {
                const f = e.target.files?.[0];
                if (f && f.size > 500 * 1024 * 1024) {
                  showToast('Max file size is 500 MB', 'error');
                  return;
                }
                setContentFile(f || null);
              }}
            />
            <p style={{ fontSize: '11px', color: 'var(--text-soft)', marginTop: '4px' }}>
              Accepted: {ALLOWED_FILE_TYPES[form.type] || 'any file'} · Max 500 MB
            </p>
          </div>

          <div style={{ display: 'flex', gap: '24px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', color: 'var(--text-b)' }}>
              <input
                type="checkbox"
                checked={form.published}
                onChange={e => set('published', e.target.checked)}
              />
              Published
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', color: 'var(--text-b)' }}>
              <input
                type="checkbox"
                checked={form.featured}
                onChange={e => set('featured', e.target.checked)}
              />
              Featured
            </label>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving || uploading || !form.title.trim()}
          >
            {uploading ? 'Uploading file…' : saving ? 'Saving…' : mode === 'create' ? 'Create content' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ContentPage() {
  const { user } = useAuth();
  const [coachId, setCoachId]     = useState(null);
  const [items, setItems]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [modal, setModal]         = useState(null); // null | { mode: 'create' | 'edit', item?: {} }

  useEffect(() => { if (!user?.id) return; loadContent(); }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadContent = async () => {
    try {
      const { data: coachRow } = await supabase
        .from('coach_profiles').select('id').eq('user_id', user?.id).single();
      const cid = coachRow?.id;
      if (!cid) { setLoading(false); return; }
      setCoachId(cid);

      const { data, error } = await supabase
        .from('content')
        .select('*')
        .eq('coach_id', cid)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setItems(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const togglePublished = async (item) => {
    const newVal = !item.published;
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, published: newVal } : i));
    const { error } = await supabase.from('content').update({ published: newVal }).eq('id', item.id);
    if (error) {
      showToast('Failed to update status', 'error');
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, published: item.published } : i));
    } else {
      showToast(newVal ? 'Content Published!' : 'Content Drafted');
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Unpublish "${item.title}"? (Content will be hidden but not permanently deleted.)`)) return;
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, published: false } : i));
    await supabase.from('content').update({ published: false }).eq('id', item.id);
    showToast('Content unpublished');
  };

  if (loading) {
    return (
      <AppLayout role="coach">
        <div className="page-loading"><div className="spinner" /><p>Loading content items…</p></div>
      </AppLayout>
    );
  }

  return (
    <AppLayout role="coach">
      <div className="page-body">
        <div className="page-header">
          <div>
            <h1 className="page-title">Content</h1>
            <p className="page-subtitle">Manage your audio, articles, and programs</p>
          </div>
          <button
            className="btn btn-primary"
            onClick={() => setModal({ mode: 'create' })}
          >
            + Create new content
          </button>
        </div>

        {items.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">&#128218;</span>
            <p>No content yet. Create your first piece of content above.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            {items.map(item => {
              const meta = CONTENT_TYPE_METADATA[item.type] || { icon: '📄', label: item.type };
              const tagsArr = Array.isArray(item.tags) ? item.tags : [];
              return (
                <div
                  key={item.id}
                  className="card"
                  style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
                >
                  {/* Type badge + title */}
                  <div>
                    <span className={`badge ${
                      item.type === 'audio' ? 'badge-blue' :
                      item.type === 'live_event' ? 'badge-yellow' :
                      item.type === 'program' ? 'badge-green' : 'badge-gray'
                    }`} style={{ marginBottom: '8px', display: 'inline-block' }}>
                      {meta.icon} {meta.label}
                    </span>
                    <p style={{
                      fontWeight: 700, fontSize: '15px', color: 'var(--text-h)',
                      marginBottom: '4px',
                    }}>
                      {item.title}
                    </p>
                    {item.description && (
                      <p style={{
                        fontSize: '13px', color: 'var(--text-soft)', lineHeight: 1.5,
                        overflow: 'hidden',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                      }}>
                        {item.description}
                      </p>
                    )}
                  </div>

                  {/* File link */}
                  {item.content_url && (
                    <a
                      href={item.content_url}
                      target="_blank"
                      rel="noreferrer"
                      style={{ fontSize: '12px', color: 'var(--accent)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    >
                      📎 View file
                    </a>
                  )}

                  {/* Duration + Tags */}
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                    {item.duration_minutes && (
                      <span style={{ fontSize: '12px', color: 'var(--text-soft)' }}>
                        {item.duration_minutes} min
                      </span>
                    )}
                    {tagsArr.map(tag => (
                      <span
                        key={tag}
                        className="chip"
                        style={{ fontSize: '11px' }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* Published toggle */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      onClick={() => togglePublished(item)}
                      style={{
                        width: '36px', height: '20px', borderRadius: '10px',
                        background: item.published ? 'var(--accent)' : '#D1D5DB',
                        border: 'none', cursor: 'pointer', position: 'relative',
                        transition: 'background .2s', flexShrink: 0,
                      }}
                    >
                      <span style={{
                        position: 'absolute', top: '2px',
                        left: item.published ? '18px' : '2px',
                        width: '16px', height: '16px', borderRadius: '50%',
                        background: '#fff', transition: 'left .2s',
                      }} />
                    </button>
                    <span style={{ fontSize: '13px', color: 'var(--text-soft)' }}>
                      {item.published ? 'Published' : 'Draft'}
                    </span>
                    {item.featured && (
                      <span className="badge badge-yellow" style={{ marginLeft: 'auto', fontSize: '11px' }}>
                        Featured
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
                    <button
                      className="btn btn-outline btn-sm"
                      style={{ flex: 1 }}
                      onClick={() => setModal({ mode: 'edit', item: {
                        ...item,
                        tags: Array.isArray(item.tags) ? item.tags.join(', ') : (item.tags || ''),
                        duration_minutes: item.duration_minutes || '',
                      }})}
                    >
                      Edit
                    </button>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => handleDelete(item)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create / Edit modal */}
      {modal && (
        <ContentDetailsModal
          mode={modal.mode}
          initial={modal.item}
          coachId={coachId}
          onClose={() => setModal(null)}
          onSaved={loadContent}
        />
      )}
    </AppLayout>
  );
}
