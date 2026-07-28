-- =========================================================================
-- 007: Per-session payments via Stripe Connect direct charges.
--
-- Idempotent — safe to run more than once.
-- Apply in the Supabase Dashboard SQL editor (or `supabase db push`).
--
-- MODEL
--   Seekers pay coaches for each session. The charge is created ON the
--   coach's connected account (a direct charge), so the coach is merchant
--   of record and the money never passes through a TCCO balance. There is
--   no platform fee.
--
--   Booking is therefore payment-first: a session row is created as
--   'pending_payment', the seeker is sent to Stripe Checkout, and the
--   webhook promotes the row to 'scheduled' once payment succeeds.
--   Previously the booking flow wrote amount_paid straight to the session
--   without any charge ever being made.
-- =========================================================================


-- ─────────────────────────────────────────────────────────────────────────
-- 1. sessions: allow the pending_payment state
-- ─────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  con RECORD;
BEGIN
  FOR con IN
    SELECT c.conname
      FROM pg_constraint c
      JOIN pg_attribute a
        ON a.attrelid = c.conrelid
       AND a.attnum = ANY (c.conkey)
     WHERE c.contype = 'c'
       AND a.attname = 'status'
       AND c.conrelid = 'sessions'::regclass
  LOOP
    EXECUTE format('ALTER TABLE sessions DROP CONSTRAINT %I', con.conname);
  END LOOP;
END $$;

ALTER TABLE sessions
  ADD CONSTRAINT sessions_status_check
  CHECK (status IN (
    'pending_payment',  -- awaiting Stripe Checkout completion
    'scheduled',
    'in_progress',
    'completed',
    'cancelled',
    'no_show'
  ));


-- ─────────────────────────────────────────────────────────────────────────
-- 2. sessions: payment bookkeeping
--    stripe_checkout_session_id is UNIQUE so a replayed webhook cannot
--    double-apply a payment.
-- ─────────────────────────────────────────────────────────────────────────

ALTER TABLE sessions ADD COLUMN IF NOT EXISTS stripe_checkout_session_id TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS stripe_payment_intent_id   TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS paid_at                    TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS idx_sessions_checkout_session
  ON sessions (stripe_checkout_session_id)
  WHERE stripe_checkout_session_id IS NOT NULL;

-- Used to expire abandoned checkouts and to find a coach's booked slots.
CREATE INDEX IF NOT EXISTS idx_sessions_coach_date_status
  ON sessions (coach_id, scheduled_date, status);


-- ─────────────────────────────────────────────────────────────────────────
-- 3. coach_profiles: Stripe readiness
--    A coach cannot be booked until Stripe has enabled charges on their
--    connected account. These are mirrored from Stripe by the
--    account.updated webhook so the UI doesn't have to call Stripe.
-- ─────────────────────────────────────────────────────────────────────────

ALTER TABLE coach_profiles ADD COLUMN IF NOT EXISTS stripe_charges_enabled BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE coach_profiles ADD COLUMN IF NOT EXISTS stripe_payouts_enabled BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_coach_profiles_stripe_account
  ON coach_profiles (stripe_account_id)
  WHERE stripe_account_id IS NOT NULL;


-- ─────────────────────────────────────────────────────────────────────────
-- 4. Seekers must be able to create their own pending session, and to read
--    it back after returning from Stripe. The existing policies from 002
--    already cover insert/select by seeker_id; this just makes sure a
--    seeker can cancel a checkout they abandoned.
-- ─────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Seekers can delete own pending sessions" ON sessions;
CREATE POLICY "Seekers can delete own pending sessions" ON sessions
  FOR DELETE USING (
    status = 'pending_payment'
    AND seeker_id IN (SELECT id FROM seeker_profiles WHERE user_id = auth.uid())
  );


-- ─────────────────────────────────────────────────────────────────────────
-- 5. Housekeeping: release slots held by abandoned checkouts.
--    Checkout sessions are created with a 30 minute expiry; anything still
--    pending well past that will never be paid. Stripe also fires
--    checkout.session.expired, which the webhook handles — this is the
--    backstop for events that never arrive.
-- ─────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.expire_stale_pending_sessions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  removed INTEGER;
BEGIN
  DELETE FROM sessions
   WHERE status = 'pending_payment'
     AND created_at < now() - INTERVAL '1 hour';
  GET DIAGNOSTICS removed = ROW_COUNT;
  RETURN removed;
END;
$$;
