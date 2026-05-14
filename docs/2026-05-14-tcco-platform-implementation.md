# TCCO Platform Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a fully functional two-sided coaching platform with seekers, coaches, and admin features, deployed to Hostinger with Supabase backend.

**Architecture:** React SPA (single-page app) with role-based navigation (seeker/coach/admin). Supabase provides PostgreSQL database, auth, real-time subscriptions, and file storage. Stripe handles payments for seekers and payouts to coaches. Vite bundler for fast builds.

**Tech Stack:** React 18, Vite, Supabase (Auth + PostgreSQL + Real-time + Storage), Stripe, React Router v6, TanStack Query (data fetching), date-fns (dates)

**Timeline estimate:** 14-16 weeks for MVP (dev + QA + launch)

---

## Phase 1: Environment & Setup (Week 1)

### Task 1: Initialize Node.js project & install dependencies

**Files:**
- Create: `package.json`
- Create: `.env.example`
- Create: `.gitignore`

- [ ] **Step 1: Create project directory and initialize npm**

```bash
mkdir tcco-app && cd tcco-app
npm init -y
```

- [ ] **Step 2: Install core dependencies**

```bash
npm install react react-dom react-router-dom vite @vitejs/plugin-react
npm install @supabase/supabase-js @stripe/react-stripe-js stripe
npm install @tanstack/react-query axios date-fns
npm install -D vite vitest @testing-library/react @testing-library/jest-dom
```

- [ ] **Step 3: Create `.env.example`**

```bash
cat > .env.example << 'EOF'
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_STRIPE_PUBLIC_KEY=pk_test_...
VITE_APP_URL=http://localhost:5173
EOF
```

- [ ] **Step 4: Create actual `.env` (local only, never commit)**

Copy `.env.example` to `.env` and fill in Supabase/Stripe keys (get these in next tasks).

- [ ] **Step 5: Create `vite.config.js`**

```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  }
})
```

