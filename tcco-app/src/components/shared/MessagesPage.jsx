import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../auth/useAuth';
import AppLayout from '../Layout/AppLayout';
import './MessagesPage.css';

export default function MessagesPage({ role = 'seeker' }) {
  const { user } = useAuth();
  const [threads, setThreads]         = useState([]);
  const [activeThread, setActive]     = useState(null);
  const [messages, setMessages]       = useState([]);
  const [draft, setDraft]             = useState('');
  const [loading, setLoading]         = useState(true);
  const [sending, setSending]         = useState(false);
  const [myProfileId, setMyProfileId] = useState(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!user?.id) return;
    init();
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const init = async () => {
    setLoading(true);
    try {
      if (role === 'seeker') {
        const { data: p } = await supabase
          .from('seeker_profiles').select('id').eq('user_id', user.id).single();
        setMyProfileId(p?.id);
        if (!p?.id) { setLoading(false); return; }

        const { data: t } = await supabase
          .from('message_threads')
          .select('*, coach:coach_profiles(id, name, title, avatar_url)')
          .eq('seeker_id', p.id)
          .order('last_message_at', { ascending: false });
        setThreads(t || []);
      } else {
        const { data: c } = await supabase
          .from('coach_profiles').select('id').eq('user_id', user.id).single();
        setMyProfileId(c?.id);
        if (!c?.id) { setLoading(false); return; }

        const { data: t } = await supabase
          .from('message_threads')
          .select('*, seeker:seeker_profiles(id, name, avatar_url)')
          .eq('coach_id', c.id)
          .order('last_message_at', { ascending: false });
        setThreads(t || []);
      }
    } catch (err) {
      console.error('MessagesPage init error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load messages + subscribe to realtime when thread changes
  useEffect(() => {
    if (!activeThread) return;
    loadMessages(activeThread.id);

    const channel = supabase
      .channel(`thread-${activeThread.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `thread_id=eq.${activeThread.id}` },
        (payload) => {
          setMessages(prev => {
            // Avoid duplicate if we optimistically added it
            if (prev.find(m => m.id === payload.new.id)) return prev;
            return [...prev, payload.new];
          });
          setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [activeThread?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadMessages = async (threadId) => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true });
    setMessages(data || []);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);
  };

  const send = async () => {
    const msg = draft.trim();
    if (!msg || !activeThread || sending) return;
    setDraft('');
    setSending(true);
    try {
      await supabase.from('messages').insert({
        thread_id:      activeThread.id,
        sender_user_id: user.id,
        sender_role:    role,
        content:        msg,
      });
      await supabase.from('message_threads')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', activeThread.id);
    } catch (err) {
      console.error('send error:', err);
      setDraft(msg); // restore on error
    } finally {
      setSending(false);
    }
  };

  const otherParty = (thread) => role === 'seeker' ? thread.coach : thread.seeker;

  const formatTime = (ts) => {
    if (!ts) return '';
    return new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const formatThreadDate = (ts) => {
    if (!ts) return '';
    const d = new Date(ts);
    const today = new Date(); today.setHours(0,0,0,0);
    if (d >= today) return formatTime(ts);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <AppLayout role={role}>
      <div className="msg-layout">

        {/* ── Thread sidebar ── */}
        <div className="msg-sidebar">
          <div className="msg-sidebar-header">
            <h2 className="msg-title">Messages</h2>
            {threads.length > 0 && (
              <span className="badge badge-gray">{threads.length}</span>
            )}
          </div>

          {loading ? (
            <div style={{ padding: '40px', display: 'flex', justifyContent: 'center' }}>
              <div className="spinner" />
            </div>
          ) : threads.length === 0 ? (
            <div className="msg-empty" style={{ padding: '40px 20px' }}>
              <span style={{ fontSize: '36px' }}>💬</span>
              <p>No conversations yet.</p>
              {role === 'seeker' && (
                <p style={{ fontSize: '12px', color: 'var(--text-xsoft)', textAlign: 'center' }}>
                  Visit a coach's profile to start a conversation.
                </p>
              )}
            </div>
          ) : (
            threads.map(t => {
              const other = otherParty(t);
              const isActive = activeThread?.id === t.id;
              return (
                <button
                  key={t.id}
                  className={`msg-thread-row ${isActive ? 'msg-thread-active' : ''}`}
                  onClick={() => setActive(t)}
                >
                  <div className="avatar avatar-md" style={{ flexShrink: 0 }}>
                    {(other?.name || '?')[0].toUpperCase()}
                  </div>
                  <div style={{ flex: 1, overflow: 'hidden', textAlign: 'left' }}>
                    <p className="msg-thread-name">{other?.name || 'User'}</p>
                    {other?.title && <p className="msg-thread-sub">{other.title}</p>}
                  </div>
                  <span className="msg-thread-time">{formatThreadDate(t.last_message_at)}</span>
                </button>
              );
            })
          )}
        </div>

        {/* ── Message pane ── */}
        <div className="msg-pane">
          {!activeThread ? (
            <div className="msg-empty msg-pane-empty">
              <span style={{ fontSize: '56px' }}>💬</span>
              <p style={{ fontWeight: 600, color: 'var(--text-h)' }}>Your messages</p>
              <p style={{ fontSize: '14px' }}>Select a conversation to read and reply.</p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="msg-pane-header">
                <div className="avatar avatar-md" style={{ flexShrink: 0 }}>
                  {(otherParty(activeThread)?.name || '?')[0].toUpperCase()}
                </div>
                <div>
                  <p className="msg-thread-name">{otherParty(activeThread)?.name || 'User'}</p>
                  {otherParty(activeThread)?.title && (
                    <p className="msg-thread-sub">{otherParty(activeThread).title}</p>
                  )}
                </div>
              </div>

              {/* Messages */}
              <div className="msg-body">
                {messages.length === 0 && (
                  <div className="msg-empty" style={{ paddingTop: '40px' }}>
                    <p>No messages yet. Say hello!</p>
                  </div>
                )}
                {messages.map(m => {
                  const isMine = m.sender_user_id === user.id;
                  return (
                    <div key={m.id} className={`msg-bubble-row ${isMine ? 'msg-mine' : 'msg-theirs'}`}>
                      <div className={`msg-bubble ${isMine ? 'msg-bubble-mine' : 'msg-bubble-theirs'}`}>
                        {m.content}
                      </div>
                      <span className="msg-time">{formatTime(m.created_at)}</span>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>

              {/* Compose */}
              <div className="msg-compose">
                <textarea
                  className="msg-input"
                  placeholder="Type a message… (Enter to send, Shift+Enter for new line)"
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
                  }}
                  rows={2}
                />
                <button
                  className="btn btn-primary"
                  onClick={send}
                  disabled={!draft.trim() || sending}
                  style={{ flexShrink: 0 }}
                >
                  {sending ? '…' : 'Send'}
                </button>
              </div>
            </>
          )}
        </div>

      </div>
    </AppLayout>
  );
}
