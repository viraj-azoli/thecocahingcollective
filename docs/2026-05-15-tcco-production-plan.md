# TCCO Platform — Production-Ready Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the TCCO MVP (19-page React/Supabase app with dev-mode auth bypass) into a world-class, production-ready two-sided coaching marketplace.

**Architecture:** React 19 + Vite SPA on Hostinger CDN, Supabase (Postgres + Auth + Realtime + Storage) as backend, Stripe for payments, Daily.co for video, Resend for email, PostHog for analytics. All pages migrate from hardcoded DEV constants to real auth-aware data fetching. Each phase is independently shippable.

**Tech Stack:** React 19, React Router 7, Supabase JS v2, Stripe JS + React Stripe, Daily.co SDK, Resend, PostHog, Sentry, Vite 8, Vitest, date-fns

**Current State (what exists):**
- 19 pages: SeekerDashboard, CoachesPage, CoachProfilePage, SessionsPage, JournalPage, LibraryPage, ProgressPage, CommunityPage, SettingsPage, CoachDashboard, ClientsPage, CoachSessionsPage, ContentPage, AvailabilityPage, EarningsPage, AdminDashboard, AdminCoachesPage, AdminSeekersPage + Auth/Onboarding pages
- Shared AppLayout with role-aware sidebar, Toast singleton
- Dev bypass: `if (import.meta.env.DEV) return children` in ProtectedRoute; hardcoded `DEV_USER_ID` / `DEV_PROFILE_ID` / `DEV_COACH_ID` in every page
- Supabase: 12 tables, RLS policies applied, 3 coaches + 1 seeker seeded
- Payments: StripeCheckout.jsx exists but is a UI mock with no real Stripe calls

---

## Phase 1: Auth Hardening & Real Login

**Goal:** Remove all dev bypasses. Make auth work for real users. Add Google OAuth. Add password reset.

### Task 1: Real AuthContext (remove auto-login)

**Files:**
- Modify: `src/auth/AuthContext.jsx`
- Modify: `src/auth/ProtectedRoute.jsx`

- [ ] **Step 1: Update AuthContext — remove auto-login, add Google OAuth + password reset**

Replace entire `src/auth/AuthContext.jsx` with:

```jsx
import React, { createContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser]             = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        fetchUserProfile(session.user.id);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user);
        await fetchUserProfile(session.user.id);
      } else {
        setUser(null);
        setUserProfile(null);
      }
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (userId) => {
    const { data } = await supabase.from('users').select('*').eq('id', userId).single();
    setUserProfile(data || null);
    return data;
  };

  const signup = async (email, password, userType) => {
    setError(null);
    const { data: { user }, error } = await supabase.auth.signUp({ email, password });
    if (error) { setError(error.message); throw error; }
    await supabase.from('users').insert([{ id: user.id, user_type: userType }]);
    return user;
  };

  const login = async (email, password) => {
    setError(null);
    const { data: { user }, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setError(error.message); throw error; }
    await fetchUserProfile(user.id);
    return user;
  };

  const loginWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) { setError(error.message); throw error; }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setUserProfile(null);
  };

  const resetPassword = async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset`,
    });
    if (error) { setError(error.message); throw error; }
  };

  const updatePassword = async (newPassword) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) { setError(error.message); throw error; }
  };

  return (
    <AuthContext.Provider value={{ user, userProfile, loading, error, signup, login, loginWithGoogle, logout, resetPassword, updatePassword, fetchUserProfile }}>
      {children}
    </AuthContext.Provider>
  );
}
```

- [ ] **Step 2: Update ProtectedRoute — remove DEV bypass, add role redirect**

Replace `src/auth/ProtectedRoute.jsx`:

```jsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './useAuth';

export function ProtectedRoute({ children, requiredRole = null }) {
  const { user, userProfile, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#F4EFE6' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (requiredRole && userProfile?.user_type && userProfile.user_type !== requiredRole) {
    const redirectMap = { seeker: '/dashboard', coach: '/coach/dashboard', admin: '/admin/dashboard' };
    return <Navigate to={redirectMap[userProfile.user_type] || '/login'} replace />;
  }

  return children;
}
```

- [ ] **Step 3: Create Auth callback page for OAuth**

Create `src/components/Auth/AuthCallback.jsx`:

```jsx
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.user) { navigate('/login'); return; }
      const { data: profile } = await supabase
        .from('users').select('user_type').eq('id', session.user.id).single();
      if (!profile) {
        // New OAuth user — send to role selection
        navigate('/signup?oauth=true');
      } else {
        const map = { seeker: '/dashboard', coach: '/coach/dashboard', admin: '/admin/dashboard' };
        navigate(map[profile.user_type] || '/dashboard');
      }
    });
  }, [navigate]);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
      <p>Signing you in…</p>
    </div>
  );
}
```

- [ ] **Step 4: Create Password Reset page**

Create `src/components/Auth/ResetPassword.jsx`:

```jsx
import React, { useState } from 'react';
import { useAuth } from '../../auth/useAuth';
import { useNavigate } from 'react-router-dom';
import './Auth.css';

export default function ResetPassword() {
  const { resetPassword, updatePassword } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [sent, setSent] = useState(false);
  const [isReset, setIsReset] = useState(window.location.hash.includes('type=recovery'));
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  const handleRequest = async (e) => {
    e.preventDefault();
    setLoading(true);
    try { await resetPassword(email); setSent(true); }
    catch (err) { setMsg(err.message); }
    finally { setLoading(false); }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try { await updatePassword(password); navigate('/login'); }
    catch (err) { setMsg(err.message); }
    finally { setLoading(false); }
  };

  if (isReset) return (
    <div className="auth-wrap"><div className="auth-card">
      <h2>Set new password</h2>
      <form onSubmit={handleUpdate}>
        <input className="form-input" type="password" placeholder="New password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} />
        {msg && <p className="auth-error">{msg}</p>}
        <button className="btn btn-primary" style={{width:'100%'}} disabled={loading}>{loading ? 'Saving…' : 'Update password'}</button>
      </form>
    </div></div>
  );

  if (sent) return (
    <div className="auth-wrap"><div className="auth-card">
      <h2>Check your inbox</h2>
      <p>We sent a password reset link to <strong>{email}</strong>.</p>
    </div></div>
  );

  return (
    <div className="auth-wrap"><div className="auth-card">
      <h2>Reset password</h2>
      <form onSubmit={handleRequest}>
        <input className="form-input" type="email" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} required />
        {msg && <p className="auth-error">{msg}</p>}
        <button className="btn btn-primary" style={{width:'100%'}} disabled={loading}>{loading ? 'Sending…' : 'Send reset link'}</button>
      </form>
    </div></div>
  );
}
```

- [ ] **Step 5: Update Login.jsx to add Google button and forgot password link**

In `src/components/Auth/Login.jsx`, after the submit button add:

```jsx
<button type="button" className="btn btn-outline" style={{width:'100%',marginTop:'8px'}} onClick={loginWithGoogle}>
  <img src="/google.svg" alt="" style={{width:18,marginRight:8}} />
  Continue with Google
</button>
<p style={{textAlign:'center',marginTop:'12px',fontSize:'13px'}}>
  <a href="/reset-password" style={{color:'var(--accent)'}}>Forgot password?</a>
</p>
```

- [ ] **Step 6: Add auth routes to App.jsx**

In `src/App.jsx` add imports and routes:
```jsx
import AuthCallback from './components/Auth/AuthCallback';
import ResetPassword from './components/Auth/ResetPassword';
// Inside <Routes>:
<Route path="/auth/callback" element={<AuthCallback />} />
<Route path="/auth/reset" element={<ResetPassword />} />
<Route path="/reset-password" element={<ResetPassword />} />
```

- [ ] **Step 7: Commit**

```bash
git add src/auth/ src/components/Auth/ src/App.jsx
git commit -m "feat: real auth — remove dev bypass, add Google OAuth, password reset"
```

---

### Task 2: Migrate all pages from hardcoded DEV IDs to real auth

**Files:** Every page that has `const DEV_USER_ID`, `const DEV_PROFILE_ID`, or `const DEV_COACH_ID`

The pattern for every seeker page:
```jsx
// BEFORE (remove this):
const DEV_PROFILE_ID = 'dcca2081-ade6-4393-8850-8abd0f06df94';

// AFTER (add this at top of component):
const { user } = useAuth();

// In loadData():
const { data: profile } = await supabase
  .from('seeker_profiles').select('id').eq('user_id', user.id).single();
const profileId = profile?.id;
if (!profileId) { setLoading(false); return; }
```

The pattern for every coach page:
```jsx
const { user } = useAuth();

// In loadData():
const { data: coach } = await supabase
  .from('coach_profiles').select('*').eq('user_id', user.id).single();
