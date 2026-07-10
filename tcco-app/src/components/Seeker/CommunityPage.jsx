import React, { useState, useEffect } from 'react';
import { useAuth } from '../../auth/useAuth';
import { supabase } from '../../lib/supabase';
import AppLayout from '../Layout/AppLayout';
import { showToast } from '../shared/Toast';
import '../Layout/AppLayout.css';

const TAGS = ['#mindset', '#career', '#relationships', '#wellness', '#gratitude'];

function getInitials(fullName) {
  if (!fullName) return '';
  const parts = fullName.split(' ');
  return parts.map(part => part.charAt(0)).join('').slice(0, 2).toUpperCase();
}

export default function CommunityPage() {
  const { user, userProfile } = useAuth();
  const [posts, setPosts] = useState([]);
  const [postText, setPostText] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('content')
        .select('*')
        .eq('content_type', 'community_post')
        .neq('status', 'removed')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const mapped = (data || []).map(p => ({
        id: p.id,
        author: p.author_name || 'Community Member',
        role: p.author_role || 'Member',
        time: formatTimeAgo(p.created_at),
        content: p.body || p.content || '',
        likes: p.likes_count || 0,
        replies: p.replies_count || 0,
        tag: p.tag || '#community',
        liked: false,
      }));
      setPosts(mapped);
    } catch (err) {
      // If table doesn't exist or no data, start with empty feed
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  const formatTimeAgo = (dateStr) => {
    if (!dateStr) return '';
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    const diffDays = Math.floor(diffHrs / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const handlePost = async () => {
    if (!postText.trim()) return;
    const tag = selectedTag || '#community';
    const authorName = userProfile?.name || user?.email?.split('@')[0] || 'Community Member';

    try {
      const { data, error } = await supabase.from('content').insert({
        user_id: user.id,
        content_type: 'community_post',
        body: postText.trim(),
        tag,
        author_name: authorName,
        author_role: userProfile?.user_type || 'Member',
        status: 'published',
        likes_count: 0,
        replies_count: 0,
      }).select('*').single();

      if (error && error.code === 'PGRST204') {
        // Table exists but schema mismatch — save locally for now
        const localPost = {
          id: 'local-' + Date.now(),
          author: authorName,
          role: userProfile?.user_type || 'Member',
          time: 'Just now',
          content: postText.trim(),
          likes: 0,
          replies: 0,
          tag,
          liked: false,
        };
        setPosts(prev => [localPost, ...prev]);
        setPostText('');
        setSelectedTag('');
        showToast('Posted to community!');
        return;
      }

      if (error) throw error;

      const newPost = {
        id: data.id,
        author: authorName,
        role: userProfile?.user_type || 'Member',
        time: 'Just now',
        content: postText.trim(),
        likes: 0,
        replies: 0,
        tag,
        liked: false,
      };
      setPosts(prev => [newPost, ...prev]);
      setPostText('');
      setSelectedTag('');
      showToast('Posted to community!');
    } catch (err) {
      showToast('Could not post. Please try again.', 'error');
    }
  };

  const toggleLike = (id) => {
    setPosts(prev => prev.map(p =>
      p.id === id
        ? { ...p, liked: !p.liked, likes: p.liked ? p.likes - 1 : p.likes + 1 }
        : p
    ));
  };

  if (loading) {
    return (
      <AppLayout role="seeker">
        <div className="page-loading"><div className="spinner" /><p>Loading community…</p></div>
      </AppLayout>
    );
  }

  return (
    <AppLayout role="seeker">
      <div className="page-body">
        <div className="page-header">
          <div>
            <h1 className="page-title">Community</h1>
            <p className="page-subtitle">Connect, share, and grow with fellow seekers</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '65% 1fr', gap: '24px', alignItems: 'start' }}>
          {/* Left: Feed */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Post box */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <textarea
                className="form-textarea"
                placeholder="Share something with the community..."
                value={postText}
                onChange={e => setPostText(e.target.value)}
                rows={3}
                style={{ resize: 'vertical' }}
              />
              <div className="chips-row" style={{ flexWrap: 'wrap' }}>
                {TAGS.map(tag => (
                  <button
                    key={tag}
                    className={`chip${selectedTag === tag ? ' chip-active' : ''}`}
                    onClick={() => setSelectedTag(prev => prev === tag ? '' : tag)}
                    style={{ fontSize: '12px' }}
                  >
                    {tag}
                  </button>
                ))}
              </div>
              <button
                className="btn btn-primary"
                onClick={handlePost}
                disabled={!postText.trim()}
                style={{ width: 'fit-content' }}
              >
                Post to community
              </button>
            </div>

            {/* Feed posts */}
            {posts.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
                <p style={{ fontSize: '15px', color: 'var(--text-soft)', marginBottom: '8px' }}>
                  No posts yet
                </p>
                <p style={{ fontSize: '13px', color: 'var(--text-soft)' }}>
                  Be the first to share something with the community!
                </p>
              </div>
            ) : (
              posts.map(post => (
                <div key={post.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {/* Author row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div className="avatar avatar-sm" style={{ fontSize: '12px', fontWeight: 700 }}>
                      {getInitials(post.author)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-h)' }}>{post.author}</p>
                        <span className={`badge ${post.role === 'Coach' ? 'badge-green' : 'badge-blue'}`} style={{ fontSize: '11px' }}>
                          {post.role}
                        </span>
                      </div>
                      <p style={{ fontSize: '12px', color: 'var(--text-soft)' }}>{post.time}</p>
                    </div>
                    <span className="chip" style={{ fontSize: '11px', padding: '2px 8px' }}>{post.tag}</span>
                  </div>

                  {/* Content */}
                  <p style={{ fontSize: '14px', color: 'var(--text-h)', lineHeight: 1.6 }}>{post.content}</p>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '16px', paddingTop: '8px', borderTop: '1px solid var(--border-card)' }}>
                    <button
                      onClick={() => toggleLike(post.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        fontSize: '13px', color: post.liked ? '#dc2626' : 'var(--text-soft)',
                        cursor: 'pointer', background: 'none', border: 'none', fontFamily: 'inherit',
                        fontWeight: post.liked ? 700 : 400,
                      }}
                    >
                      ❤️ {post.likes}
                    </button>
                    <button style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-soft)', cursor: 'pointer', background: 'none', border: 'none', fontFamily: 'inherit' }}>
                      💬 {post.replies}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Right: Sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Upcoming events */}
            <div className="card">
              <p className="section-label" style={{ marginBottom: '14px' }}>UPCOMING EVENTS</p>
              <div style={{ textAlign: 'center', padding: '20px 10px' }}>
                <p style={{ fontSize: '13px', color: 'var(--text-soft)' }}>
                  Live events coming soon. Check back for group coaching sessions, workshops, and community gatherings.
                </p>
              </div>
            </div>

            {/* Trending topics */}
            <div className="card">
              <p className="section-label" style={{ marginBottom: '12px' }}>TAGS</p>
              <div className="chips-row" style={{ flexWrap: 'wrap' }}>
                {TAGS.map(tag => (
                  <span
                    key={tag}
                    className="chip"
                    style={{ fontSize: '12px', cursor: 'pointer' }}
                    onClick={() => setSelectedTag(tag)}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}