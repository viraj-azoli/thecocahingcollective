import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import Icon from '../../ui/Icon';
import { useAuth } from '../../auth/useAuth';
import { useNavigate } from 'react-router-dom';
import './NotificationsDropdown.css';

const TYPE_ICONS = {
  new_booking:           'sessions',
  session_reminder:      'clock',
  new_message:           'messages',
  verification_approved: 'success',
  new_review:            'star',
  system:                'bell',
};

function timeAgo(ts) {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function NotificationsDropdown() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen]     = useState(false);
  const [notes, setNotes]   = useState([]);
  const [unread, setUnread] = useState(0);
  const dropRef             = useRef(null);

  const loadNotes = useCallback(async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);
    setNotes(data || []);
    setUnread((data || []).filter(n => !n.read_at).length);
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    loadNotes();

    const channel = supabase
      .channel(`notif-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        (payload) => {
          setNotes(prev => [payload.new, ...prev]);
          setUnread(prev => prev + 1);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id, loadNotes]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const markAllRead = async () => {
    await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .is('read_at', null);
    setNotes(prev => prev.map(n => ({ ...n, read_at: n.read_at || new Date().toISOString() })));
    setUnread(0);
  };

  const handleClick = async (note) => {
    if (!note.read_at) {
      await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', note.id);
      setNotes(prev => prev.map(n => n.id === note.id ? { ...n, read_at: new Date().toISOString() } : n));
      setUnread(prev => Math.max(0, prev - 1));
    }
    if (note.link) navigate(note.link);
    setOpen(false);
  };

  if (!user) return null;

  return (
    <div className="notif-wrap" ref={dropRef}>
      <button
        className="notif-bell"
        onClick={() => setOpen(v => !v)}
        aria-label={`Notifications${unread > 0 ? ` (${unread} unread)` : ''}`}
      >
        <Icon name="bell" size={18} />
        {unread > 0 && (
          <span className="notif-badge">{unread > 9 ? '9+' : unread}</span>
        )}
      </button>

      {open && (
        <div className="notif-dropdown">
          <div className="notif-header">
            <span>Notifications</span>
            {unread > 0 && (
              <button className="notif-mark-read" onClick={markAllRead}>
                Mark all read
              </button>
            )}
          </div>

          <div className="notif-list">
            {notes.length === 0 ? (
              <div className="notif-empty">
                <Icon name="bell" size={24} />
                <p>You're all caught up!</p>
              </div>
            ) : (
              notes.map(n => (
                <button
                  key={n.id}
                  className={`notif-item ${!n.read_at ? 'notif-unread' : ''}`}
                  onClick={() => handleClick(n)}
                >
                  <span className="notif-icon"><Icon name={TYPE_ICONS[n.type] || 'bell'} size={15} /></span>
                  <div className="notif-content">
                    <p className="notif-title">{n.title}</p>
                    {n.body && <p className="notif-body">{n.body}</p>}
                    <p className="notif-time">{timeAgo(n.created_at)}</p>
                  </div>
                  {!n.read_at && <span className="notif-dot" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
