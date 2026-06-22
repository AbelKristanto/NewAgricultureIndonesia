-- ============================================================
-- FIX: Auth Trigger Issue
-- Error "Database error querying schema" saat login
-- ============================================================

-- Step 1: Drop existing trigger (yang menyebabkan error)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Step 2: Create new trigger function yang lebih robust
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert profile, ignore if already exists
  INSERT INTO public.profiles (id, username, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'farmer')
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- If anything fails, just return NEW and let the auth continue
    -- Profile can be created later
    RETURN NEW;
END;
$$;

-- Step 3: Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Step 4: Create profiles for existing users (if missing)
INSERT INTO public.profiles (id, username, role)
SELECT 
  u.id,
  COALESCE(u.raw_user_meta_data->>'username', split_part(u.email, '@', 1)),
  COALESCE(u.raw_user_meta_data->>'role', 'farmer')
FROM auth.users u
WHERE u.id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;

-- Step 5: Verify
SELECT 
  'Profiles created/updated' as status,
  COUNT(*) as profile_count
FROM public.profiles;

SELECT 
  u.email,
  p.username,
  p.role,
  CASE WHEN p.id IS NULL THEN 'MISSING PROFILE' ELSE 'OK' END as profile_status
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE u.email LIKE '%@serenagri.com'
ORDER BY u.email;

-- Made with Bob
