-- =========================================================================
-- 005: Admin platform access, coach whitelist management, and the half of
--      migration 004 that never ran.
--
-- Idempotent — safe to run more than once.
-- Apply in the Supabase Dashboard SQL editor (or `supabase db push`).
--
-- WHY THIS EXISTS
--   The admin pages were built against tables that RLS never let an admin
--   read or write. There is not a single admin policy in migrations 001-004,
--   so today an admin sees 0 sessions, 0 journal entries and cannot actually
--   verify a coach (the UPDATE silently matches 0 rows and reports success).
--   This migration grants admins the access those pages already assume.
-- =========================================================================


-- ─────────────────────────────────────────────────────────────────────────
-- 1. is_admin() helper
--    SECURITY DEFINER so it bypasses RLS on public.users. That matters:
--    without it, a policy ON users that checks users would recurse.
-- ─────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND user_type = 'admin'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;


-- ─────────────────────────────────────────────────────────────────────────
-- 2. Admin read/write policies for the tables the admin pages query
--    Note: journal_entries is deliberately NOT included. Admins get counts
--    through the RPCs in section 4 instead, so nobody's private journal
--    text becomes readable just to render a number on a dashboard.
-- ─────────────────────────────────────────────────────────────────────────

-- users — needed to list accounts and to look up a coach's email
DROP POLICY IF EXISTS "Admins can view all users" ON users;
CREATE POLICY "Admins can view all users" ON users
  FOR SELECT USING (public.is_admin());

-- sessions — dashboard, analytics and the sessions page all read these
DROP POLICY IF EXISTS "Admins can view all sessions" ON sessions;
CREATE POLICY "Admins can view all sessions" ON sessions
  FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can update sessions" ON sessions;
CREATE POLICY "Admins can update sessions" ON sessions
  FOR UPDATE USING (public.is_admin());

-- coach_profiles — this is what makes the Verify button actually work
DROP POLICY IF EXISTS "Admins can update coach profiles" ON coach_profiles;
CREATE POLICY "Admins can update coach profiles" ON coach_profiles
  FOR UPDATE USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete coach profiles" ON coach_profiles;
CREATE POLICY "Admins can delete coach profiles" ON coach_profiles
  FOR DELETE USING (public.is_admin());

-- subscriptions — analytics revenue figures
DROP POLICY IF EXISTS "Admins can view subscriptions" ON subscriptions;
CREATE POLICY "Admins can view subscriptions" ON subscriptions
  FOR SELECT USING (public.is_admin());


-- ─────────────────────────────────────────────────────────────────────────
-- 3. Coach whitelist management
--    004 created the table with a public SELECT policy but no way to write
--    to it, so the only way to whitelist a coach was hand-written SQL.
-- ─────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Admins can add to whitelist" ON coach_whitelist;
CREATE POLICY "Admins can add to whitelist" ON coach_whitelist
  FOR INSERT WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can remove from whitelist" ON coach_whitelist;
CREATE POLICY "Admins can remove from whitelist" ON coach_whitelist
  FOR DELETE USING (public.is_admin());

-- Store whitelist emails lowercase so the signup lookup (which lowercases
-- its input) can never miss a row because of how it was typed in.
CREATE OR REPLACE FUNCTION public.normalize_whitelist_email()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.email := lower(trim(NEW.email));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_normalize_whitelist_email ON coach_whitelist;
CREATE TRIGGER trg_normalize_whitelist_email
  BEFORE INSERT OR UPDATE ON coach_whitelist
  FOR EACH ROW EXECUTE FUNCTION public.normalize_whitelist_email();

UPDATE coach_whitelist
   SET email = lower(trim(email))
 WHERE email <> lower(trim(email));


