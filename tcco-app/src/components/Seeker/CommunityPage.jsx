import React, { useState } from 'react';
import AppLayout from '../Layout/AppLayout';
import { showToast } from '../shared/Toast';
import '../Layout/AppLayout.css';

const INITIAL_COMMUNITY_POSTS = [
  {
    id: 'p1',
    author: 'Sarah Chen',
    role: 'Coach',
    time: '2h ago',
    content: "Growth occurs when we push outside our comfort zones. What is one step you took this week?",
    likes: 24,
    replies: 8,
    tag: '#mindset',
    liked: false,
  },
  {
    id: 'p2',
    author: 'Test Seeker',
    role: 'Member',
    time: '5h ago',
    content: "Just completed my 7th session. Progress is slow but it really compounds over time! 🌱",
    likes: 31,
    replies: 12,
    tag: '#progress',
    liked: false,
  },
  {
    id: 'p3',
    author: 'Marcus Williams',
    role: 'Coach',
    time: '1d ago',
    content: "Journal prompt of the week: What action would you take if failure wasn't an option?",
    likes: 47,
    replies: 19,
    tag: '#journal',
    liked: false,
  },
];

const UPCOMING_COMMUNITY_EVENTS = [
  { title: 'Group Coaching: Navigating Change', date: 'Tue 20 May, 6pm', attending: 18 },
  { title: 'Mindfulness Drop-in',               date: 'Thu 22 May, 12pm', attending: 34 },
  { title: 'Career Clarity Workshop',            date: 'Sat 24 May, 2pm',  attending: 9 },
];

const POPULAR_TRENDS = ['#mindset', '#burnout', '#career', '#confidence', '#boundaries', '#gratitude'];

function getInitialsOfUser(fullName) {
  if (!fullName) return '';
  const parts = fullName.split(' ');
  return parts.map(part => part.charAt(0)).join('').slice(0, 2).toUpperCase();
}

export default function CommunityPage() {
  const [posts, setPosts]         = useState(INITIAL_COMMUNITY_POSTS);
  const [postText, setPostText]   = useState('');
  const [selectedTag, setSelectedTag] = useState('');

  const TAGS = ['#mindset', '#career', '#relationships', '#wellness', '#gratitude'];

  const handlePost = () => {
    if (!postText.trim()) return;
    const newPost = {
      id: 'user-' + Date.now(),
      author: 'You',
      role: 'Member',
      time: 'Just now',
      content: postText.trim(),
      likes: 0,
      replies: 0,
      tag: selectedTag || '#community',
      liked: false,
    };
    setPosts(prev => [newPost, ...prev]);
    setPostText('');
    setSelectedTag('');
    showToast('Posted to community!');
  };

  const toggleLike = (id) => {
    setPosts(prev => prev.map(p =>
      p.id === id
        ? { ...p, liked: !p.liked, likes: p.liked ? p.likes - 1 : p.likes + 1 }
        : p
    ));
  };

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
            {posts.map(post => (
              <div key={post.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* Author row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div className="avatar avatar-sm" style={{ fontSize: '12px', fontWeight: 700 }}>
                    {getInitialsOfUser(post.author)}
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
            ))}
          </div>

          {/* Right: Sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Upcoming events */}
            <div className="card">
              <p className="section-label" style={{ marginBottom: '14px' }}>UPCOMING EVENTS</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {UPCOMING_COMMUNITY_EVENTS.map((ev, i) => (
                  <div key={i} style={{ paddingBottom: '14px', borderBottom: i < UPCOMING_COMMUNITY_EVENTS.length - 1 ? '1px solid var(--border-card)' : 'none' }}>
                    <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-h)', marginBottom: '4px' }}>{ev.title}</p>
                    <p style={{ fontSize: '12px', color: 'var(--text-soft)', marginBottom: '2px' }}>📅 {ev.date}</p>
                    <p style={{ fontSize: '12px', color: 'var(--text-soft)', marginBottom: '8px' }}>{ev.attending} attending</p>
                    <button
                      className="btn btn-outline btn-sm"
                      style={{ width: '100%', justifyContent: 'center' }}
                      onClick={() => showToast("RSVP'd!")}
                    >
                      RSVP
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Community stats */}
            <div className="card">
              <p className="section-label" style={{ marginBottom: '14px' }}>COMMUNITY STATS</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '14px' }}>
                {[
                  { icon: '🧑', label: 'Members', value: '342' },
                  { icon: '👥', label: 'Coaches', value: '28' },
                  { icon: '🌱', label: 'Sessions completed', value: '1,204' },
                  { icon: '📓', label: 'Journal entries', value: '876' },
                ].map(stat => (
                  <div key={stat.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-soft)' }}>{stat.icon} {stat.label}</span>
                    <span style={{ fontWeight: 700, color: 'var(--text-h)' }}>{stat.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Trending topics */}
            <div className="card">
              <p className="section-label" style={{ marginBottom: '12px' }}>TRENDING TOPICS</p>
              <div className="chips-row" style={{ flexWrap: 'wrap' }}>
                {POPULAR_TRENDS.map(tag => (
                  <span key={tag} className="chip" style={{ fontSize: '12px' }}>{tag}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
