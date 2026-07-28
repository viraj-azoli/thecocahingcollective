-- =========================================================================
-- 006: Align the tier CHECK constraints with the tiers the product sells.
--
-- Idempotent — safe to run more than once.
-- Apply in the Supabase Dashboard SQL editor (or `supabase db push`).
--
-- WHY THIS EXISTS
--   The app sells Discovery (free), Growth ($79/mo) and Mastery ($149/mo).
--   Migration 001 constrained tier to ('Discovery', 'Connection') on both
--   seeker_profiles and subscriptions. 'Connection' is not a tier the
--   product offers, and 'Growth'/'Mastery' were rejected outright — so a
--   successful Stripe checkout would have failed on write.
--
-- BEFORE RUNNING, see what you actually have:
--   SELECT tier, count(*) FROM seeker_profiles GROUP BY tier;
--   SELECT tier, count(*) FROM subscriptions   GROUP BY tier;
-- =========================================================================


-- ─────────────────────────────────────────────────────────────────────────
-- 1. Migrate any legacy 'Connection' rows to 'Discovery'.
--
--    Deliberately mapping to the FREE tier, not to Growth: the Stripe
--    checkout function has never been deployed, so no payment has ever been
--    collected. Any 'Connection' row was assigned without anyone paying for
--    it, and promoting those accounts to a paid tier would hand out paid
--    features for free. Anyone who should be on a paid plan can be moved up
--    by hand afterwards.
-- ─────────────────────────────────────────────────────────────────────────

UPDATE seeker_profiles SET tier = 'Discovery' WHERE tier = 'Connection';
UPDATE subscriptions   SET tier = 'Discovery' WHERE tier = 'Connection';


-- ─────────────────────────────────────────────────────────────────────────
-- 2. Replace the CHECK constraints.
--    The constraint is looked up rather than dropped by name, since an
--    inline CHECK gets an auto-generated name that can differ between
--    environments.
-- ─────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  con RECORD;
BEGIN
  FOR con IN
    SELECT c.conname, c.conrelid::regclass AS tbl
      FROM pg_constraint c
      JOIN pg_attribute a
        ON a.attrelid = c.conrelid
       AND a.attnum = ANY (c.conkey)
     WHERE c.contype = 'c'
       AND a.attname = 'tier'
       AND c.conrelid IN ('seeker_profiles'::regclass, 'subscriptions'::regclass)
  LOOP
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', con.tbl, con.conname);
  END LOOP;
END $$;

ALTER TABLE seeker_profiles
  ADD CONSTRAINT seeker_profiles_tier_check
  CHECK (tier IN ('Discovery', 'Growth', 'Mastery'));

ALTER TABLE subscriptions
  ADD CONSTRAINT subscriptions_tier_check
  CHECK (tier IN ('Discovery', 'Growth', 'Mastery'));


-- ─────────────────────────────────────────────────────────────────────────
-- 3. Verify
-- ─────────────────────────────────────────────────────────────────────────

SELECT conrelid::regclass AS table_name,
       pg_get_constraintdef(oid) AS definition
  FROM pg_constraint
 WHERE conname IN ('seeker_profiles_tier_check', 'subscriptions_tier_check');
