import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import AppLayout from '../Layout/AppLayout';
import { showToast } from '../shared/Toast';
import '../Layout/AppLayout.css';

const TYPE_ICONS = { audio: '🎧', article: '📄', live_event: '🎥', program: '📋' };

export default function AdminContentPage() {
  const [content, setContent]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  useEffect(() => { load(); }, []);

  const load = async () => {
    const { data } = await supabase
      .from('content')
      .select('*, coach:coach_profiles(name)')
      .order('created_at', { ascending: false });
    setContent(data || []);
    setLoading(false);
  };

  const toggleFeatured = async (item) => {
    await supabase.from('content').update({ featured: !item.featured }).eq('id', item.id);
    setContent(c => c.map(x => x.id === item.id ? { ...x, featured: !x.featured } : x));
    showToast(item.featured ? 'Removed from featured' : 'Added to featured');
  };

  const togglePublished = async (item) => {
    await supabase.from('content').update({ published: !item.published }).eq('id', item.id);
    setContent(c => c.map(x => x.id === item.id ? { ...x, published: !x.published } : x));
    showToast(item.published ? 'Unpublished' : 'Published');
  };

  const filtered = content.filter(c => {
    if (typeFilter !== 'all' && c.type !== typeFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return c.title?.toLowerCase().includes(q) || c.coach?.name?.toLowerCase().includes(q);
    }
    return true;
  });

  if (loading) return (
    <AppLayout role="admin">
      <div className="page-loading"><div className="spinner" /><p>Loading…</p></div>
    </AppLayout>
  );

  return (
    <AppLayout role="admin">
      <div className="page-body">
        <div className="page-header">
          <div>
            <h1 className="page-title">Content Library</h1>
            <p className="page-subtitle">{content.length} pieces of content on the platform</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <div className="search-wrap" style={{ flex: '1 1 200px' }}>
            <span className="search-icon">🔍</span>
            <input
              className="search-bar"
              placeholder="Search by title or coach…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="chips-row">
            {['all', 'audio', 'article', 'live_event', 'program'].map(t => (
              <button
                key={t}
                className={`chip ${typeFilter === t ? 'chip-active' : ''}`}
                onClick={() => setTypeFilter(t)}
              >{t === 'all' ? 'All' : `${TYPE_ICONS[t] || ''} ${t.replace('_', ' ')}`}</button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filtered.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">📚</span>
              <p>No content found.</p>
            </div>
          ) : filtered.map(item => (
            <div key={item.id} style={{
              background: 'var(--card-bg)', border: '1px solid var(--border-card)',
              borderRadius: 'var(--r-md)', padding: '16px',
              display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap',
            }}>
              <span style={{ fontSize: '28px' }}>{TYPE_ICONS[item.type] || '📄'}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-h)', truncate: true }}>{item.title}</p>
                <p style={{ fontSize: '13px', color: 'var(--text-soft)' }}>
                  by {item.coach?.name || '—'}
                  {item.duration_minutes ? ` · ${item.duration_minutes} min` : ''}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
                <span style={{
                  fontSize: '11px', fontWeight: 600, padding: '3px 8px', borderRadius: '99px',
                  background: item.published ? '#f0fdf4' : '#f3f4f6',
                  color: item.published ? '#15803d' : '#6b7280',
                }}>
                  {item.published ? 'Published' : 'Draft'}
                </span>
                {item.featured && (
                  <span style={{ fontSize: '11px', fontWeight: 600, padding: '3px 8px', borderRadius: '99px', background: '#fef3c7', color: '#b45309' }}>
                    ⭐ Featured
                  </span>
                )}
                <button className="btn btn-outline btn-sm" onClick={() => togglePublished(item)}>
                  {item.published ? 'Unpublish' : 'Publish'}
                </button>
                <button className="btn btn-outline btn-sm" onClick={() => toggleFeatured(item)}>
                  {item.featured ? '★ Unfeature' : '☆ Feature'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