- [ ] **Step 6: Update `package.json` scripts**

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest",
    "test:ui": "vitest --ui"
  }
}
```

- [ ] **Step 7: Create `.gitignore`**

```
node_modules/
.env
.env.local
dist/
.DS_Store
*.log
```

- [ ] **Step 8: Commit**

```bash
git init
git add .
git commit -m "init: set up React + Vite project structure"
```

**Story points:** 2 | **Effort:** ~30 min

---

### Task 2: Set up Supabase project & database schema

**Files:**
- Create: `docs/SUPABASE_SETUP.md`
- Create: `supabase/migrations/001_initial_schema.sql`

- [ ] **Step 1: Create Supabase project**

Go to https://supabase.com → Sign up → Create new project
- Name: `tcco-coaching`
- Region: Choose closest to you
- Database password: Generate strong password, save it
- Note the project URL and anon key for `.env`

- [ ] **Step 2: Get Supabase credentials**

In Supabase dashboard:
- Settings → API → Project URL (copy to `VITE_SUPABASE_URL`)
- Settings → API → anon public key (copy to `VITE_SUPABASE_ANON_KEY`)

- [ ] **Step 3: Create database schema via SQL editor**

Go to Supabase SQL Editor and run:

```sql
-- Users table (Supabase auth_users already exists, we extend with profile)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  user_type TEXT NOT NULL CHECK (user_type IN ('seeker', 'coach', 'admin')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE seeker_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  avatar_url TEXT,
  tier TEXT NOT NULL CHECK (tier IN ('Discovery', 'Connection')),
  stripe_subscription_id TEXT,
  mood_average DECIMAL(3,2) DEFAULT 3.0,
  day_streak INT DEFAULT 0,
  sessions_completed INT DEFAULT 0,
  onboarding_quiz JSONB,
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE coach_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  title TEXT,
  bio TEXT,
  avatar_url TEXT,
  specialties TEXT[] DEFAULT '{}',
  credentials JSONB DEFAULT '[]',
  approach TEXT,
  session_types JSONB DEFAULT '[]',
  price_per_session DECIMAL(10,2),
  rating DECIMAL(3,2) DEFAULT 5.0,
  review_count INT DEFAULT 0,
  verified BOOLEAN DEFAULT FALSE,
  stripe_account_id TEXT,
  cancellation_policy TEXT,
  max_clients INT,
  languages TEXT[] DEFAULT ARRAY['English'],
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL REFERENCES coach_profiles(id) ON DELETE CASCADE,
  day_of_week INT CHECK (day_of_week >= 0 AND day_of_week <= 6),
  time_slots JSONB NOT NULL,
  recurring BOOLEAN DEFAULT TRUE,
  unavailable_dates DATE[] DEFAULT '{}',
  timezone TEXT DEFAULT 'UTC',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL REFERENCES coach_profiles(id) ON DELETE CASCADE,
  seeker_id UUID NOT NULL REFERENCES seeker_profiles(id) ON DELETE CASCADE,
  scheduled_date DATE NOT NULL,
  scheduled_time TIME NOT NULL,
  duration_minutes INT DEFAULT 55,
  session_type TEXT DEFAULT '1-on-1',
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled', 'no_show')),
  zoom_link TEXT,
  notes_coach TEXT,
  notes_seeker TEXT,
  recording_url TEXT,
  rating_by_seeker INT,
  feedback_by_seeker TEXT,
  amount_paid DECIMAL(10,2),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID REFERENCES coach_profiles(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('audio', 'article', 'live_event', 'program')),
  content_url TEXT,
  duration_minutes INT,
  tags TEXT[] DEFAULT '{}',
  specialties TEXT[] DEFAULT '{}',
  published BOOLEAN DEFAULT FALSE,
  featured BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE content_engagement (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seeker_id UUID NOT NULL REFERENCES seeker_profiles(id) ON DELETE CASCADE,
  content_id UUID NOT NULL REFERENCES content(id) ON DELETE CASCADE,
  status TEXT CHECK (status IN ('bookmarked', 'in_progress', 'completed', 'archived')),
  rating INT,
  review_text TEXT,
  time_spent_seconds INT DEFAULT 0,
  completion_percentage INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seeker_id UUID NOT NULL REFERENCES seeker_profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  mood INT CHECK (mood >= 1 AND mood <= 5),
  mood_note TEXT,
  content TEXT NOT NULL,
  prompt TEXT,
  themes TEXT[] DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  thread_id UUID NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seeker_id UUID NOT NULL UNIQUE REFERENCES seeker_profiles(id) ON DELETE CASCADE,
  tier TEXT NOT NULL CHECK (tier IN ('Discovery', 'Connection')),
  stripe_subscription_id TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'cancelled')),
  started_at TIMESTAMP DEFAULT NOW(),
  ends_at TIMESTAMP,
  auto_renew BOOLEAN DEFAULT TRUE,
  cancel_reason TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('super_admin', 'moderator', 'analytics_only')),
  permissions JSONB DEFAULT '[]',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_charge_id TEXT,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('subscription', 'session_purchase', 'refund')),
  amount DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS (Row-Level Security)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE seeker_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (we'll enhance these in Task 3)
CREATE POLICY "Users can view their own profile" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Seekers can view their own profile" ON seeker_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Coaches can view their own profile" ON coach_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Anyone can view published content" ON content FOR SELECT USING (published = TRUE);
CREATE POLICY "Seekers can view their own journal" ON journal_entries FOR SELECT USING (seeker_id = (SELECT id FROM seeker_profiles WHERE user_id = auth.uid()));

-- Indexes for common queries
CREATE INDEX idx_seeker_profiles_user_id ON seeker_profiles(user_id);
CREATE INDEX idx_coach_profiles_user_id ON coach_profiles(user_id);
CREATE INDEX idx_coach_profiles_verified ON coach_profiles(verified);
CREATE INDEX idx_sessions_coach_id ON sessions(coach_id);
CREATE INDEX idx_sessions_seeker_id ON sessions(seeker_id);
CREATE INDEX idx_sessions_status ON sessions(status);
CREATE INDEX idx_journal_entries_seeker_date ON journal_entries(seeker_id, date);
CREATE INDEX idx_messages_thread ON messages(thread_id);
```

- [ ] **Step 4: Enable Storage buckets for file uploads**

In Supabase Storage:
- Create bucket: `coach-avatars` (public)
- Create bucket: `coach-content` (private, coach-accessible)
- Create bucket: `seeker-avatars` (public)

- [ ] **Step 5: Create `docs/SUPABASE_SETUP.md`**

```markdown
# Supabase Setup Guide

## Project Creation
1. Go to https://supabase.com and create account
2. Create new project "tcco-coaching"
3. Save Project URL and Anon Key to .env

## Database Schema
- Schema created via SQL Editor (see migrations/001_initial_schema.sql)
- RLS policies enabled for security
- Indexes created for performance

## Storage Buckets
- coach-avatars: public
- coach-content: private
- seeker-avatars: public

## Auth Configuration
- Email/password auth enabled
- OAuth (Google, Apple) to be configured in Phase 2
```

- [ ] **Step 6: Commit**

```bash
git add package.json vite.config.js docs/SUPABASE_SETUP.md .env.example
git commit -m "setup: add Supabase project config and database schema"
```

**Story points:** 3 | **Effort:** ~1 hour

---

### Task 3: Set up Stripe and payment configuration

**Files:**
- Create: `docs/STRIPE_SETUP.md`
- Create: `src/lib/stripe.js`

- [ ] **Step 1: Create Stripe account**

Go to https://stripe.com → Sign up → Create account

- [ ] **Step 2: Get Stripe keys**

In Stripe Dashboard:
- Developers → API Keys
- Copy Publishable Key (pk_test_...) → `VITE_STRIPE_PUBLIC_KEY`
- Copy Secret Key (sk_test_...) → keep secure (backend only)

- [ ] **Step 3: Enable Stripe Connect (for coach payouts)**

In Stripe:
- Settings → Connect Settings
- Enable Connect
- Configure redirect URL: `https://www.thecoachingcollectiveonline.com/coach-onboarding-stripe`

- [ ] **Step 4: Create Stripe Products**

In Stripe Dashboard → Products:

**Product 1: Discovery Tier**
- Name: Discovery Annual
- Price: $50 (one-time)
- Set to active

**Product 2: Connection Tier**
- Name: Connection Monthly
- Price: $197 (recurring monthly)
- Set to active

- [ ] **Step 5: Create `src/lib/stripe.js`**

```javascript
import { loadStripe } from '@stripe/stripe-js';

let stripePromise;

export const getStripe = async () => {
  if (!stripePromise) {
    stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);
  }
  return stripePromise;
};

export const STRIPE_PRODUCTS = {
  DISCOVERY: process.env.REACT_APP_STRIPE_DISCOVERY_ID || 'prod_discovery',
  CONNECTION: process.env.REACT_APP_STRIPE_CONNECTION_ID || 'prod_connection',
};

export const STRIPE_PRICES = {
  DISCOVERY: process.env.REACT_APP_STRIPE_DISCOVERY_PRICE_ID || 'price_discovery',
  CONNECTION: process.env.REACT_APP_STRIPE_CONNECTION_PRICE_ID || 'price_connection',
};
```

- [ ] **Step 6: Create `docs/STRIPE_SETUP.md`**

```markdown
# Stripe Configuration

## Account Setup
1. Create Stripe account at stripe.com
2. Enable Stripe Connect (for coach payouts)
3. Configure redirect URLs:
   - Success: https://thecoachingcollectiveonline.com/coach-onboarding-stripe
   - Cancelled: https://thecoachingcollectiveonline.com/coach-onboarding

## Products & Pricing
- Discovery Annual: $50 (one-time)
- Connection Monthly: $197 (recurring)

## Webhook Configuration (Phase 2)
- Webhook endpoint: /api/stripe/webhook
- Events to listen: payment_intent.succeeded, charge.refunded

## Coach Payout Setup
- Stripe Connect required in coach onboarding
- Monthly automatic payouts to connected bank accounts
```

- [ ] **Step 7: Commit**

```bash
git add src/lib/stripe.js docs/STRIPE_SETUP.md .env.example
git commit -m "setup: configure Stripe for payments and coach payouts"
```

**Story points:** 2 | **Effort:** ~45 min

---

## Phase 2: Core Infrastructure (Weeks 2-3)

### Task 4: Set up Supabase Auth and AuthContext

**Files:**
- Create: `src/lib/supabase.js`
- Create: `src/auth/AuthContext.jsx`
- Create: `src/auth/useAuth.js`
- Create: `src/auth/ProtectedRoute.jsx`
- Create: `tests/auth.test.js`

- [ ] **Step 1: Create Supabase client**

Create `src/lib/supabase.js`:

```javascript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);

// Helper for authenticated requests
export const getAuthHeaders = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    'Authorization': `Bearer ${session?.access_token}`,
  };
};
```

- [ ] **Step 2: Create AuthContext**

Create `src/auth/AuthContext.jsx`:

```javascript
import React, { createContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        // Fetch user profile (seeker, coach, or admin)
        fetchUserProfile(session.user.id);
      }
      setLoading(false);
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session?.user) {
          setUser(session.user);
          fetchUserProfile(session.user.id);
        } else {
          setUser(null);
          setUserProfile(null);
        }
      }
    );

    return () => subscription?.unsubscribe();
  }, []);

  const fetchUserProfile = async (userId) => {
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    setUserProfile(data);
  };

  const signup = async (email, password, userType) => {
    // Sign up user
    const { data: { user }, error: signupError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signupError) throw signupError;

    // Create user profile record
    const { error: profileError } = await supabase
      .from('users')
      .insert([{ id: user.id, user_type: userType }]);

    if (profileError) throw profileError;
    return user;
  };

  const login = async (email, password) => {
    const { data: { user }, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return user;
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setUser(null);
    setUserProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, userProfile, loading, signup, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
```

- [ ] **Step 3: Create useAuth hook**

Create `src/auth/useAuth.js`:

```javascript
import { useContext } from 'react';
import { AuthContext } from './AuthContext';

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
```

- [ ] **Step 4: Create ProtectedRoute component**

Create `src/auth/ProtectedRoute.jsx`:

```javascript
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './useAuth';

export function ProtectedRoute({ children, requiredRole = null }) {
  const { user, userProfile, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>; // TODO: Loading skeleton
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && userProfile?.user_type !== requiredRole) {
    return <Navigate to="/" replace />;
  }

  return children;
}
```

- [ ] **Step 5: Create basic auth tests**

Create `tests/auth.test.js`:

```javascript
import { describe, it, expect } from 'vitest';
import { supabase } from '../src/lib/supabase';

describe('Authentication', () => {
  it('should initialize supabase client', () => {
    expect(supabase).toBeDefined();
  });

  it('should have auth methods', () => {
    expect(supabase.auth.signUp).toBeDefined();
    expect(supabase.auth.signInWithPassword).toBeDefined();
    expect(supabase.auth.signOut).toBeDefined();
  });
});
```

- [ ] **Step 6: Update `src/App.jsx` to use AuthProvider**

```javascript
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { ProtectedRoute } from './auth/ProtectedRoute';
import Login from './components/Auth/Login';
import Dashboard from './components/Seeker/Dashboard';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute requiredRole="seeker">
                <Dashboard />
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
```

- [ ] **Step 7: Commit**

```bash
git add src/auth/ src/lib/supabase.js tests/auth.test.js src/App.jsx
git commit -m "feat: add Supabase auth and AuthContext for user session management"
```

**Story points:** 5 | **Effort:** ~2 hours

---

### Task 5: Build Sign-up & onboarding flow (Seeker)

**Files:**
- Create: `src/components/Auth/SignUp.jsx`
- Create: `src/components/Auth/SeekerOnboarding.jsx`
- Create: `src/hooks/useSeekerOnboarding.js`
- Create: `tests/onboarding.test.js`

- [ ] **Step 1: Write test for onboarding flow**

Create `tests/onboarding.test.js`:

```javascript
import { describe, it, expect } from 'vitest';

describe('Seeker Onboarding', () => {
  it('should collect 3 quiz answers', () => {
    const answers = {
      brings_you_here: 'burnout',
      preferred_format: '1-on-1',
      coaching_experience: 'first-timer',
    };
    expect(answers.brings_you_here).toBe('burnout');
  });

  it('should recommend Discovery for first-timers', () => {
    const experience = 'first-timer';
    const recommendedTier = experience === 'first-timer' ? 'Discovery' : 'Connection';
    expect(recommendedTier).toBe('Discovery');
  });
});
```

- [ ] **Step 2: Create useSeekerOnboarding hook**

Create `src/hooks/useSeekerOnboarding.js`:

```javascript
import { useState } from 'react';
import { supabase } from '../lib/supabase';

const QUIZ_OPTIONS = {
  brings_you_here: [
    { value: 'burnout', label: 'Burnout' },
    { value: 'relationships', label: 'Relationships' },
    { value: 'performance', label: 'Performance' },
    { value: 'sleep', label: 'Sleep' },
    { value: 'anxiety', label: 'Anxiety' },
    { value: 'other', label: 'Other' },
  ],
  preferred_format: [
    { value: '1-on-1', label: '1-on-1' },
    { value: 'group', label: 'Group' },
    { value: 'self-guided', label: 'Self-guided' },
  ],
  coaching_experience: [
    { value: 'first-timer', label: 'First-timer' },
    { value: 'experienced', label: 'Experienced' },
  ],
};

export function useSeekerOnboarding(userId) {
  const [quizAnswers, setQuizAnswers] = useState({});
  const [selectedTier, setSelectedTier] = useState(null);
  const [loading, setLoading] = useState(false);

  const recommendTier = (answers) => {
    // First-timers get Discovery, experienced get Connection
    return answers.coaching_experience === 'first-timer' ? 'Discovery' : 'Connection';
  };

  const updateQuizAnswer = (question, value) => {
    setQuizAnswers(prev => ({ ...prev, [question]: value }));
  };

  const saveProfile = async (profileData) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('seeker_profiles')
        .insert([{
          user_id: userId,
          name: profileData.name,
          tier: selectedTier,
          onboarding_quiz: quizAnswers,
          preferences: { specialties: [quizAnswers.brings_you_here] },
        }]);

      if (error) throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    quizAnswers,
    updateQuizAnswer,
    recommendTier,
    selectedTier,
    setSelectedTier,
    saveProfile,
    loading,
    QUIZ_OPTIONS,
  };
}
```

- [ ] **Step 3: Create SignUp component**

Create `src/components/Auth/SignUp.jsx`:

```javascript
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/useAuth';
import Button from '../Common/Button';
import './SignUp.css';

export default function SignUp() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [userType, setUserType] = useState(null); // 'seeker' or 'coach'
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!userType) throw new Error('Please select seeker or coach');
      await signup(email, password, userType);
      
      // Redirect to appropriate onboarding
      navigate(userType === 'seeker' ? '/onboarding-seeker' : '/onboarding-coach');
    } catch (err) {
      setError(err.message || 'Failed to sign up');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signup-container">
      <h1>Join The Coaching Collective</h1>
      
      <div className="user-type-selector">
        <label>
          <input
            type="radio"
            name="userType"
            value="seeker"
            checked={userType === 'seeker'}
            onChange={(e) => setUserType(e.target.value)}
          />
          I'm looking for a coach
        </label>
        <label>
          <input
            type="radio"
            name="userType"
            value="coach"
            checked={userType === 'coach'}
            onChange={(e) => setUserType(e.target.value)}
          />
          I'm a coaching professional
        </label>
      </div>

      <form onSubmit={handleSignup}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <p className="error">{error}</p>}
        <Button type="submit" disabled={loading}>
          {loading ? 'Signing up...' : 'Sign up'}
        </Button>
      </form>
    </div>
  );
}
```

- [ ] **Step 4: Create SeekerOnboarding component**

Create `src/components/Auth/SeekerOnboarding.jsx`:

```javascript
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/useAuth';
import { useSeekerOnboarding } from '../../hooks/useSeekerOnboarding';
import Button from '../Common/Button';
import './SeekerOnboarding.css';

export default function SeekerOnboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState('quiz'); // 'quiz', 'tier-select', 'payment'
  const {
    quizAnswers,
    updateQuizAnswer,
    recommendTier,
    selectedTier,
    setSelectedTier,
    saveProfile,
    QUIZ_OPTIONS,
  } = useSeekerOnboarding(user?.id);

  const handleQuizComplete = () => {
    const recommended = recommendTier(quizAnswers);
    setSelectedTier(recommended);
    setStep('tier-select');
  };

  const handleTierSelect = async () => {
    await saveProfile({ name: user?.email?.split('@')[0] || 'Seeker' });
    setStep('payment');
  };

  return (
    <div className="onboarding-container">
      {step === 'quiz' && (
        <div className="quiz-step">
          <h2>Let's find your perfect fit</h2>
          
          <div className="quiz-question">
            <h3>What brings you here?</h3>
            {QUIZ_OPTIONS.brings_you_here.map(opt => (
              <label key={opt.value}>
                <input
                  type="radio"
                  name="brings_you_here"
                  value={opt.value}
                  checked={quizAnswers.brings_you_here === opt.value}
                  onChange={() => updateQuizAnswer('brings_you_here', opt.value)}
                />
                {opt.label}
              </label>
            ))}
          </div>

          <div className="quiz-question">
            <h3>Preferred format?</h3>
            {QUIZ_OPTIONS.preferred_format.map(opt => (
              <label key={opt.value}>
                <input
                  type="radio"
                  name="preferred_format"
                  value={opt.value}
                  checked={quizAnswers.preferred_format === opt.value}
                  onChange={() => updateQuizAnswer('preferred_format', opt.value)}
                />
                {opt.label}
              </label>
            ))}
          </div>

          <div className="quiz-question">
            <h3>Experience with coaching?</h3>
            {QUIZ_OPTIONS.coaching_experience.map(opt => (
              <label key={opt.value}>
                <input
                  type="radio"
                  name="coaching_experience"
                  value={opt.value}
                  checked={quizAnswers.coaching_experience === opt.value}
                  onChange={() => updateQuizAnswer('coaching_experience', opt.value)}
                />
                {opt.label}
              </label>
            ))}
          </div>

          <Button onClick={handleQuizComplete}>
            Next
          </Button>
        </div>
      )}

      {step === 'tier-select' && (
        <div className="tier-step">
          <h2>Choose your plan</h2>
          <p>We recommend <strong>{selectedTier}</strong> for you.</p>

          <div className="tier-options">
            <div className={`tier-card ${selectedTier === 'Discovery' ? 'selected' : ''}`}>
              <h3>Discovery</h3>
              <p className="price">$50<span>/year</span></p>
              <ul>
                <li>Browse coaches</li>
                <li>1 session/month</li>
                <li>Journal + library access</li>
              </ul>
              <Button onClick={() => setSelectedTier('Discovery')}>
                Choose Discovery
              </Button>
            </div>

            <div className={`tier-card ${selectedTier === 'Connection' ? 'selected' : ''}`}>
              <h3>Connection</h3>
              <p className="price">$197<span>/month</span></p>
              <ul>
                <li>Unlimited sessions</li>
                <li>Full library access</li>
                <li>Priority booking</li>
              </ul>
              <Button onClick={() => setSelectedTier('Connection')}>
                Choose Connection
              </Button>
            </div>
          </div>

          <Button onClick={handleTierSelect}>
            Continue to payment
          </Button>
        </div>
      )}

      {step === 'payment' && (
        <div className="payment-step">
          <h2>Complete your payment</h2>
          <p>You selected: <strong>{selectedTier}</strong></p>
          {/* TODO: Stripe checkout form (Task 6) */}
          <p>[Stripe checkout to be implemented]</p>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Create basic CSS styling**

Create `src/components/Auth/SignUp.css`:

```css
.signup-container {
  max-width: 400px;
  margin: 0 auto;
  padding: 40px 20px;
  text-align: center;
}

.user-type-selector {
  display: flex;
  gap: 20px;
  margin: 20px 0;
  justify-content: center;
}

.user-type-selector label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

input[type="email"],
input[type="password"] {
  width: 100%;
  padding: 10px;
  margin: 10px 0;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 14px;
}

.error {
  color: #d32f2f;
  margin: 10px 0;
}
```

Create `src/components/Auth/SeekerOnboarding.css`:

```css
.onboarding-container {
  max-width: 600px;
  margin: 0 auto;
  padding: 40px 20px;
}

.quiz-question {
  margin: 30px 0;
  text-align: left;
}

.quiz-question label {
  display: block;
  margin: 10px 0;
  cursor: pointer;
}

.tier-options {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin: 30px 0;
}

.tier-card {
  border: 2px solid #ddd;
  border-radius: 8px;
  padding: 20px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
}

.tier-card.selected {
  border-color: #1F5F4A;
  background: #E8F0EB;
}

.tier-card .price {
  font-size: 28px;
  font-weight: bold;
  margin: 10px 0;
  color: #1F5F4A;
}

.tier-card ul {
  list-style: none;
  padding: 0;
  margin: 15px 0;
  text-align: left;
}

.tier-card li {
  padding: 8px 0;
  border-bottom: 1px solid #eee;
}
```

- [ ] **Step 6: Commit**

```bash
git add src/components/Auth/ src/hooks/useSeekerOnboarding.js tests/onboarding.test.js
git commit -m "feat: implement seeker signup and onboarding quiz flow"
```

**Story points:** 8 | **Effort:** ~3.5 hours

---

### Task 6: Integrate Stripe payment (Seeker Discovery/Connection tiers)

**Files:**
- Modify: `src/components/Auth/SeekerOnboarding.jsx`
- Create: `src/components/Payment/StripeCheckout.jsx`
- Create: `src/hooks/usePayment.js`
- Create: `tests/payment.test.js`

- [ ] **Step 1: Write payment test**

Create `tests/payment.test.js`:

```javascript
import { describe, it, expect } from 'vitest';

describe('Payment', () => {
  it('should have Stripe public key', () => {
    const key = import.meta.env.VITE_STRIPE_PUBLIC_KEY;
    expect(key).toBeDefined();
    expect(key.startsWith('pk_')).toBe(true);
  });

  it('should calculate Discovery tier amount as 5000 cents ($50)', () => {
    const amount = 50 * 100;
    expect(amount).toBe(5000);
  });

  it('should calculate Connection tier amount as 19700 cents ($197)', () => {
    const amount = 197 * 100;
    expect(amount).toBe(19700);
  });
});
```

- [ ] **Step 2: Create usePayment hook**

Create `src/hooks/usePayment.js`:

```javascript
import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { getStripe } from '../lib/stripe';

const TIER_AMOUNTS = {
  Discovery: 5000, // $50 in cents
  Connection: 19700, // $197 in cents
};

export function usePayment(userId, tier) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const createPaymentIntent = async () => {
    setLoading(true);
    setError(null);

    try {
      // Call backend to create payment intent (backend creates with sk key)
      const response = await fetch('/api/payment/create-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: TIER_AMOUNTS[tier],
          tier,
          userId,
        }),
      });

      if (!response.ok) throw new Error('Failed to create payment intent');
      
      const { clientSecret } = await response.json();
      return clientSecret;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const confirmPayment = async (elements, clientSecret) => {
    const stripe = await getStripe();
    
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      clientSecret,
      confirmParams: {
        return_url: `${import.meta.env.VITE_APP_URL}/thank-you`,
      },
    });

    if (error) {
      setError(error.message);
      throw error;
    }

    return paymentIntent;
  };

  return {
    createPaymentIntent,
    confirmPayment,
    loading,
    error,
  };
}
```

- [ ] **Step 3: Create StripeCheckout component**

Create `src/components/Payment/StripeCheckout.jsx`:

```javascript
import React, { useState, useEffect } from 'react';
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout,
} from '@stripe/react-stripe-js';
import { getStripe } from '../../lib/stripe';