```

- [ ] **Step 1: Migrate SeekerDashboard, SessionsPage, JournalPage** — replace DEV_PROFILE_ID with real `user.id` lookup from seeker_profiles
- [ ] **Step 2: Migrate LibraryPage, ProgressPage, SettingsPage, CommunityPage** — same pattern
- [ ] **Step 3: Migrate CoachDashboard, ClientsPage, CoachSessionsPage, ContentPage, AvailabilityPage, EarningsPage** — replace DEV_COACH_ID with `coach_profiles.user_id = user.id`
- [ ] **Step 4: Test each page loads with real session** — `npm run dev`, log in as seeker@test.com, verify dashboard loads data
- [ ] **Step 5: Commit**
```bash
git commit -m "feat: migrate all pages to real auth — remove all DEV_ constants"
```

---

## Phase 2: Real-time Messaging

**Goal:** Full in-app messaging between seekers and coaches (like BetterHelp's message center). Inspired by: BetterHelp, Coach.me

### Task 3: Messaging database schema

**Files:**
- Supabase migration (run via MCP or supabase CLI)

- [ ] **Step 1: Add message_threads table and update messages table**

Apply this SQL via Supabase MCP `apply_migration`:
```sql
CREATE TABLE IF NOT EXISTS public.message_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seeker_id uuid REFERENCES public.seeker_profiles(id) ON DELETE CASCADE,
  coach_id uuid REFERENCES public.coach_profiles(id) ON DELETE CASCADE,
  last_message_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(seeker_id, coach_id)
);

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS thread_id uuid REFERENCES public.message_threads(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS read_at timestamptz,
  ADD COLUMN IF NOT EXISTS attachment_url text;

-- Drop old FK if exists, re-add properly
ALTER TABLE public.messages
  DROP COLUMN IF EXISTS recipient_id,
  DROP COLUMN IF EXISTS sender_id;

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS sender_user_id uuid REFERENCES public.users(id),
  ADD COLUMN IF NOT EXISTS sender_role text CHECK (sender_role IN ('seeker','coach'));

-- RLS
ALTER TABLE public.message_threads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Thread participants can read" ON public.message_threads
  FOR SELECT TO authenticated USING (
    seeker_id IN (SELECT id FROM seeker_profiles WHERE user_id = auth.uid()) OR
    coach_id IN (SELECT id FROM coach_profiles WHERE user_id = auth.uid())
  );
CREATE POLICY "Seekers can create threads" ON public.message_threads
  FOR INSERT TO authenticated WITH CHECK (
    seeker_id IN (SELECT id FROM seeker_profiles WHERE user_id = auth.uid())
  );
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Thread participants can read messages" ON public.messages
  FOR SELECT TO authenticated USING (
    thread_id IN (
      SELECT id FROM message_threads WHERE
        seeker_id IN (SELECT id FROM seeker_profiles WHERE user_id = auth.uid()) OR
        coach_id IN (SELECT id FROM coach_profiles WHERE user_id = auth.uid())
    )
  );
CREATE POLICY "Authenticated can send messages" ON public.messages
  FOR INSERT TO authenticated WITH CHECK (sender_user_id = auth.uid());
```

- [ ] **Step 2: Commit migration**
```bash
git commit -m "feat(db): add message_threads schema with RLS"
```

### Task 4: MessagesPage component

**Files:**
- Create: `src/components/Shared/MessagesPage.jsx`
- Create: `src/components/Shared/MessagesPage.css`
- Modify: `src/App.jsx` (add `/messages` route for both roles)
- Modify: `src/components/Layout/AppLayout.jsx` (add Messages nav item)

- [ ] **Step 1: Create MessagesPage.jsx**

```jsx
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../auth/useAuth';
import AppLayout from '../Layout/AppLayout';
import './MessagesPage.css';

export default function MessagesPage({ role = 'seeker' }) {
  const { user } = useAuth();
  const [threads, setThreads]     = useState([]);
  const [activeThread, setActive] = useState(null);
  const [messages, setMessages]   = useState([]);
  const [draft, setDraft]         = useState('');
  const [loading, setLoading]     = useState(true);
  const [myProfileId, setMyProfileId] = useState(null);
  const bottomRef = useRef(null);

  useEffect(() => { init(); }, [user]);

  const init = async () => {
    if (!user) return;
    if (role === 'seeker') {
      const { data: p } = await supabase.from('seeker_profiles').select('id').eq('user_id', user.id).single();
      setMyProfileId(p?.id);
      const { data: t } = await supabase
        .from('message_threads')
        .select('*, coach:coach_profiles(id,name,title,avatar_url)')
        .eq('seeker_id', p?.id)
        .order('last_message_at', { ascending: false });
      setThreads(t || []);
    } else {
      const { data: c } = await supabase.from('coach_profiles').select('id').eq('user_id', user.id).single();
      setMyProfileId(c?.id);
      const { data: t } = await supabase
        .from('message_threads')
        .select('*, seeker:seeker_profiles(id,name,avatar_url)')
        .eq('coach_id', c?.id)
        .order('last_message_at', { ascending: false });
      setThreads(t || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!activeThread) return;
    loadMessages(activeThread.id);

    const channel = supabase
      .channel(`thread-${activeThread.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
        filter: `thread_id=eq.${activeThread.id}`,
      }, (payload) => {
        setMessages(prev => [...prev, payload.new]);
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [activeThread]);

  const loadMessages = async (threadId) => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true });
    setMessages(data || []);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  };

  const send = async () => {
    if (!draft.trim() || !activeThread) return;
    const msg = draft.trim();
    setDraft('');
    await supabase.from('messages').insert({
      thread_id: activeThread.id,
      sender_user_id: user.id,
      sender_role: role,
      content: msg,
    });
    await supabase.from('message_threads')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', activeThread.id);
  };

  const otherParty = (thread) => role === 'seeker' ? thread.coach : thread.seeker;

  return (
    <AppLayout role={role}>
      <div className="msg-layout">
        {/* Thread list */}
        <div className="msg-sidebar">
          <div className="msg-sidebar-header">
            <h2 className="msg-title">Messages</h2>
          </div>
          {loading ? <div className="spinner" style={{margin:'32px auto'}} /> : (
            threads.length === 0
              ? <div className="msg-empty"><span>💬</span><p>No conversations yet.</p></div>
              : threads.map(t => {
                  const other = otherParty(t);
                  return (
                    <div
                      key={t.id}
                      className={`msg-thread-row ${activeThread?.id === t.id ? 'msg-thread-active' : ''}`}
                      onClick={() => setActive(t)}
                    >
                      <div className="avatar avatar-md">{(other?.name || '?')[0]}</div>
                      <div>
                        <p className="msg-thread-name">{other?.name || 'User'}</p>
                        <p className="msg-thread-sub">{other?.title || ''}</p>
                      </div>
                    </div>
                  );
                })
          )}
        </div>

        {/* Message pane */}
        <div className="msg-pane">
          {!activeThread ? (
            <div className="msg-empty msg-pane-empty">
              <span style={{fontSize:48}}>💬</span>
              <p>Select a conversation to start messaging.</p>
            </div>
          ) : (
            <>
              <div className="msg-pane-header">
                <div className="avatar avatar-md">{(otherParty(activeThread)?.name || '?')[0]}</div>
                <div>
                  <p className="msg-thread-name">{otherParty(activeThread)?.name}</p>
                  <p className="msg-thread-sub">{otherParty(activeThread)?.title || ''}</p>
                </div>
              </div>
              <div className="msg-body">
                {messages.map(m => (
                  <div key={m.id} className={`msg-bubble-row ${m.sender_user_id === user.id ? 'msg-mine' : 'msg-theirs'}`}>
                    <div className={`msg-bubble ${m.sender_user_id === user.id ? 'msg-bubble-mine' : 'msg-bubble-theirs'}`}>
                      {m.content}
                    </div>
                    <span className="msg-time">{new Date(m.created_at).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'})}</span>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>
              <div className="msg-compose">
                <textarea
                  className="msg-input"
                  placeholder="Type a message…"
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                  rows={2}
                />
                <button className="btn btn-primary" onClick={send} disabled={!draft.trim()}>Send</button>
              </div>
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
```

- [ ] **Step 2: Create MessagesPage.css**

```css
.msg-layout { display:grid; grid-template-columns:320px 1fr; height:calc(100vh - 0px); overflow:hidden; }
.msg-sidebar { border-right:1px solid var(--border-card); display:flex; flex-direction:column; overflow-y:auto; }
.msg-sidebar-header { padding:20px 20px 12px; border-bottom:1px solid var(--border-card); }
.msg-title { font-size:18px; font-weight:700; color:var(--text-h); }
.msg-thread-row { display:flex; align-items:center; gap:12px; padding:14px 20px; cursor:pointer; transition:background .12s; }
.msg-thread-row:hover { background:var(--beige-dark,#ede8df); }
.msg-thread-active { background:var(--beige-dark,#ede8df); border-left:3px solid var(--accent); }
.msg-thread-name { font-size:14px; font-weight:600; color:var(--text-h); }
.msg-thread-sub { font-size:12px; color:var(--text-soft); }
.msg-pane { display:flex; flex-direction:column; overflow:hidden; }
.msg-pane-header { padding:16px 20px; border-bottom:1px solid var(--border-card); display:flex; align-items:center; gap:12px; background:var(--card-bg); }
.msg-body { flex:1; overflow-y:auto; padding:20px; display:flex; flex-direction:column; gap:8px; }
.msg-bubble-row { display:flex; flex-direction:column; }
.msg-mine { align-items:flex-end; }
.msg-theirs { align-items:flex-start; }
.msg-bubble { max-width:70%; padding:10px 14px; border-radius:16px; font-size:14px; line-height:1.5; }
.msg-bubble-mine { background:var(--accent); color:#fff; border-bottom-right-radius:4px; }
.msg-bubble-theirs { background:var(--card-bg); color:var(--text-h); border:1px solid var(--border-card); border-bottom-left-radius:4px; }
.msg-time { font-size:11px; color:var(--text-soft); margin-top:2px; }
.msg-compose { padding:16px 20px; border-top:1px solid var(--border-card); display:flex; gap:12px; align-items:flex-end; background:var(--card-bg); }
.msg-input { flex:1; border:1px solid var(--border-card); border-radius:var(--r-md); padding:10px 14px; font-size:14px; resize:none; font-family:inherit; }
.msg-empty { display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; gap:8px; color:var(--text-soft); font-size:14px; }
.msg-pane-empty { padding:40px; }
```

- [ ] **Step 3: Add `/messages` routes in App.jsx**
```jsx
import MessagesPage from './components/Shared/MessagesPage';
// In Routes:
<Route path="/messages" element={<ProtectedRoute requiredRole="seeker"><MessagesPage role="seeker" /></ProtectedRoute>} />
<Route path="/coach/messages" element={<ProtectedRoute requiredRole="coach"><MessagesPage role="coach" /></ProtectedRoute>} />
```

- [ ] **Step 4: Add Messages to nav in AppLayout.jsx**
```jsx
// In SEEKER_NAV PRACTICE section:
{ icon: '💬', label: 'Messages', to: '/messages' },
// In COACH_NAV COACHING section:
{ icon: '💬', label: 'Messages', to: '/coach/messages' },
```

- [ ] **Step 5: Add "Message" button on CoachProfilePage**
```jsx
// After the Book button:
<button className="btn btn-outline" onClick={async () => {
  // Create/find thread then navigate
  const { data: thread } = await supabase
    .from('message_threads')
    .upsert({ seeker_id: seekerProfileId, coach_id: coach.id }, { onConflict: 'seeker_id,coach_id' })
    .select().single();
  navigate('/messages');
}}>💬 Message</button>
```

- [ ] **Step 6: Commit**
```bash
git commit -m "feat: real-time messaging between seekers and coaches"
```

---

## Phase 3: Video Sessions (Daily.co)

**Goal:** Coaches and seekers can join video sessions directly in-app. Inspired by: BetterHelp, Headspace coaching, Zoom.

### Task 5: Daily.co integration

**Files:**
- Install: `@daily-co/daily-js`
- Create: `src/components/Shared/VideoRoom.jsx`
- Create: `src/components/Shared/VideoRoom.css`
- Create: `supabase/functions/create-daily-room/index.ts` (Edge Function)
- Modify: `src/components/Seeker/SessionsPage.jsx` (Join button)
- Modify: `src/components/Coach/CoachSessionsPage.jsx` (Join button)

- [ ] **Step 1: Install Daily.co SDK**
```bash
cd /Users/viraj/Desktop/public_html/tcco-app && npm install @daily-co/daily-js
```

- [ ] **Step 2: Create Supabase Edge Function for room creation**

Create `supabase/functions/create-daily-room/index.ts`:
```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

serve(async (req) => {
  const { sessionId } = await req.json();

  const res = await fetch('https://api.daily.co/v1/rooms', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${Deno.env.get('DAILY_API_KEY')}`,
    },
    body: JSON.stringify({
      name: `session-${sessionId}`,
      properties: {
        enable_screenshare: true,
        enable_chat: true,
        exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour
        max_participants: 2,
      },
    }),
  });

  const room = await res.json();
  return new Response(JSON.stringify({ url: room.url }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
```

- [ ] **Step 3: Create VideoRoom.jsx component**

```jsx
import React, { useEffect, useRef, useState } from 'react';
import DailyIframe from '@daily-co/daily-js';
import './VideoRoom.css';

export default function VideoRoom({ roomUrl, onLeave }) {
  const containerRef = useRef(null);
  const callRef      = useRef(null);
  const [status, setStatus] = useState('connecting');

  useEffect(() => {
    if (!roomUrl || !containerRef.current) return;

    const call = DailyIframe.createFrame(containerRef.current, {
      showLeaveButton: true,
      showFullscreenButton: true,
      iframeStyle: { width: '100%', height: '100%', border: 'none', borderRadius: '12px' },
    });
    callRef.current = call;

    call.on('joined-meeting', () => setStatus('connected'));
    call.on('left-meeting', () => { setStatus('left'); onLeave?.(); });
    call.on('error', () => setStatus('error'));

    call.join({ url: roomUrl });

    return () => { call.leave(); call.destroy(); };
  }, [roomUrl]);

  return (
    <div className="video-room">
      {status === 'connecting' && (
        <div className="video-connecting">
          <div className="spinner" />
          <p>Connecting to session…</p>
        </div>
      )}
      <div ref={containerRef} className="video-frame" style={{ opacity: status === 'connected' ? 1 : 0 }} />
      {status === 'error' && (
        <div className="video-connecting">
          <p>⚠️ Could not connect. Please check your camera and microphone permissions.</p>
          <button className="btn btn-outline" onClick={onLeave}>Leave</button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Create VideoRoom.css**
```css
.video-room { position:fixed; inset:0; z-index:1000; background:#0f0f0f; display:flex; flex-direction:column; }
.video-frame { flex:1; padding:12px; }
.video-connecting { display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; gap:16px; color:#fff; }
```

- [ ] **Step 5: Add "Join" flow to SessionsPage**

In `SessionsPage.jsx`, replace the static Join button with:
```jsx
const [roomUrl, setRoomUrl] = useState(null);

const joinSession = async (session) => {
  // Use existing zoom_link or create Daily room
  if (session.zoom_link) { setRoomUrl(session.zoom_link); return; }
  const { data } = await supabase.functions.invoke('create-daily-room', {
    body: { sessionId: session.id },
  });
  if (data?.url) {
    await supabase.from('sessions').update({ zoom_link: data.url }).eq('id', session.id);
    setRoomUrl(data.url);
  }
};

// In JSX: if roomUrl, render <VideoRoom roomUrl={roomUrl} onLeave={() => setRoomUrl(null)} />
```

- [ ] **Step 6: Commit**
```bash
git commit -m "feat: Daily.co video sessions — in-app video calls"
```

---

## Phase 4: Payments (Stripe)

**Goal:** Real Stripe Checkout for seeker subscriptions. Stripe Connect for coach payouts. Inspired by: Teachable, Calendly.

### Task 6: Stripe backend Edge Functions

**Files:**
- Create: `supabase/functions/create-checkout-session/index.ts`
- Create: `supabase/functions/stripe-webhook/index.ts`
- Create: `supabase/functions/create-connect-account/index.ts`
- Modify: `src/components/Seeker/SettingsPage.jsx`
- Modify: `src/components/Coach/EarningsPage.jsx`

- [ ] **Step 1: Create checkout session Edge Function**

`supabase/functions/create-checkout-session/index.ts`:
```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@14?target=deno';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2024-04-10' });

serve(async (req) => {
  const { tier, userId, email } = await req.json();

  const priceIds: Record<string, string> = {
    Discovery: Deno.env.get('STRIPE_DISCOVERY_PRICE_ID')!,
    Connection: Deno.env.get('STRIPE_CONNECTION_PRICE_ID')!,
  };

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    customer_email: email,
    line_items: [{ price: priceIds[tier], quantity: 1 }],
    success_url: `${Deno.env.get('APP_URL')}/settings?subscribed=true`,
    cancel_url: `${Deno.env.get('APP_URL')}/settings`,
    metadata: { userId, tier },
  });

  return new Response(JSON.stringify({ url: session.url }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
```

- [ ] **Step 2: Create Stripe webhook Edge Function**

`supabase/functions/stripe-webhook/index.ts`:
```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@14?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!);
const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

serve(async (req) => {
  const signature = req.headers.get('stripe-signature')!;
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, Deno.env.get('STRIPE_WEBHOOK_SECRET')!);
  } catch { return new Response('Bad signature', { status: 400 }); }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.CheckoutSession;
    const { userId, tier } = session.metadata!;

    const { data: profile } = await supabase
      .from('seeker_profiles').select('id').eq('user_id', userId).single();

    await supabase.from('subscriptions').upsert({
      seeker_id: profile!.id,
      tier,
      stripe_subscription_id: session.subscription as string,
      status: 'active',
    }, { onConflict: 'seeker_id' });

    await supabase.from('seeker_profiles')
      .update({ tier, stripe_subscription_id: session.subscription as string })
      .eq('user_id', userId);
  }

  if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object as Stripe.Subscription;
    await supabase.from('subscriptions')
      .update({ status: 'cancelled' })
      .eq('stripe_subscription_id', sub.id);
  }

  return new Response('ok');
});
```

- [ ] **Step 3: Create Stripe Connect Edge Function for coaches**

`supabase/functions/create-connect-account/index.ts`:
```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@14?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!);
const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

serve(async (req) => {
  const { coachUserId, email } = await req.json();

  const account = await stripe.accounts.create({
    type: 'express',
    email,
    capabilities: { transfers: { requested: true } },
  });

  await supabase.from('coach_profiles')
    .update({ stripe_account_id: account.id })
    .eq('user_id', coachUserId);

  const link = await stripe.accountLinks.create({
    account: account.id,
    refresh_url: `${Deno.env.get('APP_URL')}/coach/earnings`,
    return_url: `${Deno.env.get('APP_URL')}/coach/earnings?connected=true`,
    type: 'account_onboarding',
  });

  return new Response(JSON.stringify({ url: link.url }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
```

- [ ] **Step 4: Wire SettingsPage Membership tab to real Stripe**

In `src/components/Seeker/SettingsPage.jsx`, replace the static upgrade button:
```jsx
const handleUpgrade = async (tier) => {
  const { data } = await supabase.functions.invoke('create-checkout-session', {
    body: { tier, userId: user.id, email: user.email },
  });
  if (data?.url) window.location.href = data.url;
};
```

- [ ] **Step 5: Wire EarningsPage Connect button**

In `src/components/Coach/EarningsPage.jsx`, replace the static Connect button:
```jsx
const handleConnect = async () => {
  const { data } = await supabase.functions.invoke('create-connect-account', {
    body: { coachUserId: user.id, email: user.email },
  });
  if (data?.url) window.location.href = data.url;
};
```

- [ ] **Step 6: Add env vars to .env**
```
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

Add to Supabase Edge Function secrets:
```bash
supabase secrets set STRIPE_SECRET_KEY=sk_test_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
supabase secrets set STRIPE_DISCOVERY_PRICE_ID=price_...
supabase secrets set STRIPE_CONNECTION_PRICE_ID=price_...
supabase secrets set DAILY_API_KEY=...
supabase secrets set APP_URL=https://tcco.app
```

- [ ] **Step 7: Commit**
```bash
git commit -m "feat: real Stripe payments — subscriptions, webhooks, Connect payouts"
```

---

## Phase 5: Email Notifications (Resend)

**Goal:** Transactional emails for booking confirmations, reminders, password reset confirmations, welcome emails. Inspired by: Calendly (beautiful booking emails), BetterHelp.

### Task 7: Email Edge Functions

**Files:**
- Create: `supabase/functions/send-email/index.ts`
- Trigger emails from: session booking, coach verification, daily reminder cron

- [ ] **Step 1: Install Resend and create send-email Edge Function**

`supabase/functions/send-email/index.ts`:
```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const FROM = 'TCCO <hello@tcco.app>';

const templates: Record<string, (data: any) => { subject: string; html: string }> = {
  booking_confirmation: (d) => ({
    subject: `Your session with ${d.coachName} is confirmed`,
    html: `
      <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;padding:40px 20px;">
        <h1 style="color:#12372A;font-size:28px;">Session Confirmed ✓</h1>
        <p>Hi ${d.seekerName},</p>
        <p>Your coaching session with <strong>${d.coachName}</strong> is confirmed.</p>
        <div style="background:#F4EFE6;border-radius:12px;padding:20px;margin:20px 0;">
          <p><strong>📅 Date:</strong> ${d.date}</p>
          <p><strong>⏰ Time:</strong> ${d.time}</p>
          <p><strong>⏱ Duration:</strong> ${d.duration} minutes</p>
        </div>
        <a href="${d.sessionUrl}" style="display:inline-block;background:#2D9E6B;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;">View Session</a>
        <p style="color:#666;font-size:13px;margin-top:32px;">The Coaching Collective Online</p>
      </div>
    `,
  }),
  session_reminder: (d) => ({
    subject: `Reminder: Your session starts in 1 hour`,
    html: `
      <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;padding:40px 20px;">
        <h1 style="color:#12372A;">Your session starts soon ⏰</h1>
        <p>Hi ${d.name}, your session with ${d.otherParty} starts in 1 hour.</p>
        <a href="${d.joinUrl}" style="display:inline-block;background:#2D9E6B;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;">🔗 Join Session</a>
      </div>
    `,
  }),
  welcome_seeker: (d) => ({
    subject: `Welcome to TCCO, ${d.name} 🌿`,
    html: `
      <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;padding:40px 20px;">
        <h1 style="color:#12372A;">Welcome to The Coaching Collective Online</h1>
        <p>Hi ${d.name}, you're in. This is the beginning of something meaningful.</p>
        <p>Start by exploring our coaches and finding the right match for you.</p>
        <a href="${d.appUrl}/coaches" style="display:inline-block;background:#2D9E6B;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;">Find Your Coach →</a>
      </div>
    `,
  }),
  coach_verification_approved: (d) => ({
    subject: `You're now a verified TCCO coach 🎉`,
    html: `
      <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;padding:40px 20px;">
        <h1 style="color:#12372A;">Congratulations, ${d.name}!</h1>
        <p>Your coaching profile has been verified. You can now receive bookings from seekers.</p>
        <a href="${d.appUrl}/coach/dashboard" style="display:inline-block;background:#2D9E6B;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;">Go to Dashboard →</a>
      </div>
    `,
  }),
};

serve(async (req) => {
  const { to, template, data } = await req.json();
  const { subject, html } = templates[template](data);

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM, to, subject, html }),
  });

  const result = await res.json();
  return new Response(JSON.stringify(result), { headers: { 'Content-Type': 'application/json' } });
});
```

- [ ] **Step 2: Trigger welcome email on signup**

In `src/auth/AuthContext.jsx` signup function, after inserting user:
```jsx
await supabase.functions.invoke('send-email', {
  body: { to: email, template: 'welcome_seeker', data: { name: email.split('@')[0], appUrl: window.location.origin } }
});
```

- [ ] **Step 3: Trigger booking confirmation email**

In `src/components/Seeker/CoachProfilePage.jsx` after session INSERT:
```jsx
await supabase.functions.invoke('send-email', {
  body: {
    to: user.email,
    template: 'booking_confirmation',
    data: { seekerName: seekerProfile.name, coachName: coach.name, date: selectedDate, time: selectedTime, duration: 55, sessionUrl: `${window.location.origin}/sessions` }
  }
});
```

- [ ] **Step 4: Trigger coach verification email from AdminCoachesPage**

After `UPDATE coach_profiles SET verified = true`:
```jsx
await supabase.functions.invoke('send-email', {
  body: { to: coachEmail, template: 'coach_verification_approved', data: { name: coachName, appUrl: window.location.origin } }
});
```

- [ ] **Step 5: Set Resend secret**
```bash
supabase secrets set RESEND_API_KEY=re_...
```

- [ ] **Step 6: Commit**
```bash
git commit -m "feat: transactional emails via Resend — booking, welcome, verification"
```

---

## Phase 6: File Uploads (Supabase Storage)

**Goal:** Coaches can upload a profile photo and content files. Seekers can upload a profile photo.

### Task 8: Storage buckets + upload components

**Files:**
- Supabase: Create `avatars` and `content-files` buckets
- Create: `src/components/Shared/AvatarUpload.jsx`
- Modify: `src/components/Seeker/SettingsPage.jsx`
- Modify: `src/components/Coach/ContentPage.jsx`

- [ ] **Step 1: Create storage buckets via Supabase SQL**
```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true), ('content-files', 'content-files', true)
ON CONFLICT DO NOTHING;

CREATE POLICY "Anyone can read avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Authenticated can upload avatars" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avatars');
CREATE POLICY "Authenticated can upload content" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'content-files');
CREATE POLICY "Anyone can read content files" ON storage.objects FOR SELECT USING (bucket_id = 'content-files');
```

- [ ] **Step 2: Create AvatarUpload.jsx**

```jsx
import React, { useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { showToast } from './Toast';

export default function AvatarUpload({ currentUrl, userId, onUpload }) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef(null);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { showToast('Max file size is 5MB', 'error'); return; }

    setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `${userId}/avatar.${ext}`;

    const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
    if (error) { showToast('Upload failed', 'error'); setUploading(false); return; }

    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
    onUpload(publicUrl);
    showToast('Photo updated', 'success');
    setUploading(false);
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'12px' }}>
      <div
        className="avatar avatar-xl"
        style={{ backgroundImage: currentUrl ? `url(${currentUrl})` : undefined, backgroundSize:'cover', cursor:'pointer' }}
        onClick={() => inputRef.current?.click()}
      >
        {!currentUrl && '?'}
      </div>
      <button className="btn btn-outline btn-sm" onClick={() => inputRef.current?.click()} disabled={uploading}>
        {uploading ? 'Uploading…' : 'Change photo'}
      </button>
      <input ref={inputRef} type="file" accept="image/*" style={{display:'none'}} onChange={handleFile} />
    </div>
  );
}
```

- [ ] **Step 3: Wire AvatarUpload into SettingsPage Profile tab**
```jsx
import AvatarUpload from '../Shared/AvatarUpload';