-- ─────────────────────────────────────────────────────────────────────────
-- 4. Counts-only RPCs
--    These are SECURITY DEFINER and gated on is_admin(), so they can count
--    private rows without exposing their contents.
-- ─────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.admin_platform_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  RETURN json_build_object(
    'seeker_count',  (SELECT count(*) FROM seeker_profiles),
    'coach_count',   (SELECT count(*) FROM coach_profiles),
    'session_count', (SELECT count(*) FROM sessions),
    'journal_count', (SELECT count(*) FROM journal_entries)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_platform_stats() TO authenticated;


CREATE OR REPLACE FUNCTION public.admin_journal_counts()
RETURNS TABLE (seeker_id UUID, entry_count BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
    SELECT j.seeker_id, count(*)::BIGINT
      FROM journal_entries j
     GROUP BY j.seeker_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_journal_counts() TO authenticated;


-- ─────────────────────────────────────────────────────────────────────────
-- 5. users.email
--    public.users had no email column, so the admin UI had no way to reach
--    a coach. AdminCoachesPage was reading coach.contact_email / coach.email
--    off coach_profiles — neither column has ever existed, which is why the
--    verification email never sent.
-- ─────────────────────────────────────────────────────────────────────────

ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT;

-- Backfill from auth.users
UPDATE users u
   SET email = a.email
  FROM auth.users a
 WHERE a.id = u.id
   AND u.email IS DISTINCT FROM a.email;

-- Keep it populated for new signups. Replaces the version from migration 002.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, user_type, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'user_type', 'seeker'),
    NEW.email
  )
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
  RETURN NEW;
END;
$$;

-- And keep it in sync if the user later changes their email
CREATE OR REPLACE FUNCTION public.sync_user_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.users SET email = NEW.email WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_email_changed ON auth.users;
CREATE TRIGGER on_auth_user_email_changed
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW
  WHEN (OLD.email IS DISTINCT FROM NEW.email)
  EXECUTE FUNCTION public.sync_user_email();


-- ─────────────────────────────────────────────────────────────────────────
-- 6. community_posts
--    Section 2 of migration 004 was never applied — the table does not
--    exist in production, so the seeker Community page fails on both read
--    and write. This is that section, unchanged, plus admin moderation.
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS community_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  author_role TEXT NOT NULL DEFAULT 'Member',
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 4000),
  tag TEXT NOT NULL DEFAULT '#community',
  likes_count INT NOT NULL DEFAULT 0,
  replies_count INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'published', -- published | removed (moderation)
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_community_posts_created
  ON community_posts (created_at DESC);

ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read posts" ON community_posts;
CREATE POLICY "Authenticated users can read posts" ON community_posts
  FOR SELECT USING (auth.role() = 'authenticated' AND status = 'published');

DROP POLICY IF EXISTS "Users can create own posts" ON community_posts;
CREATE POLICY "Users can create own posts" ON community_posts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own posts" ON community_posts;
CREATE POLICY "Users can delete own posts" ON community_posts
  FOR DELETE USING (auth.uid() = user_id);

-- Moderation
DROP POLICY IF EXISTS "Admins can view all posts" ON community_posts;
CREATE POLICY "Admins can view all posts" ON community_posts
  FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can moderate posts" ON community_posts;
CREATE POLICY "Admins can moderate posts" ON community_posts
  FOR UPDATE USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete any post" ON community_posts;
CREATE POLICY "Admins can delete any post" ON community_posts
  FOR DELETE USING (public.is_admin());


-- ─────────────────────────────────────────────────────────────────────────
-- 7. Confirm the whitelist enforcement trigger from 004 is in place.
--    coach_whitelist exists in production but the trigger may not — it was
--    in the same migration as community_posts, which did not run.
-- ─────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION enforce_coach_whitelist()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  signup_email TEXT;
BEGIN
  IF NEW.user_type = 'coach' THEN
    SELECT lower(email) INTO signup_email FROM auth.users WHERE id = NEW.id;
    IF signup_email IS NULL OR NOT EXISTS (
      SELECT 1 FROM coach_whitelist WHERE lower(email) = signup_email
    ) THEN
      RAISE EXCEPTION 'This email is not authorized to register as a coach.'
        USING ERRCODE = 'P0001';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_coach_whitelist ON users;
CREATE TRIGGER trg_enforce_coach_whitelist
  BEFORE INSERT OR UPDATE OF user_type ON users
  FOR EACH ROW
  EXECUTE FUNCTION enforce_coach_whitelist();
