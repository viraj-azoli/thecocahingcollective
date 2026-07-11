-- ============================================================
-- Fix: Add INSERT and UPDATE RLS policies
-- Without these, the app cannot create or modify user records
-- ============================================================

-- ── users table ──
DROP POLICY IF EXISTS "Users can insert own record" ON users;
CREATE POLICY "Users can insert own record" ON users FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own record" ON users;
CREATE POLICY "Users can update own record" ON users FOR UPDATE USING (auth.uid() = id);

-- ── seeker_profiles ──
DROP POLICY IF EXISTS "Seekers can insert own profile" ON seeker_profiles;
CREATE POLICY "Seekers can insert own profile" ON seeker_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Seekers can update own profile" ON seeker_profiles;
CREATE POLICY "Seekers can update own profile" ON seeker_profiles FOR UPDATE USING (auth.uid() = user_id);

-- Allow coaches to read seeker profiles (for session management)
DROP POLICY IF EXISTS "Coaches can view assigned seeker profiles" ON seeker_profiles;
CREATE POLICY "Coaches can view assigned seeker profiles" ON seeker_profiles FOR SELECT
  USING (
    auth.uid() IN (
      SELECT cp.user_id FROM coach_profiles cp
      JOIN sessions s ON s.coach_id = cp.id
      WHERE s.seeker_id = seeker_profiles.id
    )
  );

-- ── coach_profiles ──
DROP POLICY IF EXISTS "Coaches can insert own profile" ON coach_profiles;
CREATE POLICY "Coaches can insert own profile" ON coach_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Coaches can update own profile" ON coach_profiles;
CREATE POLICY "Coaches can update own profile" ON coach_profiles FOR UPDATE USING (auth.uid() = user_id);

-- Seekers need to read coach profiles (for browsing)
DROP POLICY IF EXISTS "Anyone can view coach profiles" ON coach_profiles;
CREATE POLICY "Anyone can view coach profiles" ON coach_profiles FOR SELECT USING (true);

-- ── sessions ──
DROP POLICY IF EXISTS "Seekers can view own sessions" ON sessions;
CREATE POLICY "Seekers can view own sessions" ON sessions FOR SELECT
  USING (seeker_id IN (SELECT id FROM seeker_profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Coaches can view own sessions" ON sessions;
CREATE POLICY "Coaches can view own sessions" ON sessions FOR SELECT
  USING (coach_id IN (SELECT id FROM coach_profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Seekers can insert sessions" ON sessions;
CREATE POLICY "Seekers can insert sessions" ON sessions FOR INSERT
  WITH CHECK (seeker_id IN (SELECT id FROM seeker_profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Seekers can update own sessions" ON sessions;
CREATE POLICY "Seekers can update own sessions" ON sessions FOR UPDATE
  USING (seeker_id IN (SELECT id FROM seeker_profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Coaches can update assigned sessions" ON sessions;
CREATE POLICY "Coaches can update assigned sessions" ON sessions FOR UPDATE
  USING (coach_id IN (SELECT id FROM coach_profiles WHERE user_id = auth.uid()));

-- ── journal_entries ──
DROP POLICY IF EXISTS "Seekers can insert journal" ON journal_entries;
CREATE POLICY "Seekers can insert journal" ON journal_entries FOR INSERT
  WITH CHECK (seeker_id IN (SELECT id FROM seeker_profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Seekers can update journal" ON journal_entries;
CREATE POLICY "Seekers can update journal" ON journal_entries FOR UPDATE
  USING (seeker_id IN (SELECT id FROM seeker_profiles WHERE user_id = auth.uid()));

-- ── content ──
DROP POLICY IF EXISTS "Coaches can insert content" ON content;
CREATE POLICY "Coaches can insert content" ON content FOR INSERT
  WITH CHECK (coach_id IN (SELECT id FROM coach_profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Coaches can update own content" ON content;
CREATE POLICY "Coaches can update own content" ON content FOR UPDATE
  USING (coach_id IN (SELECT id FROM coach_profiles WHERE user_id = auth.uid()));

-- ── messages ──
DROP POLICY IF EXISTS "Users can view own messages" ON messages;
CREATE POLICY "Users can view own messages" ON messages FOR SELECT
  USING (auth.uid() IN (sender_id, recipient_id));

DROP POLICY IF EXISTS "Users can send messages" ON messages;
CREATE POLICY "Users can send messages" ON messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

DROP POLICY IF EXISTS "Users can mark messages read" ON messages;
CREATE POLICY "Users can mark messages read" ON messages FOR UPDATE
  USING (auth.uid() = recipient_id);

-- ── notifications (if not already set up) ──
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
    DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
    CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);
    
    DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
    CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id);
    
    DROP POLICY IF EXISTS "System can insert notifications" ON notifications;
    CREATE POLICY "System can insert notifications" ON notifications FOR INSERT WITH CHECK (true);
  END IF;
END $$;

-- ── Verify policies exist ──
SELECT tablename, policyname, cmd FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename, cmd;