// In profile tab JSX:
<AvatarUpload
  currentUrl={profile?.avatar_url}
  userId={user?.id}
  onUpload={(url) => {
    setProfile(prev => ({ ...prev, avatar_url: url }));
    supabase.from('seeker_profiles').update({ avatar_url: url }).eq('user_id', user.id);
  }}
/>
```

- [ ] **Step 4: Add file upload to ContentPage modal**

In `ContentPage.jsx` create modal, add:
```jsx
const [contentFile, setContentFile] = useState(null);

const uploadContentFile = async (file) => {
  const path = `${coachId}/${Date.now()}-${file.name}`;
  await supabase.storage.from('content-files').upload(path, file);
  const { data: { publicUrl } } = supabase.storage.from('content-files').getPublicUrl(path);
  return publicUrl;
};

// In the create/edit modal form:
<div className="form-group">
  <label>Content File (audio/PDF/video)</label>
  <input type="file" accept="audio/*,video/*,.pdf" onChange={e => setContentFile(e.target.files?.[0])} />
</div>
```

- [ ] **Step 5: Commit**
```bash
git commit -m "feat: file uploads — avatar photos and content files via Supabase Storage"
```

---

## Phase 7: Notifications Centre

**Goal:** In-app notification bell with unread count. Notifications for: new booking, session reminder, new message, coach verification. Inspired by: Headspace, Coach.me.

### Task 9: Notifications system

**Files:**
- Create: `src/components/Shared/NotificationsDropdown.jsx`
- Create: `src/components/Shared/NotificationsDropdown.css`
- Modify: `src/components/Layout/AppLayout.jsx` (add bell to header)
- Supabase: `notifications` table

- [ ] **Step 1: Create notifications table**
```sql
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('new_booking','session_reminder','new_message','verification_approved','new_review','system')),
  title text NOT NULL,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own notifications" ON public.notifications
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE INDEX notifications_user_id_created_at ON public.notifications(user_id, created_at DESC);
```

- [ ] **Step 2: Create NotificationsDropdown.jsx**

```jsx
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../auth/useAuth';
import { useNavigate } from 'react-router-dom';
import './NotificationsDropdown.css';

