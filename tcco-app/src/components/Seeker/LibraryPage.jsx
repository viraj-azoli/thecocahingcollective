import React, { useState, useEffect } from 'react';
import Icon from '../../ui/Icon';
import { useAuth } from '../../auth/useAuth';
import { supabase } from '../../lib/supabase';
import { track } from '../../lib/analytics';
import AppLayout from '../Layout/AppLayout';
import { showToast } from '../shared/Toast';
import '../Layout/AppLayout.css';

const TYPE_META = {
  audio:      { icon: 'audio', label: 'Audio' },
  article:    { icon: 'article', label: 'Article' },
  live_event: { icon: 'live', label: 'Live' },
  program:    { icon: 'intake', label: 'Program' },
};

const FILTERS = ['All', 'Audio', 'Article', 'Live', 'Program'];

const typeToFilter = (type) => {
  if (type === 'audio') return 'Audio';
  if (type === 'article') return 'Article';
  if (type === 'live_event') return 'Live';
  if (type === 'program') return 'Program';
  return 'All';
};

export default function LibraryPage() {
  const { user } = useAuth();
  const [content, setContent]       = useState([]);
  const [engagement, setEngagement] = useState({});
  const [filter, setFilter]         = useState('All');
  const [loading, setLoading]       = useState(true);
  const [profileId, setProfileId]   = useState(null);

  useEffect(() => { if (!user?.id) return; loadData(); }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadData = async () => {
    try {
      const { data: profileRow } = await supabase
        .from('seeker_profiles').select('id').eq('user_id', user?.id).single();
      const pid = profileRow?.id;
      if (!pid) { setLoading(false); return; }
      setProfileId(pid);

      const [{ data: all }, { data: eng }] = await Promise.all([
        supabase
          .from('content')
          .select('*, coach:coach_profiles(name)')
          .eq('published', true)
          .order('featured', { ascending: false })
          .order('created_at', { ascending: false }),
        supabase
          .from('content_engagement')
          .select('*')
          .eq('seeker_id', pid),
      ]);
      setContent(all || []);
      const map = {};
      (eng || []).forEach(e => { map[e.content_id] = e; });
      setEngagement(map);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleStart = async (item) => {
    if (!profileId) return;
    const { data, error } = await supabase
      .from('content_engagement')
      .upsert(
        { seeker_id: profileId, content_id: item.id, status: 'started', completion_percentage: 0 },
        { onConflict: 'seeker_id,content_id' }
      )
      .select()
      .single();
    if (!error) {
      track('content_started', { contentId: item.id, type: item.type, title: item.title });
      setEngagement(prev => ({ ...prev, [item.id]: data || { content_id: item.id, status: 'started', completion_percentage: 0 } }));
      showToast('Started "' + item.title + '"!');
    }
  };

  const handleComplete = async (item) => {
    const existing = engagement[item.id];
    if (existing?.id) {
      await supabase
        .from('content_engagement')
        .update({ status: 'completed', completion_percentage: 100 })
        .eq('id', existing.id);
    } else {
      if (!profileId) return;
      await supabase
        .from('content_engagement')
        .upsert(
          { seeker_id: profileId, content_id: item.id, status: 'completed', completion_percentage: 100 },
          { onConflict: 'seeker_id,content_id' }
        );
    }
    setEngagement(prev => ({
      ...prev,
      [item.id]: { ...(prev[item.id] || {}), content_id: item.id, status: 'completed', completion_percentage: 100 },
    }));
    showToast('"' + item.title + '" marked complete! ✓');
  };

  const featured = content.filter(i => i.featured);
  const filtered = filter === 'All' ? content : content.filter(i => typeToFilter(i.type) === filter);

  if (loading) {
    return (
      <AppLayout role="seeker">
        <div className="page-loading"><div className="spinner" /><p>Loading library…</p></div>
      </AppLayout>
    );
  }

  return (
    <AppLayout role="seeker">
      <div className="page-body">
        <div className="page-header">
          <div>
            <h1 className="page-title">Library</h1>
            <p className="page-subtitle">Explore resources curated by your coaches</p>
          </div>
        </div>

        {/* Featured section */}
        {featured.length > 0 && filter === 'All' && (
          <div>
            <p className="section-label" style={{ marginBottom: '12px' }}>FEATURED</p>
            <div className="lib-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '8px' }}>
              {featured.slice(0, 3).map(item => (
                <ContentCard
                  key={item.id}
                  item={item}
                  eng={engagement[item.id]}
                  onStart={handleStart}
                  onComplete={handleComplete}
                  isFeatured
                />
              ))}
            </div>
          </div>
        )}

        {/* Filter tabs */}
        <div className="tabs" style={{ marginBottom: '4px' }}>
          {FILTERS.map(f => (
            <button
              key={f}
              className={`tab${filter === f ? ' tab-active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Content grid */}
        {filtered.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon"><Icon name="library" size={22} /></span>
            <p>No content found in this category.</p>
          </div>
        ) : (
          <div className="lib-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
            {filtered.map(item => (
              <ContentCard
                key={item.id}
                item={item}
                eng={engagement[item.id]}
                onStart={handleStart}
                onComplete={handleComplete}
              />
            ))}
          </div>
        )}
      </div>

      <style>{`
        @media (max-width: 1100px) {
          .lib-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 680px) {
          .lib-grid { grid-template-columns: 1fr !important; }
        }
        .content-desc {
          overflow: hidden;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
        }
      `}</style>
    </AppLayout>
  );
}

function ContentCard({ item, eng, onStart, onComplete, isFeatured }) {
  const meta = TYPE_META[item.type] || { icon: 'article', label: item.type };
  const status = eng?.status;
  const pct = eng?.completion_percentage ?? 0;

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '10px', position: 'relative' }}>
      {isFeatured && (
        <span className="badge badge-yellow" style={{ position: 'absolute', top: '14px', right: '14px' }}>⭐ Featured</span>
      )}

      {/* Type chip + duration */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span className="badge badge-blue" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {meta.icon} {meta.label}
        </span>
        {item.duration_minutes && (
          <span style={{ fontSize: '12px', color: 'var(--text-soft)' }}>{item.duration_minutes} min</span>
        )}
      </div>

      {/* Title */}
      <p style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-h)', lineHeight: 1.3 }}>{item.title}</p>

      {/* Description (3-line clamp) */}
      {item.description && (
        <p className="content-desc" style={{ fontSize: '13px', color: 'var(--text-soft)', lineHeight: 1.5, flex: 1 }}>
          {item.description}
        </p>
      )}

      {/* Coach */}
      {item.coach?.name && (
        <p style={{ fontSize: '12px', color: 'var(--text-soft)', fontStyle: 'italic' }}>by {item.coach.name}</p>
      )}

      {/* Tags */}
      {item.tags && item.tags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
          {item.tags.map(tag => (
            <span key={tag} className="chip" style={{ fontSize: '11px', padding: '2px 8px' }}>{tag}</span>
          ))}
        </div>
      )}

      {/* Engagement */}
      <div style={{ marginTop: 'auto', paddingTop: '8px', borderTop: '1px solid var(--border-card)' }}>
        {status === 'completed' ? (
          <span className="badge badge-green">✓ Completed</span>
        ) : status === 'started' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ height: '6px', background: 'var(--border-card)', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: 'var(--accent)', borderRadius: '3px' }} />
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => onComplete(item)}>Mark complete</button>
          </div>
        ) : (
          <button className="btn btn-outline btn-sm" onClick={() => onStart(item)}>Start</button>
        )}
      </div>
    </div>
  );
}