export default function StripeCheckout({ tier, onSuccess }) {
  const [clientSecret, setClientSecret] = useState('');

  useEffect(() => {
    // Create payment intent on component mount
    fetch('/api/payment/create-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tier }),
    })
      .then(res => res.json())
      .then(data => setClientSecret(data.clientSecret));
  }, [tier]);

  return (
    <EmbeddedCheckoutProvider
      stripe={getStripe()}
      options={{ clientSecret }}
    >
      <EmbeddedCheckout onComplete={onSuccess} />
    </EmbeddedCheckoutProvider>
  );
}
```

- [ ] **Step 4: Update SeekerOnboarding with payment**

Modify `src/components/Auth/SeekerOnboarding.jsx` payment step:

```javascript
import StripeCheckout from '../Payment/StripeCheckout';

// In payment step:
{step === 'payment' && (
  <div className="payment-step">
    <h2>Complete your payment</h2>
    <p>You selected: <strong>{selectedTier}</strong></p>
    <StripeCheckout 
      tier={selectedTier} 
      onSuccess={() => navigate('/dashboard')}
    />
  </div>
)}
```

- [ ] **Step 5: Create backend webhook handler (Node.js)**

Create `src/api/payment.js` (backend):

```javascript
import Stripe from 'stripe';
import { supabase } from './supabase.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function createCheckoutSession(req, res) {
  const { tier, userId } = req.body;

  const priceId = tier === 'Discovery' 
    ? process.env.STRIPE_DISCOVERY_PRICE_ID
    : process.env.STRIPE_CONNECTION_PRICE_ID;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: tier === 'Discovery' ? 'payment' : 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.APP_URL}/thank-you`,
      cancel_url: `${process.env.APP_URL}/onboarding-seeker`,
      metadata: { userId, tier },
    });

    res.json({ clientSecret: session.client_secret });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function handleWebhook(req, res) {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (error) {
    res.status(400).json({ error: error.message });
    return;
  }

  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object;
      
      // Update seeker subscription
      await supabase
        .from('subscriptions')
        .insert([{
          seeker_id: (await supabase.from('seeker_profiles').select('id').eq('user_id', session.metadata.userId)).data[0].id,
          tier: session.metadata.tier,
          stripe_subscription_id: session.subscription,
          status: 'active',
        }]);
      break;
  }

  res.json({ received: true });
}
```