export default function NotificationsDropdown() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen]         = useState(false);
  const [notes, setNotes]       = useState([]);
  const [unread, setUnread]     = useState(0);
  const dropRef                 = useRef(null);

  useEffect(() => {
    if (!user) return;
    loadNotes();

    const channel = supabase.channel('notifications')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'notifications',
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        setNotes(prev => [payload.new, ...prev]);
        setUnread(prev => prev + 1);
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [user]);

  const loadNotes = async () => {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);
    setNotes(data || []);
    setUnread((data || []).filter(n => !n.read_at).length);
  };

  const markAllRead = async () => {
    await supabase.from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', user.id).is('read_at', null);
    setNotes(prev => prev.map(n => ({ ...n, read_at: n.read_at || new Date().toISOString() })));
    setUnread(0);
  };

  const handleClick = async (note) => {
    if (!note.read_at) {
      await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', note.id);
      setUnread(prev => Math.max(0, prev - 1));
    }
    if (note.link) navigate(note.link);
    setOpen(false);
  };

  return (
    <div className="notif-wrap" ref={dropRef}>
      <button className="notif-bell" onClick={() => setOpen(v => !v)}>
        🔔
        {unread > 0 && <span className="notif-badge">{unread > 9 ? '9+' : unread}</span>}
      </button>
      {open && (
        <div className="notif-dropdown">
          <div className="notif-header">
            <span>Notifications</span>
            {unread > 0 && <button className="notif-mark-read" onClick={markAllRead}>Mark all read</button>}
          </div>
          <div className="notif-list">
            {notes.length === 0 && <div className="notif-empty">No notifications yet.</div>}
            {notes.map(n => (
              <div key={n.id} className={`notif-item ${!n.read_at ? 'notif-unread' : ''}`} onClick={() => handleClick(n)}>
                <div className="notif-dot" style={{ opacity: n.read_at ? 0 : 1 }} />
                <div>
                  <p className="notif-title">{n.title}</p>
                  {n.body && <p className="notif-body">{n.body}</p>}
                  <p className="notif-time">{new Date(n.created_at).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create NotificationsDropdown.css**
```css
.notif-wrap { position:relative; }
.notif-bell { background:none; border:none; font-size:20px; cursor:pointer; position:relative; padding:4px 8px; }
.notif-badge { position:absolute; top:-2px; right:-2px; background:#ef4444; color:#fff; font-size:10px; font-weight:700; border-radius:99px; min-width:16px; height:16px; display:flex; align-items:center; justify-content:center; padding:0 4px; }
.notif-dropdown { position:absolute; right:0; top:calc(100% + 8px); width:340px; background:#fff; border:1px solid var(--border-card); border-radius:var(--r-lg); box-shadow:var(--shadow-lg,0 8px 32px rgba(0,0,0,.12)); z-index:200; overflow:hidden; }
.notif-header { display:flex; justify-content:space-between; align-items:center; padding:14px 16px; border-bottom:1px solid var(--border-card); font-size:14px; font-weight:600; }
.notif-mark-read { background:none; border:none; color:var(--accent); font-size:12px; cursor:pointer; }
.notif-list { max-height:400px; overflow-y:auto; }
.notif-item { display:flex; gap:10px; padding:12px 16px; cursor:pointer; transition:background .12s; }
.notif-item:hover { background:var(--beige,#F4EFE6); }
.notif-unread { background:#f0faf5; }
.notif-dot { width:8px; height:8px; border-radius:50%; background:var(--accent); margin-top:6px; flex-shrink:0; }
.notif-title { font-size:13px; font-weight:600; color:var(--text-h); }
.notif-body { font-size:12px; color:var(--text-soft); margin-top:2px; }
.notif-time { font-size:11px; color:var(--text-soft); margin-top:4px; }
.notif-empty { padding:24px; text-align:center; color:var(--text-soft); font-size:13px; }
```

- [ ] **Step 4: Add NotificationsDropdown to AppLayout header**

In `AppLayout.jsx`, add to the top of `<main>`:
```jsx
import NotificationsDropdown from '../Shared/NotificationsDropdown';

// In <main className="al-main">:
<div className="al-topbar">
  <NotificationsDropdown />
</div>
```

Add to `AppLayout.css`:
```css
.al-topbar { display:flex; justify-content:flex-end; padding:12px 24px; border-bottom:1px solid var(--border-card); background:var(--card-bg); }
```

- [ ] **Step 5: Commit**
```bash
git commit -m "feat: real-time notifications centre with unread badge"
```

---

## Phase 8: Mobile Responsive Design

**Goal:** Full mobile experience. Sidebar collapses to bottom nav on mobile. All grids stack. Touch-friendly tap targets. Inspired by: Headspace app, BetterHelp mobile.

### Task 10: Mobile layout & bottom navigation

**Files:**
- Modify: `src/components/Layout/AppLayout.jsx`
- Modify: `src/components/Layout/AppLayout.css`
- Modify: `src/components/Seeker/Dashboard.css`

- [ ] **Step 1: Add bottom navigation bar in AppLayout**

In `AppLayout.jsx` after `</aside>`, add:
```jsx
{/* Mobile bottom nav */}
<nav className="al-bottom-nav">
  {navGroups[0].items.slice(0, 5).map(item => (
    <NavLink key={item.to} to={item.to} end={item.to.endsWith('/dashboard')}
      className={({ isActive }) => `al-bottom-item${isActive ? ' al-bottom-active' : ''}`}
      onClick={() => setMobileOpen(false)}
    >
      <span className="al-bottom-icon">{item.icon}</span>
      <span className="al-bottom-label">{item.label}</span>
    </NavLink>
  ))}
</nav>
```

- [ ] **Step 2: Add mobile CSS to AppLayout.css**

```css
.al-bottom-nav {
  display: none;
  position: fixed;
  bottom: 0; left: 0; right: 0;
  background: var(--sidebar-bg);
  z-index: 100;
  padding: 8px 0 env(safe-area-inset-bottom);
  border-top: 1px solid rgba(255,255,255,.1);
}
.al-bottom-item {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  flex: 1; gap: 2px; padding: 4px 0;
  color: rgba(255,255,255,.5); text-decoration: none; font-size: 10px;
  transition: color .15s;
}
.al-bottom-item.al-bottom-active { color: #fff; }
.al-bottom-icon { font-size: 20px; }
.al-bottom-label { font-size: 10px; font-weight: 500; }

@media (max-width: 768px) {
  .al-sidebar { display: none; }
  .al-hamburger { display: none; }
  .al-bottom-nav { display: flex; }
  .al-main { padding-bottom: 70px; }
  .al-wrapper { grid-template-columns: 1fr; }

  .stats-grid-4 { grid-template-columns: repeat(2, 1fr); }
  .stats-grid-3 { grid-template-columns: repeat(2, 1fr); }
  .db-stats-grid { grid-template-columns: repeat(2, 1fr); }
  .db-quick-grid { grid-template-columns: repeat(2, 1fr); }
  .db-library-grid { grid-template-columns: 1fr; }
  .db-session-card { flex-direction: column; gap: 12px; }

  .page-header { flex-direction: column; align-items: flex-start; gap: 12px; }
  .page-header > div:last-child { width: 100%; }
  .page-header .btn { width: 100%; }

  .msg-layout { grid-template-columns: 1fr; }
  .msg-sidebar { display: none; }
}
```

- [ ] **Step 3: Fix touch tap targets — minimum 44px height on all interactive elements**

Add to `AppLayout.css`:
```css
@media (max-width: 768px) {
  .btn { min-height: 44px; }
  .db-quick-card { min-height: 80px; }
  .al-nav-link { min-height: 44px; }
  .form-input, .form-select, .form-textarea { font-size: 16px; } /* prevent iOS zoom */
}
```

- [ ] **Step 4: Add viewport meta to index.html**

In `index.html`:
```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<meta name="theme-color" content="#12372A" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
```

- [ ] **Step 5: Commit**
```bash
git commit -m "feat: full mobile responsive design with bottom navigation"
```

---

## Phase 9: SEO & Performance

**Goal:** Search engines can index coach profiles. React Helmet for meta tags. Lazy loading. Code splitting. Core Web Vitals green.

### Task 11: SEO meta tags + code splitting

**Files:**
- Install: `react-helmet-async`
- Create: `src/components/Shared/SEO.jsx`
- Modify: `src/main.jsx`
- Modify: `src/App.jsx` (lazy imports)
- Modify: `vite.config.js`

- [ ] **Step 1: Install react-helmet-async**
```bash
npm install react-helmet-async
```

- [ ] **Step 2: Wrap app with HelmetProvider in main.jsx**
```jsx
import { HelmetProvider } from 'react-helmet-async';
// Wrap <App /> with <HelmetProvider><App /></HelmetProvider>
```

- [ ] **Step 3: Create SEO.jsx component**
```jsx
import { Helmet } from 'react-helmet-async';

export default function SEO({ title, description, image, url }) {
  const siteName = 'The Coaching Collective Online';
  const fullTitle = title ? `${title} | ${siteName}` : siteName;
  const desc = description || 'Find your perfect coach. Grow through mindful, professional coaching on TCCO.';

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={desc} />
      <meta property="og:type" content="website" />
      {url && <meta property="og:url" content={url} />}
      {image && <meta property="og:image" content={image} />}
      <meta name="twitter:card" content="summary_large_image" />
    </Helmet>
  );
}
```

- [ ] **Step 4: Add SEO to key pages**
```jsx
// CoachProfilePage.jsx — after loading coach data:
<SEO title={`${coach.name} — ${coach.title}`} description={coach.bio} />

// CoachesPage.jsx:
<SEO title="Find a Coach" description="Browse verified coaches on TCCO." />

// SeekerDashboard.jsx:
<SEO title="Dashboard" />
```

- [ ] **Step 5: Lazy-load all routes in App.jsx**
```jsx
const SeekerDashboard    = React.lazy(() => import('./components/Seeker/SeekerDashboard'));
const CoachesPage        = React.lazy(() => import('./components/Seeker/CoachesPage'));
const CoachProfilePage   = React.lazy(() => import('./components/Seeker/CoachProfilePage'));
const SessionsPage       = React.lazy(() => import('./components/Seeker/SessionsPage'));
const JournalPage        = React.lazy(() => import('./components/Seeker/JournalPage'));
const LibraryPage        = React.lazy(() => import('./components/Seeker/LibraryPage'));
const ProgressPage       = React.lazy(() => import('./components/Seeker/ProgressPage'));
const CoachDashboard     = React.lazy(() => import('./components/Coach/CoachDashboard'));
// ... all other pages

// Wrap routes with Suspense:
<Suspense fallback={<div style={{display:'flex',justifyContent:'center',alignItems:'center',minHeight:'100vh'}}><div className="spinner" /></div>}>
  <Routes>...</Routes>
</Suspense>
```

- [ ] **Step 6: Update vite.config.js for chunk splitting**
```js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          supabase: ['@supabase/supabase-js'],
          stripe: ['@stripe/react-stripe-js'],
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
});
```

- [ ] **Step 7: Commit**
```bash
git commit -m "feat: SEO meta tags, lazy loading, code splitting"
```

---

## Phase 10: Error Handling & Monitoring (Sentry)

**Goal:** Error boundaries on every page. Loading skeletons instead of spinners. Sentry for production error tracking.

### Task 12: Error boundaries + loading skeletons

**Files:**
- Create: `src/components/Shared/ErrorBoundary.jsx`
- Create: `src/components/Shared/Skeleton.jsx`
- Modify: `src/main.jsx` (Sentry init)
- Modify: all page components (wrap with ErrorBoundary, replace spinners with skeletons)

- [ ] **Step 1: Install Sentry**
```bash
npm install @sentry/react
```

- [ ] **Step 2: Init Sentry in main.jsx**
```jsx
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  tracesSampleRate: 0.2,
  enabled: import.meta.env.PROD,
});
```

- [ ] **Step 3: Create ErrorBoundary.jsx**
```jsx
import React from 'react';
import * as Sentry from '@sentry/react';

export default function ErrorBoundary({ children, fallback }) {
  return (
    <Sentry.ErrorBoundary
      fallback={fallback || (
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:'400px', gap:'16px' }}>
          <span style={{ fontSize:'48px' }}>⚠️</span>
          <p style={{ fontWeight:600, color:'#333' }}>Something went wrong</p>
          <button className="btn btn-outline" onClick={() => window.location.reload()}>Reload page</button>
        </div>
      )}
    >
      {children}
    </Sentry.ErrorBoundary>
  );
}
```

- [ ] **Step 4: Create Skeleton.jsx**
```jsx
import React from 'react';

function Bone({ width = '100%', height = '16px', radius = '6px', style = {} }) {
  return (
    <div style={{
      width, height, borderRadius: radius,
      background: 'linear-gradient(90deg, #e8e3db 25%, #f0ebe3 50%, #e8e3db 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.4s infinite',
      ...style,
    }} />
  );
}

export function SkeletonCard() {
  return (
    <div className="card" style={{ display:'flex', flexDirection:'column', gap:'12px', padding:'20px' }}>
      <Bone height="20px" width="60%" />
      <Bone height="14px" />
      <Bone height="14px" width="80%" />
    </div>
  );
}

export function SkeletonDashboard() {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'20px', padding:'24px' }}>
      <Bone height="200px" radius="16px" />
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'14px' }}>
        {[1,2,3,4].map(i => <Bone key={i} height="100px" radius="12px" />)}
      </div>
      <Bone height="120px" radius="12px" />
    </div>
  );
}

// Add to index.css:
// @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
```

- [ ] **Step 5: Replace page spinners with SkeletonDashboard**

In `SeekerDashboard.jsx` replace the loading return with:
```jsx
import { SkeletonDashboard } from '../Shared/Skeleton';
// if (loading) return <AppLayout role="seeker"><SkeletonDashboard /></AppLayout>;
```

- [ ] **Step 6: Add shimmer animation to index.css**
```css
@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

- [ ] **Step 7: Commit**
```bash
git commit -m "feat: error boundaries, loading skeletons, Sentry monitoring"
```

---

## Phase 11: Analytics (PostHog)

**Goal:** Track user behaviour, feature usage, conversion funnels. Inspired by: every SaaS product.

### Task 13: PostHog integration

**Files:**
- Install: `posthog-js`
- Create: `src/lib/analytics.js`
- Modify: `src/main.jsx`
- Add tracking calls to key user actions

- [ ] **Step 1: Install PostHog**
```bash
npm install posthog-js
```

- [ ] **Step 2: Create analytics.js**
```js
import posthog from 'posthog-js';

export function initAnalytics() {
  if (import.meta.env.PROD) {
    posthog.init(import.meta.env.VITE_POSTHOG_KEY, {
      api_host: 'https://app.posthog.com',
      capture_pageview: true,
      persistence: 'localStorage',
    });
  }
}

export function identify(userId, traits = {}) {
  if (import.meta.env.PROD) posthog.identify(userId, traits);
}

export function track(event, props = {}) {
  if (import.meta.env.PROD) posthog.capture(event, props);
  else console.log('[analytics]', event, props);
}

export function reset() {
  if (import.meta.env.PROD) posthog.reset();
}
```

- [ ] **Step 3: Init in main.jsx**
```jsx
import { initAnalytics } from './lib/analytics';
initAnalytics();
```

- [ ] **Step 4: Add tracking to key events**

```js
// CoachProfilePage.jsx — booking confirmed:
track('booking_confirmed', { coachId: coach.id, coachName: coach.name, date: selectedDate });

// AuthContext.jsx — after successful signup:
track('user_signed_up', { role: userType });

// JournalPage.jsx — after save:
track('journal_entry_saved', { mood: moodRating, hasNote: !!note });

// LibraryPage.jsx — after start:
track('content_started', { contentId: item.id, type: item.type });

// SettingsPage.jsx — upgrade clicked:
track('upgrade_clicked', { tier });
```

- [ ] **Step 5: Commit**
```bash
git commit -m "feat: PostHog analytics — user tracking, funnels, feature usage"
```

---

## Phase 12: Coach Intake Forms & Session Packages

**Goal:** Coaches can create intake forms for seekers. Coaches can sell multi-session packages. Inspired by: Practice.do, CoachAccountable.

### Task 14: Intake forms system

**Files:**
- Supabase: `intake_forms` and `intake_responses` tables
- Create: `src/components/Coach/IntakeFormsPage.jsx`
- Modify: `src/components/Seeker/CoachProfilePage.jsx` (show intake form before booking)
- Modify: `src/App.jsx`

- [ ] **Step 1: Add intake_forms tables**
```sql
CREATE TABLE public.intake_forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid REFERENCES public.coach_profiles(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'New Client Intake',
  questions jsonb NOT NULL DEFAULT '[]',
  is_required boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.intake_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id uuid REFERENCES public.intake_forms(id) ON DELETE CASCADE,
  seeker_id uuid REFERENCES public.seeker_profiles(id) ON DELETE CASCADE,
  session_id uuid REFERENCES public.sessions(id) ON DELETE SET NULL,
  answers jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.intake_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intake_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Coach can manage own forms" ON public.intake_forms
  FOR ALL TO authenticated USING (coach_id IN (SELECT id FROM coach_profiles WHERE user_id = auth.uid()));
CREATE POLICY "Authenticated can read coach forms" ON public.intake_forms
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Seekers can submit responses" ON public.intake_responses
  FOR INSERT TO authenticated WITH CHECK (seeker_id IN (SELECT id FROM seeker_profiles WHERE user_id = auth.uid()));
CREATE POLICY "Coaches can read responses to their forms" ON public.intake_responses
  FOR SELECT TO authenticated USING (form_id IN (SELECT id FROM intake_forms WHERE coach_id IN (SELECT id FROM coach_profiles WHERE user_id = auth.uid())));
```

- [ ] **Step 2: Create IntakeFormsPage.jsx for coaches**

A form builder where coaches can add questions (text, multiple choice, rating scale). Each question has: `{ id, type: 'text'|'choice'|'scale', question, options?, required }`. Save/update via Supabase. Full CRUD UI with drag-sort (use simple up/down buttons).

- [ ] **Step 3: Add intake form step to CoachProfilePage booking modal**

Before the booking confirm step (step 3), check if coach has a required intake form. If yes, insert step 2.5 showing the intake form. On confirm, submit the responses alongside the session insert.

- [ ] **Step 4: Show intake responses in ClientsPage slide panel for coaches**

- [ ] **Step 5: Commit**
```bash
git commit -m "feat: coach intake forms — custom client questionnaires before sessions"
```

### Task 15: Session packages

**Files:**
- Supabase: `session_packages` table
- Modify: `src/components/Coach/ContentPage.jsx` (or separate PackagesPage)
- Modify: `src/components/Seeker/CoachProfilePage.jsx` (show packages)

- [ ] **Step 1: Create session_packages table**
```sql
CREATE TABLE public.session_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid REFERENCES public.coach_profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  session_count integer NOT NULL,
  price numeric NOT NULL,
  validity_days integer DEFAULT 90,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.session_packages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active packages" ON public.session_packages FOR SELECT TO authenticated USING (is_active = true);
CREATE POLICY "Coaches manage own packages" ON public.session_packages FOR ALL TO authenticated USING (coach_id IN (SELECT id FROM coach_profiles WHERE user_id = auth.uid()));
```

- [ ] **Step 2: Add packages section to CoachProfilePage**

Below the coach bio, show "Packages" cards if any exist. Each has: name, session count, price, Buy button (triggers Stripe checkout with `mode: 'payment'` and metadata).

- [ ] **Step 3: Commit**
```bash
git commit -m "feat: coach session packages — multi-session bundles with Stripe checkout"
```

---

## Phase 13: Reviews & Ratings System

**Goal:** After a completed session, seekers can leave a public review on the coach's profile. Reviews show on CoachProfilePage. Inspired by: Airbnb, Calendly.

### Task 16: Public reviews

**Files:**
- Supabase: `reviews` table
- Modify: `src/components/Seeker/SessionsPage.jsx` (submit review)
- Modify: `src/components/Seeker/CoachProfilePage.jsx` (show reviews)
- Supabase: trigger to update `coach_profiles.rating` + `review_count`

- [ ] **Step 1: Create reviews table + rating trigger**
```sql
CREATE TABLE public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES public.sessions(id) ON DELETE CASCADE UNIQUE,
  coach_id uuid REFERENCES public.coach_profiles(id) ON DELETE CASCADE,
  seeker_id uuid REFERENCES public.seeker_profiles(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body text,
  is_public boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read public reviews" ON public.reviews FOR SELECT USING (is_public = true);
CREATE POLICY "Seekers can insert own reviews" ON public.reviews FOR INSERT TO authenticated WITH CHECK (seeker_id IN (SELECT id FROM seeker_profiles WHERE user_id = auth.uid()));

-- Auto-update coach rating on review insert/update
CREATE OR REPLACE FUNCTION update_coach_rating()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE coach_profiles SET
    rating = (SELECT AVG(rating) FROM reviews WHERE coach_id = NEW.coach_id AND is_public = true),
    review_count = (SELECT COUNT(*) FROM reviews WHERE coach_id = NEW.coach_id AND is_public = true)
  WHERE id = NEW.coach_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_update_coach_rating
AFTER INSERT OR UPDATE ON public.reviews
FOR EACH ROW EXECUTE FUNCTION update_coach_rating();
```

- [ ] **Step 2: Move star rating + feedback from sessions table to reviews table**

In `SessionsPage.jsx`, change the past session "Leave a review" action to INSERT into `reviews` instead of UPDATE `sessions`. Keep `rating_by_seeker` on sessions for internal use.

- [ ] **Step 3: Show reviews on CoachProfilePage**

After the coach bio section, add a "Reviews" section:
```jsx
const [reviews, setReviews] = useState([]);
// In loadCoach():
const { data: rev } = await supabase
  .from('reviews')
  .select('*, seeker:seeker_profiles(name, avatar_url)')
  .eq('coach_id', coachId)
  .eq('is_public', true)
  .order('created_at', { ascending: false })
  .limit(10);
setReviews(rev || []);

// In JSX:
{reviews.map(r => (
  <div key={r.id} className="card" style={{marginBottom:'12px'}}>
    <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'8px'}}>
      <div className="avatar avatar-sm">{r.seeker?.name?.[0] || '?'}</div>
      <div>
        <p style={{fontWeight:600,fontSize:'14px'}}>{r.seeker?.name || 'Anonymous'}</p>
        <StaticStars value={r.rating} />
      </div>
    </div>
    {r.body && <p style={{fontSize:'14px',color:'var(--text-soft)'}}>{r.body}</p>}
  </div>
))}
```

- [ ] **Step 4: Commit**
```bash
git commit -m "feat: public coach reviews with auto-rating calculation trigger"
```

---

## Phase 14: Advanced Search & Discovery

**Goal:** Full-text search on coaches and content. Filter by availability, language, price. Coach matching quiz. Inspired by: BetterHelp matching, Headspace content discovery.

### Task 17: Advanced coach search

**Files:**
- Supabase: full-text search index
- Modify: `src/components/Seeker/CoachesPage.jsx`

- [ ] **Step 1: Add full-text search to coach_profiles**
```sql
ALTER TABLE public.coach_profiles ADD COLUMN IF NOT EXISTS search_vector tsvector;
UPDATE public.coach_profiles SET search_vector = to_tsvector('english', coalesce(name,'') || ' ' || coalesce(title,'') || ' ' || coalesce(bio,'') || ' ' || coalesce(array_to_string(specialties,' '),''));
CREATE INDEX coach_profiles_search_idx ON public.coach_profiles USING GIN(search_vector);

CREATE OR REPLACE FUNCTION update_coach_search_vector()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.search_vector := to_tsvector('english', coalesce(NEW.name,'') || ' ' || coalesce(NEW.title,'') || ' ' || coalesce(NEW.bio,'') || ' ' || coalesce(array_to_string(NEW.specialties,' '),''));
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_coach_search_vector BEFORE INSERT OR UPDATE ON public.coach_profiles FOR EACH ROW EXECUTE FUNCTION update_coach_search_vector();
```

- [ ] **Step 2: Add advanced filters to CoachesPage**

Add to the filter bar:
- Language filter (dropdown from `coach_profiles.languages`)
- Max price slider (0–500)
- Rating minimum (3+, 4+, 4.5+)
- Verified only toggle
- Availability day filter

Update the Supabase query:
```jsx
let q = supabase.from('coach_profiles').select('*').eq('verified', true);
if (search) q = q.textSearch('search_vector', search);
if (maxPrice < 500) q = q.lte('price_per_session', maxPrice);
if (minRating > 0) q = q.gte('rating', minRating);
if (language !== 'All') q = q.contains('languages', [language]);
```

- [ ] **Step 3: Commit**
```bash
git commit -m "feat: full-text coach search with advanced filters"
```

---

## Phase 15: Progressive Web App (PWA)

**Goal:** Installable on mobile. Offline fallback. Push notifications capability. Inspired by: Headspace, every modern mobile-first app.

### Task 18: PWA setup

**Files:**
- Install: `vite-plugin-pwa`
- Create: `public/manifest.json`
- Create: `public/sw.js` (via Workbox)
- Modify: `vite.config.js`
- Create: icons (192x192 and 512x512 PNGs)

- [ ] **Step 1: Install vite-plugin-pwa**
```bash
npm install -D vite-plugin-pwa
```

- [ ] **Step 2: Update vite.config.js with PWA plugin**
```js
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'The Coaching Collective Online',
        short_name: 'TCCO',
        description: 'Find your coach. Grow every day.',
        theme_color: '#12372A',
        background_color: '#F4EFE6',
        display: 'standalone',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
        start_url: '/dashboard',
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png}'],
        runtimeCaching: [{
          urlPattern: /^https:\/\/.*\.supabase\.co\//,
          handler: 'NetworkFirst',
          options: { cacheName: 'supabase-api', networkTimeoutSeconds: 10 },
        }],
      },
    }),
  ],
});
```

- [ ] **Step 3: Commit**
```bash
git commit -m "feat: PWA — installable app with offline fallback"
```

---

## Phase 16: Production Infrastructure

**Goal:** CI/CD pipeline, staging environment, environment-based config, HTTPS, custom domain.

### Task 19: CI/CD with GitHub Actions

**Files:**
- Create: `.github/workflows/deploy.yml`
- Create: `.env.production` (template)
- Modify: `vite.config.js`

- [ ] **Step 1: Create GitHub Actions deploy workflow**

`.github/workflows/deploy.yml`:
```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci
        working-directory: tcco-app

      - name: Build
        run: npm run build
        working-directory: tcco-app
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
          VITE_STRIPE_PUBLISHABLE_KEY: ${{ secrets.VITE_STRIPE_PUBLISHABLE_KEY }}
          VITE_POSTHOG_KEY: ${{ secrets.VITE_POSTHOG_KEY }}
          VITE_SENTRY_DSN: ${{ secrets.VITE_SENTRY_DSN }}

      - name: Deploy to Hostinger via FTP
        uses: SamKirkland/FTP-Deploy-Action@v4.3.4
        with:
          server: ${{ secrets.FTP_SERVER }}
          username: ${{ secrets.FTP_USERNAME }}
          password: ${{ secrets.FTP_PASSWORD }}
          local-dir: tcco-app/dist/
          server-dir: public_html/app/
