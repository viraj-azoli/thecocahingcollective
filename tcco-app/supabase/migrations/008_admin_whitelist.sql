-- =========================================================================
-- 008: Admin whitelist — designate admins by email, before they sign up.
--
-- Idempotent — safe to run more than once.
--
-- WHY THIS EXISTS
--   user_type had to be set by hand in SQL after someone registered, which
--   means every new admin needs a database round-trip and, in between, gets
--   dropped into the seeker experience. Listing the email here instead makes
--   the account an admin the moment it is created.
--
--   Unlike coach_whitelist, this table is NOT publicly readable. The signup
--   path never queries it from the browser — only the SECURITY DEFINER
--   trigger below reads it — so there is no reason to expose who is an admin.
-- =========================================================================

CREATE TABLE IF NOT EXISTS admin_whitelist (
  email TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE admin_whitelist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view admin whitelist" ON admin_whitelist;
CREATE POLICY "Admins can view admin whitelist" ON admin_whitelist
  FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can add admins" ON admin_whitelist;
CREATE POLICY "Admins can add admins" ON admin_whitelist
  FOR INSERT WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can remove admins" ON admin_whitelist;
CREATE POLICY "Admins can remove admins" ON admin_whitelist
  FOR DELETE USING (public.is_admin());

-- Keep emails lowercase so lookups can't miss on capitalisation.
DROP TRIGGER IF EXISTS trg_normalize_admin_email ON admin_whitelist;
CREATE TRIGGER trg_normalize_admin_email
  BEFORE INSERT OR UPDATE ON admin_whitelist
  FOR EACH ROW EXECUTE FUNCTION public.normalize_whitelist_email();


-- ─────────────────────────────────────────────────────────────────────────
-- Resolve user_type at signup: the whitelist wins over whatever the signup
-- form asked for, so an admin can never be demoted by picking "Seeker" on
-- the registration screen.
-- ─────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  resolved_type TEXT;
BEGIN
  IF EXISTS (
    SELECT 1 FROM admin_whitelist WHERE lower(email) = lower(NEW.email)
  ) THEN
    resolved_type := 'admin';
  ELSE
    resolved_type := COALESCE(NEW.raw_user_meta_data->>'user_type', 'seeker');
  END IF;

  INSERT INTO public.users (id, user_type, email)
  VALUES (NEW.id, resolved_type, NEW.email)
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;

  RETURN NEW;
END;
$$;


-- ─────────────────────────────────────────────────────────────────────────
-- Seed the current admins, and promote any that already have an account.
-- ─────────────────────────────────────────────────────────────────────────

INSERT INTO admin_whitelist (email) VALUES
  ('sanika@azoli.in'),
  ('viraj@azoli.in'),
  ('virajpadwal@gmail.com'),
  ('pam@behavioralhealthandlifecoaching.com'),
  ('info@thecoachingcollectiveonline.com')
ON CONFLICT (email) DO NOTHING;

UPDATE users u
   SET user_type = 'admin'
  FROM admin_whitelist w
 WHERE lower(u.email) = lower(w.email)
   AND u.user_type <> 'admin';