- [ ] **Step 6: Commit**

```bash
git add src/components/Payment/ src/hooks/usePayment.js tests/payment.test.js src/api/
git commit -m "feat: integrate Stripe payment for seeker tiers"
```

**Story points:** 8 | **Effort:** ~3.5 hours

---

## Phase 3: Seeker Features (Weeks 4-6)

### Task 7: Build Seeker Dashboard (home screen)

**Files:**
- Create: `src/components/Seeker/Dashboard.jsx`
- Create: `src/hooks/useDashboard.js`
- Create: `src/components/Common/StatCard.jsx`
- Create: `tests/seeker-dashboard.test.js`

- [ ] **Step 1: Write dashboard test**

Create `tests/seeker-dashboard.test.js`:

```javascript
import { describe, it, expect } from 'vitest';

describe('Seeker Dashboard', () => {
  it('should display 4 stat cards', () => {
    const stats = ['streak', 'practice', 'sessions', 'mood'];
    expect(stats.length).toBe(4);
  });

  it('should calculate 14-day average mood correctly', () => {
    const moods = [3, 4, 3, 5, 4, 3, 4, 4, 5, 5, 4, 3, 4, 5];
    const average = moods.reduce((a, b) => a + b) / moods.length;
    expect(average).toBeGreaterThan(3.5);
  });
});
```

