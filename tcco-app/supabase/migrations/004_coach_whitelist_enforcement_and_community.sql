-- 004: Server-side coach whitelist enforcement + real community posts table.
-- Idempotent — safe to run more than once.
--
-- Apply via the Supabase Dashboard SQL editor (or `supabase db push`).
-- Until this runs, the coach whitelist is only checked client-side and
-- community posts are not persisted.

-- ─────────────────────────────────────────────────────────────────────────
-- 1. Coach whitelist enforcement
--    The signup flow checks coach_whitelist in the browser, but anyone
--    calling the API directly could insert a users row with
--    user_type='coach'. This trigger enforces the same rule in the DB.
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS coach_whitelist (
  email TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE coach_whitelist ENABLE ROW LEVEL SECURITY;

-- Signup needs to read the whitelist before the user is authenticated.
-- Exposing which emails are whitelisted is acceptable for this product;
-- restrict to authenticated-only if that changes.
DROP POLICY IF EXISTS "Anyone can check whitelist" ON coach_whitelist;
CREATE POLICY "Anyone can check whitelist" ON coach_whitelist
  FOR SELECT USING (true);

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

-- ─────────────────────────────────────────────────────────────────────────
-- 2. Community posts
--    The Community page previously wrote to the content table with columns
--    that don't exist there. Give it a real table.
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