```

- [ ] **Step 2: Add .htaccess for SPA routing on Hostinger**

Create `public/.htaccess`:
```apache
Options -MultiViews
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteRule ^ index.html [QL]

# Security headers
Header always set X-Frame-Options "SAMEORIGIN"
Header always set X-Content-Type-Options "nosniff"
Header always set Referrer-Policy "strict-origin-when-cross-origin"
Header always set Permissions-Policy "camera=(), microphone=(self), geolocation=()"

# Cache static assets
<FilesMatch "\.(js|css|png|jpg|svg|woff2)$">
  Header set Cache-Control "max-age=31536000, immutable"
</FilesMatch>
```

- [ ] **Step 3: Create staging environment**

Create `src/lib/supabase.staging.js` with staging project URL. Add `npm run build:staging` script:
```json
"build:staging": "VITE_ENV=staging vite build --outDir dist-staging"
```

- [ ] **Step 4: Commit**
```bash
git commit -m "feat: CI/CD pipeline with GitHub Actions + Hostinger deploy"
```

---

## Phase 17: Admin Analytics Dashboard

**Goal:** Revenue charts, user growth, session completion rates, coach performance. Inspired by: Stripe Dashboard, Mixpanel.

### Task 20: Admin analytics page

**Files:**
- Create: `src/components/Admin/AdminAnalyticsPage.jsx`
- Create: `src/components/Admin/AdminContentPage.jsx`
- Create: `src/components/Admin/AdminSessionsPage.jsx`
- Modify: `src/App.jsx` (add routes)
- Modify: `src/components/Layout/AppLayout.jsx` (ADMIN_NAV already has stubs)

- [ ] **Step 1: Create AdminAnalyticsPage with real data**

```jsx
// Queries (run in parallel via Promise.all):
const [
  { count: totalSeekers },
  { count: totalCoaches },
  { count: totalSessions },
  { data: revenueData },
  { data: recentSessions },
  { data: topCoaches },
] = await Promise.all([
  supabase.from('seeker_profiles').select('*', { count: 'exact', head: true }),
  supabase.from('coach_profiles').select('*', { count: 'exact', head: true }).eq('verified', true),
  supabase.from('sessions').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
  supabase.from('sessions').select('scheduled_date, amount_paid').eq('status', 'completed').order('scheduled_date'),
  supabase.from('sessions').select('*, seeker:seeker_profiles(name), coach:coach_profiles(name)').order('created_at', { ascending: false }).limit(10),
  supabase.from('coach_profiles').select('name, rating, review_count, sessions_completed').eq('verified', true).order('rating', { ascending: false }).limit(5),
]);