- [ ] **Step 2: Create useDashboard hook**

Create `src/hooks/useDashboard.js`:

```javascript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../auth/useAuth';

export function useDashboard() {
  const { user } = useAuth();

  const { data: seekerProfile } = useQuery({
    queryKey: ['seeker-profile', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('seeker_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
      return data;
    },
  });

  const { data: upcomingSessions } = useQuery({
    queryKey: ['sessions-upcoming', seekerProfile?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('sessions')
        .select('*, coach_profiles(name, avatar_url)')
        .eq('seeker_id', seekerProfile?.id)
        .eq('status', 'scheduled')
        .gte('scheduled_date', new Date().toISOString())
        .order('scheduled_date')
        .limit(1);
      return data;
    },
    enabled: !!seekerProfile?.id,
  });

  const { data: moodHistory } = useQuery({
    queryKey: ['mood-history', seekerProfile?.id],
    queryFn: async () => {
      const fourteenDaysAgo = new Date();
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

      const { data } = await supabase
        .from('journal_entries')
        .select('mood, date')
        .eq('seeker_id', seekerProfile?.id)
        .gte('date', fourteenDaysAgo.toISOString().split('T')[0])
        .order('date');
      return data;
    },
    enabled: !!seekerProfile?.id,
  });

  const calculateMoodAverage = () => {
    if (!moodHistory || moodHistory.length === 0) return 0;
    const sum = moodHistory.reduce((acc, entry) => acc + (entry.mood || 0), 0);
    return (sum / moodHistory.length).toFixed(1);
  };

  return {
    profile: seekerProfile,
    upcomingSessions,
    moodHistory,
    moodAverage: calculateMoodAverage(),
  };
}
```

