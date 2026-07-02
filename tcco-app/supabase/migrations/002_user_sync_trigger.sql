-- 1. Create auto-sync trigger from auth.users to public.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, user_type)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'user_type', 'seeker')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if trigger already exists before creating
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created') THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
  END IF;
END $$;

-- 2. Add missing client RLS policies for profile management
-- Users table update policy
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'users' AND policyname = 'Users can update their own profile'
  ) THEN
    CREATE POLICY "Users can update their own profile" ON users FOR UPDATE USING (auth.uid() = id);
  END IF;
END $$;

-- Seeker profiles insert policy
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'seeker_profiles' AND policyname = 'Users can insert their own seeker profile'
  ) THEN
    CREATE POLICY "Users can insert their own seeker profile" ON seeker_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Seeker profiles update policy
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'seeker_profiles' AND policyname = 'Users can update their own seeker profile'
  ) THEN
    CREATE POLICY "Users can update their own seeker profile" ON seeker_profiles FOR UPDATE USING (auth.uid() = user_id);
  END IF;
END $$;

-- Coach profiles insert policy
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'coach_profiles' AND policyname = 'Users can insert their own coach profile'
  ) THEN
    CREATE POLICY "Users can insert their own coach profile" ON coach_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Coach profiles update policy
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'coach_profiles' AND policyname = 'Users can update their own coach profile'
  ) THEN
    CREATE POLICY "Users can update their own coach profile" ON coach_profiles FOR UPDATE USING (auth.uid() = user_id);
  END IF;
END $$;