// Revenue by month: group revenueData by month, sum amount_paid
// Render as bar chart using existing .bar-chart CSS classes
```

- [ ] **Step 2: Add routes to App.jsx**
```jsx
<Route path="/admin/analytics" element={<ProtectedRoute requiredRole="admin"><AdminAnalyticsPage /></ProtectedRoute>} />
<Route path="/admin/sessions"  element={<ProtectedRoute requiredRole="admin"><AdminSessionsPage /></ProtectedRoute>} />
<Route path="/admin/content"   element={<ProtectedRoute requiredRole="admin"><AdminContentPage /></ProtectedRoute>} />
```

- [ ] **Step 3: Complete the ADMIN_NAV in AppLayout.jsx**
```jsx
const ADMIN_NAV = [
  { section: 'PLATFORM', items: [
    { icon: '📊', label: 'Overview',   to: '/admin/dashboard' },
    { icon: '📈', label: 'Analytics',  to: '/admin/analytics' },
    { icon: '👥', label: 'Coaches',    to: '/admin/coaches' },
    { icon: '🧭', label: 'Seekers',    to: '/admin/seekers' },
    { icon: '📅', label: 'Sessions',   to: '/admin/sessions' },
    { icon: '📚', label: 'Content',    to: '/admin/content' },
  ]},
];
```

- [ ] **Step 4: Commit**
```bash
git commit -m "feat: admin analytics — revenue charts, user growth, coach performance"
```

---

## Phase 18: Waitlist, Favourites & Social Proof

**Goal:** Seekers can favourite coaches. Popular coaches show waitlist. Social proof counters. Inspired by: Airbnb (favourites), BetterHelp (match score).

### Task 21: Favourites system

**Files:**
- Supabase: `favourites` table
- Modify: `src/components/Seeker/CoachesPage.jsx`
- Modify: `src/components/Seeker/CoachProfilePage.jsx`
- Create: `src/components/Seeker/FavouritesPage.jsx`

- [ ] **Step 1: Create favourites table**
```sql
CREATE TABLE public.favourites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seeker_id uuid REFERENCES public.seeker_profiles(id) ON DELETE CASCADE,
  coach_id uuid REFERENCES public.coach_profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(seeker_id, coach_id)
);
ALTER TABLE public.favourites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Seekers manage own favourites" ON public.favourites
  FOR ALL TO authenticated USING (seeker_id IN (SELECT id FROM seeker_profiles WHERE user_id = auth.uid()));