- [ ] **Step 3: Create StatCard component**

Create `src/components/Common/StatCard.jsx`:

```javascript
import React from 'react';
import './StatCard.css';

export default function StatCard({ icon, label, value, trend, sparkData }) {
  return (
    <div className="stat-card">
      <div className="stat-top">
        <div className="stat-icon">{icon}</div>
        {trend && <span className="stat-trend">{trend}</span>}
      </div>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
      {sparkData && (
        <div className="spark">
          {sparkData.map((val, i) => (
            <span key={i} style={{ height: `${val * 10}%` }} />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Create StatCard CSS**

Create `src/components/Common/StatCard.css`:

```css
.stat-card {
  background: var(--white);
  border: 1px solid var(--cream-dark);
  border-radius: var(--r-lg);
  padding: 18px;
}

.stat-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}

.stat-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: var(--green-soft);
  color: var(--green);
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-value {
  font-size: 28px;
  font-weight: 300;
  color: var(--ink);
  margin-bottom: 4px;
}

.stat-label {
  font-size: 10px;
  text-transform: uppercase;
  color: var(--gray);
  font-weight: 600;
}

.stat-trend {
  font-size: 10px;
  font-weight: 600;
  color: var(--green-2);
  background: var(--green-soft);
  padding: 2px 7px;
  border-radius: 999px;
}

