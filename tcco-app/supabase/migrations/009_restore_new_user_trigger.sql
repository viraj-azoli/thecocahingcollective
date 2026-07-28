-- =========================================================================
-- 009: Restore the auth.users -> public.users trigger.
--
-- Idempotent — safe to run more than once.
--
-- WHY THIS EXISTS
--   migration 002 created on_auth_user_created behind an IF NOT EXISTS
--   guard, but the trigger is not present in production — only the
--   function is. Creating a trigger on auth.users needs privileges the
--   dashboard SQL editor doesn't always run with, so the guard most
--   likely swallowed a no-op and nobody noticed.
--
--   Without it, handle_new_user() never fires and the public.users row is
--   created by the browser instead, in AuthContext.signup(). That client
--   insert passes only { id, user_type }, so:
--     * users.email is never populated for new signups
--     * admin_whitelist (migration 008) has no effect — the row is written
--       with whatever role the signup form selected
--   Confirmed by signing up a whitelisted admin address and watching it
--   land on the seeker dashboard with a NULL email.
-- =========================================================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill anything the missing trigger left behind: emails that were never
-- copied across, and whitelisted admins who registered as seekers.
UPDATE public.users u
   SET email = a.email
  FROM auth.users a
 WHERE a.id = u.id
   AND u.email IS DISTINCT FROM a.email;

UPDATE public.users u
   SET user_type = 'admin'
  FROM admin_whitelist w
 WHERE lower(u.email) = lower(w.email)
   AND u.user_type <> 'admin';