CREATE POLICY "Anyone can read favourite counts" ON public.favourites FOR SELECT TO authenticated USING (true);
```

- [ ] **Step 2: Add heart button to each coach card in CoachesPage**
```jsx
const [favourites, setFavourites] = useState(new Set());

const toggleFavourite = async (coachId) => {
  if (favourites.has(coachId)) {
    await supabase.from('favourites').delete().eq('seeker_id', profileId).eq('coach_id', coachId);
    setFavourites(prev => { const s = new Set(prev); s.delete(coachId); return s; });
  } else {
    await supabase.from('favourites').insert({ seeker_id: profileId, coach_id: coachId });
    setFavourites(prev => new Set([...prev, coachId]));
  }
};

// On card:
<button className="fav-btn" onClick={e => { e.stopPropagation(); toggleFavourite(coach.id); }}>
  {favourites.has(coach.id) ? '❤️' : '🤍'}
</button>
```

- [ ] **Step 3: Create FavouritesPage showing saved coaches**

- [ ] **Step 4: Add Favourites to seeker nav and App.jsx route**

- [ ] **Step 5: Commit**
```bash
git commit -m "feat: coach favourites — heart button, saved coaches page"
```

---

## Phase 19: Cancellation, Rescheduling & Reminders

**Goal:** Seekers can cancel or reschedule sessions (with policy enforcement). Automated 24h and 1h reminders. Inspired by: Calendly.

### Task 22: Cancellation & rescheduling

**Files:**
- Modify: `src/components/Seeker/SessionsPage.jsx`
- Create: `supabase/functions/send-reminders/index.ts` (cron Edge Function)

- [ ] **Step 1: Add cancellation policy check**

In `SessionsPage.jsx` cancel handler:
```jsx
const handleCancel = async (session) => {
  const sessionDate = new Date(`${session.scheduled_date}T${session.scheduled_time}`);
  const hoursUntil = (sessionDate - new Date()) / 3600000;
  const policy = session.coach?.cancellation_policy || '24h notice required';

  if (hoursUntil < 24) {
    const proceed = window.confirm(`⚠️ Late cancellation: ${policy}. You may be charged a cancellation fee. Continue?`);
    if (!proceed) return;
  }

  await supabase.from('sessions').update({ status: 'cancelled' }).eq('id', session.id);
  // Send cancellation email
  await supabase.functions.invoke('send-email', {
    body: { to: user.email, template: 'session_cancelled', data: { ... } }
  });
  showToast('Session cancelled', 'success');
  loadSessions();
};
```

- [ ] **Step 2: Add reschedule modal**

Add a "Reschedule" button that opens the same date/time picker from `CoachProfilePage` but updates the existing session instead of creating a new one:
```jsx
const reschedule = async (session, newDate, newTime) => {
  await supabase.from('sessions').update({
    scheduled_date: newDate,
    scheduled_time: newTime + ':00',
    status: 'scheduled',
  }).eq('id', session.id);
  showToast('Session rescheduled', 'success');
};
```

- [ ] **Step 3: Create reminder cron Edge Function**

`supabase/functions/send-reminders/index.ts`:
```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