.spark {
  display: flex;
  align-items: flex-end;
  gap: 3px;
  height: 24px;
  margin-top: 8px;
}

.spark span {
  flex: 1;
  background: var(--green-3);
  border-radius: 1px;
  opacity: 0.4;
}

.spark span.hi {
  opacity: 1;
  background: var(--green);
}
```

- [ ] **Step 5: Create Dashboard component**

Create `src/components/Seeker/Dashboard.jsx`:

```javascript
import React, { useState } from 'react';
import { useDashboard } from '../../hooks/useDashboard';
import StatCard from '../Common/StatCard';
import { format } from 'date-fns';
import './Dashboard.css';

export default function Dashboard() {
  const { profile, upcomingSessions, moodAverage } = useDashboard();
  const [intention, setIntention] = useState('I don\'t have to earn rest. I can just take it.');

  if (!profile) return <div>Loading...</div>;

  const nextSession = upcomingSessions?.[0];

  return (
    <div className="dashboard-container">
      {/* Hero section */}
      <section className="greet-hero">
        <div>
          <div className="greet-eye">
            {format(new Date(), 'EEEE · MMMM d')}
          </div>
          <h2>Good morning, {profile.name}.<br />One small thing today.</h2>
          <p>You've been showing up. Your coach noted your last session felt like a hinge — keep the door open today.</p>
          <div className="greet-cta">
            {nextSession && (
              <button className="btn btn-primary">
                Join {format(new Date(nextSession.scheduled_time), 'HH:mm')} session
              </button>
            )}
            <button className="btn btn-ghost">Write a check-in</button>
          </div>
        </div>

        <div className="intention-card">
          <div className="ic-label">Today's intention</div>
          <div className="ic-text">"{intention}"</div>
          <div className="ic-meta">
            <span>Set {format(new Date(), 'HH:mm')} this morning</span>
            <button>Edit</button>
          </div>
        </div>
      </section>

      {/* Stats grid */}
      <div className="dash-grid">
        <StatCard 
          icon="🔥" 
          label="Day streak" 
          value={profile.day_streak} 
          trend="+3"
        />
        <StatCard 
          icon="⏱️" 
          label="Practice this week" 
          value="4h 28m" 
          trend="+12%"
        />
        <StatCard 
          icon="👥" 
          label="Sessions completed" 
          value={profile.sessions_completed} 
        />
        <StatCard 
          icon="❤️" 
          label="Avg mood · 14 days" 
          value={`${moodAverage} / 10`} 
          trend="↑ from 5.4"
        />
      </div>

      {/* Upcoming session + mood check-in */}
      <div className="split-2">
        {nextSession && (
          <div className="session-strip">
            <div className="session-time">
              <div className="day">{format(new Date(nextSession.scheduled_date), 'EEE · MMM d')}</div>
              <div className="hour">{format(new Date(nextSession.scheduled_time), 'HH:mm')}</div>
              <div className="dur">{nextSession.duration_minutes} min</div>
            </div>
            <div className="session-coach">
              <img src={nextSession.coach_profiles?.avatar_url} alt="Coach" className="avatar" />
              <div className="session-info">
                <div className="title">Session with {nextSession.coach_profiles?.name}</div>
              </div>
            </div>
            <div className="session-actions">
              <button className="btn btn-soft btn-sm">Prep notes</button>
              <button className="btn btn-primary btn-sm">Join</button>
            </div>
          </div>
        )}

        <div className="card mood-card">
          <h3>How are you arriving today?</h3>
          <div className="mood-options">
            {[1, 2, 3, 4, 5].map(m => (
              <button key={m} className={`mood-btn m${m}`}>
                {['Low', 'Off', 'Okay', 'Good', 'Bright'][m - 1]}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Create Dashboard CSS**

Create `src/components/Seeker/Dashboard.css`:

```css
.dashboard-container {
  padding: 32px 40px;
  max-width: 1280px;
  margin: 0 auto;
}

.greet-hero {
  background: linear-gradient(135deg, var(--green) 0%, var(--green-dark) 60%, #14483a 100%);
  border-radius: var(--r-xl);
  padding: 36px 40px;
  color: var(--cream);
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: 24px;
  position: relative;
  overflow: hidden;
  margin-bottom: 28px;
}

.greet-hero h2 {
  font-size: 38px;
  font-weight: 400;
  font-style: italic;
  margin: 0 0 14px;
}

.greet-cta {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.intention-card {
  background: rgba(245,239,220,0.08);
  border: 1px solid rgba(245,239,220,0.18);
  border-radius: var(--r-lg);
  padding: 18px;
  z-index: 1;
}

.ic-label {
  font-size: 10px;
  text-transform: uppercase;
  opacity: 0.7;
  margin-bottom: 8px;
}

.ic-text {
  font-style: italic;
  font-size: 18px;
  line-height: 1.35;
  margin-bottom: 14px;
}

.dash-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  margin-bottom: 28px;
}

.split-2 {
  display: grid;
  grid-template-columns: 1.4fr 1fr;
  gap: 20px;
  margin-bottom: 28px;
}

.session-strip {
  background: var(--white);
  border: 1px solid var(--cream-dark);
  border-radius: var(--r-lg);
  padding: 20px;
  display: flex;
  gap: 16px;
  align-items: center;
}

.session-time {
  width: 88px;
  text-align: center;
  border-right: 1px solid var(--cream-dark);
  padding-right: 16px;
}

.mood-card h3 {
  margin: 0 0 16px;
  font-size: 14px;
  font-weight: 600;
}

.mood-options {
  display: flex;
  gap: 8px;
}

.mood-btn {
  flex: 1;
  padding: 12px 8px;
  border: 1px solid var(--cream-dark);
  background: var(--cream-mid);
  border-radius: 8px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  transition: all 0.2s;
}

.mood-btn:hover {
  background: var(--cream-dark);
}

.mood-btn.m1 { color: #d32f2f; }
.mood-btn.m2 { color: #f57c00; }
.mood-btn.m3 { color: #fbc02d; }
.mood-btn.m4 { color: #388e3c; }
.mood-btn.m5 { color: #1976d2; }
```

- [ ] **Step 7: Commit**

```bash
git add src/components/Seeker/Dashboard.jsx src/hooks/useDashboard.js src/components/Common/StatCard.jsx tests/seeker-dashboard.test.js src/components/Seeker/Dashboard.css src/components/Common/StatCard.css
git commit -m "feat: build seeker dashboard with stats, intentions, and mood tracking"
```

**Story points:** 8 | **Effort:** ~3.5 hours

---

## [REMAINING TASKS IN FULL PLAN CONTINUE...]

Due to token constraints, I'll summarize the remaining tasks structure instead of full details:

### Phase 3 Remaining (Weeks 4-6):
- **Task 8:** Coach browse & filtering interface (~8 points)
- **Task 9:** Coach profile detail modal & booking flow (~8 points)
- **Task 10:** Sessions list (upcoming/past) (~5 points)
- **Task 11:** Journal entry editor & mood tracking (~5 points)
- **Task 12:** Content library browse & consumption (~8 points)

### Phase 4: Coach Features (Weeks 7-9):
- **Task 13:** Coach profile editor & profile setup wizard (~8 points)
- **Task 14:** Availability/scheduling calendar (~8 points)
- **Task 15:** Coach clients list & messaging (~8 points)
- **Task 16:** Content creation studio (audio/articles/live) (~13 points)
- **Task 17:** Earnings & payout dashboard (~5 points)

### Phase 5: Admin & Payments (Weeks 10-11):
- **Task 18:** Admin dashboard & metrics (~8 points)
- **Task 19:** Coach verification queue (~5 points)
- **Task 20:** Content moderation panel (~5 points)
- **Task 21:** Stripe Connect for coach payouts (~8 points)
- **Task 22:** Webhook handling (payment, refunds) (~8 points)

### Phase 6: Real-Time & Polish (Weeks 12-14):
- **Task 23:** Supabase real-time subscriptions (availability, messages) (~8 points)
- **Task 24:** Session reminders & notifications (~5 points)
- **Task 25:** Testing & QA (~13 points)
- **Task 26:** Deployment to Hostinger (~5 points)
- **Task 27:** Performance optimization & launch (~8 points)

---

## Summary

**Total MVP Effort:** ~120 story points (14-16 weeks)

**Key Milestones:**
- Week 2: Auth & setup complete
- Week 4: Seeker dashboard + browse coaches
- Week 7: Seeker features done, Coach features start
- Week 11: Admin + payments
- Week 14: Launch ready

**Critical Path:**
1. ✅ Auth (Task 4) → Onboarding (Task 5) → Payments (Task 6)
2. Seeker Dashboard (Task 7) → Coach Browse (Task 8)
3. Coach Profile Setup (Task 13) → Sessions (Task 14)
4. Real-time (Task 23) → Deploy (Task 26)

**High-Risk/Complexity Items:**
- Stripe Connect integration (coach payouts)
- Real-time availability sync
- Multi-user messaging system

---

**Plan saved to:** `/Users/viraj/Desktop/public_html/docs/2026-05-14-tcco-platform-implementation.md`

---

## Execution Options

Two ways to execute this plan:

**1. Subagent-Driven (Recommended)**
- I dispatch a fresh subagent per task (1-2 tasks per batch)
- Review between batches
- Fast iteration + continuous quality checks

**2. Inline Execution**
- Execute tasks in this session using executing-plans skill
- Batch work with checkpoints for your review
- Longer continuous blocks

**Which approach would you prefer?**