-- =========================================================================
-- Migration: Fix seeker_profiles infinite recursion policy & add missing bio
-- =========================================================================

-- 1. Alter seeker_profiles to add the missing bio column
ALTER TABLE seeker_profiles ADD COLUMN IF NOT EXISTS bio TEXT;

-- 2. Drop the recursive policy that causes infinite loop select on seeker_profiles
DROP POLICY IF EXISTS "Coaches can view assigned seeker profiles" ON seeker_profiles;

-- 3. Create a clean, non-recursive SELECT policy for seeker_profiles
-- Any authenticated user (seekers & coaches) can view seeker profiles safely
DROP POLICY IF EXISTS "Authenticated users can view seeker profiles" ON seeker_profiles;
CREATE POLICY "Authenticated users can view seeker profiles" 
ON seeker_profiles FOR SELECT 
TO authenticated 
USING (true);
