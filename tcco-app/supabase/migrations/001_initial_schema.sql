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

-- Basic RLS policies
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