serve(async () => {
  const now = new Date();
  const in1h = new Date(now.getTime() + 60 * 60 * 1000);
  const in1hDate = in1h.toISOString().split('T')[0];
  const in1hTime = in1h.toTimeString().slice(0,5);

  const { data: sessions } = await supabase
    .from('sessions')
    .select('*, seeker:seeker_profiles(name,user_id), coach:coach_profiles(name,user_id)')
    .eq('scheduled_date', in1hDate)
    .eq('scheduled_time', in1hTime + ':00')
    .eq('status', 'scheduled');

  for (const s of sessions || []) {
    const { data: seekerUser } = await supabase.auth.admin.getUserById(s.seeker.user_id);
    const { data: coachUser } = await supabase.auth.admin.getUserById(s.coach.user_id);

    await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-email`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: seekerUser?.user?.email, template: 'session_reminder', data: { name: s.seeker.name, otherParty: s.coach.name, joinUrl: s.zoom_link || '#' } }),
    });
    await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-email`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: coachUser?.user?.email, template: 'session_reminder', data: { name: s.coach.name, otherParty: s.seeker.name, joinUrl: s.zoom_link || '#' } }),
    });
  }

  return new Response('done');
});
```

Schedule this function to run every hour via Supabase cron (pg_cron or GitHub Actions scheduled workflow).

- [ ] **Step 4: Commit**
```bash
git commit -m "feat: cancellation policy, rescheduling, 1-hour email reminders"
```

---

## Phase 20: Referral System

**Goal:** Seekers earn credit by referring friends. Inspired by: Headspace, BetterHelp referral programs.

### Task 23: Referral codes

**Files:**
- Supabase: `referrals` table + `referral_code` column on seeker_profiles
- Modify: `src/components/Seeker/SettingsPage.jsx`
- Modify: `src/components/Auth/SignUp.jsx`

- [ ] **Step 1: Add referral schema**
```sql
ALTER TABLE public.seeker_profiles ADD COLUMN IF NOT EXISTS referral_code text UNIQUE DEFAULT substring(md5(random()::text) FROM 1 FOR 8);

CREATE TABLE public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid REFERENCES public.seeker_profiles(id),
  referred_id uuid REFERENCES public.seeker_profiles(id),
  reward_credited boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Seekers see own referrals" ON public.referrals FOR SELECT TO authenticated USING (referrer_id IN (SELECT id FROM seeker_profiles WHERE user_id = auth.uid()));
```

- [ ] **Step 2: Show referral code in SettingsPage**
```jsx
// In Profile tab:
<div className="card" style={{marginTop:'16px'}}>
  <p className="section-label">REFER A FRIEND</p>
  <p style={{fontSize:'14px',color:'var(--text-soft)',margin:'8px 0'}}>Share your code and earn 1 free session when they subscribe.</p>
  <div style={{display:'flex',gap:'8px'}}>
    <input className="form-input" value={`https://tcco.app/signup?ref=${profile?.referral_code}`} readOnly />
    <button className="btn btn-outline" onClick={() => { navigator.clipboard.writeText(`https://tcco.app/signup?ref=${profile?.referral_code}`); showToast('Copied!','success'); }}>Copy</button>
  </div>
</div>
```

- [ ] **Step 3: Handle ref param on signup**

In `SignUp.jsx`, read `?ref=CODE` URL param and store it in sessionStorage. After successful signup, look up the referrer by code and insert a referrals record.

- [ ] **Step 4: Commit**
```bash
git commit -m "feat: referral system with unique codes and reward tracking"
```

---

## Phase 21: Accessibility (a11y)

**Goal:** WCAG 2.1 AA compliance. Screen reader support. Keyboard navigation. Focus management.

### Task 24: Accessibility audit and fixes

**Files:** All component files

- [ ] **Step 1: Add ARIA labels to all icon-only buttons**
```jsx
// All buttons with only emoji content:
<button aria-label="Toggle menu" className="al-hamburger">...</button>
<button aria-label="Mark as favourite" className="fav-btn">❤️</button>
<button aria-label="Notifications" className="notif-bell">🔔</button>
```

- [ ] **Step 2: Add role and aria-label to sidebar nav**
```jsx
<nav className="al-nav" role="navigation" aria-label="Main navigation">
```

- [ ] **Step 3: Add focus-visible styles**
```css
/* In index.css */
:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
  border-radius: 4px;
}
```

- [ ] **Step 4: Ensure all form inputs have associated labels**

Audit every `<input>` to confirm it has either a `<label htmlFor>` or `aria-label`.

- [ ] **Step 5: Add skip-to-content link**
```jsx
// In AppLayout.jsx, very first element in render:
<a href="#main-content" className="skip-link">Skip to main content</a>
// Add id="main-content" to <main className="al-main">
```
```css
.skip-link { position:absolute; top:-40px; left:0; background:var(--accent); color:#fff; padding:8px 16px; z-index:999; border-radius:0 0 4px 0; }
.skip-link:focus { top:0; }
```

- [ ] **Step 6: Commit**
```bash
git commit -m "feat: a11y — ARIA labels, focus styles, skip link, keyboard navigation"
```

---

## Phase 22: RLS Hardening for Production

**Goal:** Enable RLS on all remaining tables. Apply proper per-user policies before launch.

### Task 25: Enable RLS on all tables

- [ ] **Step 1: Apply RLS to remaining tables**

```sql
-- users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own record" ON public.users FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "Users update own record" ON public.users FOR UPDATE TO authenticated USING (id = auth.uid());

-- seeker_profiles
ALTER TABLE public.seeker_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Seeker reads own profile" ON public.seeker_profiles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Seeker updates own profile" ON public.seeker_profiles FOR UPDATE TO authenticated USING (user_id = auth.uid());
-- Coaches need to read seeker profiles (for sessions)
CREATE POLICY "Coaches read seeker profiles in their sessions" ON public.seeker_profiles FOR SELECT TO authenticated
  USING (id IN (SELECT seeker_id FROM sessions WHERE coach_id IN (SELECT id FROM coach_profiles WHERE user_id = auth.uid())));

-- sessions
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Session participants can read" ON public.sessions FOR SELECT TO authenticated
  USING (seeker_id IN (SELECT id FROM seeker_profiles WHERE user_id = auth.uid()) OR
         coach_id IN (SELECT id FROM coach_profiles WHERE user_id = auth.uid()));
CREATE POLICY "Seekers can create sessions" ON public.sessions FOR INSERT TO authenticated
  WITH CHECK (seeker_id IN (SELECT id FROM seeker_profiles WHERE user_id = auth.uid()));
CREATE POLICY "Participants can update sessions" ON public.sessions FOR UPDATE TO authenticated
  USING (seeker_id IN (SELECT id FROM seeker_profiles WHERE user_id = auth.uid()) OR
         coach_id IN (SELECT id FROM coach_profiles WHERE user_id = auth.uid()));

-- journal_entries
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Seekers manage own journal" ON public.journal_entries FOR ALL TO authenticated
  USING (seeker_id IN (SELECT id FROM seeker_profiles WHERE user_id = auth.uid()))
  WITH CHECK (seeker_id IN (SELECT id FROM seeker_profiles WHERE user_id = auth.uid()));

-- messages + subscriptions
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Seekers read own subscriptions" ON public.subscriptions FOR SELECT TO authenticated
  USING (seeker_id IN (SELECT id FROM seeker_profiles WHERE user_id = auth.uid()));
```

- [ ] **Step 2: Test every page still loads correctly after RLS**

Log in as seeker@test.com, navigate all 10 seeker pages. Log in as coach, navigate all 6 coach pages. Log in as admin, navigate admin pages.

- [ ] **Step 3: Commit**
```bash
git commit -m "feat: enable RLS on all tables — production security hardening"
```

---

## File Map Summary

| New Files | Purpose |
|-----------|---------|
| `src/components/Auth/AuthCallback.jsx` | OAuth redirect handler |
| `src/components/Auth/ResetPassword.jsx` | Password reset UI |
| `src/components/Shared/MessagesPage.jsx` | Real-time messaging |
| `src/components/Shared/MessagesPage.css` | Messaging styles |
| `src/components/Shared/VideoRoom.jsx` | Daily.co video |
| `src/components/Shared/VideoRoom.css` | Video room styles |
| `src/components/Shared/NotificationsDropdown.jsx` | Notification bell |
| `src/components/Shared/NotificationsDropdown.css` | Notification styles |
| `src/components/Shared/AvatarUpload.jsx` | Photo upload |
| `src/components/Shared/ErrorBoundary.jsx` | Error boundary |
| `src/components/Shared/Skeleton.jsx` | Loading skeletons |
| `src/components/Shared/SEO.jsx` | Meta tags |
| `src/components/Coach/IntakeFormsPage.jsx` | Coach intake forms |
| `src/components/Seeker/FavouritesPage.jsx` | Saved coaches |
| `src/components/Admin/AdminAnalyticsPage.jsx` | Admin charts |
| `src/components/Admin/AdminSessionsPage.jsx` | Admin session view |
| `src/components/Admin/AdminContentPage.jsx` | Admin content moderation |
| `src/lib/analytics.js` | PostHog wrapper |
| `supabase/functions/create-daily-room/` | Video room creation |
| `supabase/functions/create-checkout-session/` | Stripe checkout |
| `supabase/functions/stripe-webhook/` | Stripe events |
| `supabase/functions/create-connect-account/` | Stripe Connect |
| `supabase/functions/send-email/` | Resend email sender |
| `supabase/functions/send-reminders/` | Hourly reminder cron |
| `.github/workflows/deploy.yml` | CI/CD pipeline |
| `public/.htaccess` | SPA routing + headers |

---

## Dependencies to Install

```bash
npm install react-helmet-async posthog-js @sentry/react @daily-co/daily-js
npm install -D vite-plugin-pwa
```

## Environment Variables Needed

```bash
# Frontend (.env)
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_STRIPE_PUBLISHABLE_KEY=
VITE_POSTHOG_KEY=
VITE_SENTRY_DSN=

# Supabase Edge Function Secrets
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_DISCOVERY_PRICE_ID=
STRIPE_CONNECTION_PRICE_ID=
DAILY_API_KEY=
RESEND_API_KEY=
APP_URL=https://tcco.app
SUPABASE_SERVICE_ROLE_KEY=
```

## Execution Order (Recommended)

1. Phase 1 (Auth) — **required before any launch**
2. Phase 2 (Task 2, DEV ID migration) — **required before any launch**
3. Phase 22 (RLS hardening) — **required before any launch**
4. Phase 8 (Mobile) — high impact, low effort
5. Phase 4 (Stripe) — revenue
6. Phase 5 (Email) — trust and retention
7. Phase 3 (Video) — core product value
8. Phase 2 (Messaging) — engagement
9. Phase 7 (Notifications) — retention
10. Phase 9 (SEO) — growth
11. Phase 13 (Reviews) — social proof
12. Phase 10 (Sentry) — reliability
13. Phase 11 (Analytics) — insight
14. Phase 6 (File Uploads) — polish
15. Phase 12 (Intake/Packages) — monetisation
16. Phase 14 (Advanced Search) — discovery
17. Phase 18 (Favourites) — engagement
18. Phase 19 (Cancellation/Reminders) — operational
19. Phase 20 (Referrals) — growth
20. Phase 21 (a11y) — compliance
21. Phase 15 (PWA) — mobile app feel
22. Phase 16 (CI/CD) — developer velocity
23. Phase 17 (Admin Analytics) — business insight
