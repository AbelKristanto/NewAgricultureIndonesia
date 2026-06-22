-- FINAL FIX: Completely remove the problematic trigger and function
-- This will allow users to login without the schema error

-- 1. Drop the trigger completely
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 2. Drop the function
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- 3. Create a new, simpler function with correct search_path
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, role, created_at, updated_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'farmer'),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the auth
    RAISE WARNING 'Error creating profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- 4. Recreate the trigger (optional - comment out if you want to keep it disabled)
-- CREATE TRIGGER on_auth_user_created
--   AFTER INSERT ON auth.users
--   FOR EACH ROW
--   EXECUTE FUNCTION public.handle_new_user();

-- 5. Ensure all existing users have profiles
INSERT INTO public.profiles (id, username, role, created_at, updated_at)
SELECT 
  au.id,
  COALESCE(
    au.raw_user_meta_data->>'username',
    split_part(au.email, '@', 1)
  ) as username,
  COALESCE(
    au.raw_user_meta_data->>'role',
    'farmer'
  ) as role,
  NOW() as created_at,
  NOW() as updated_at
FROM auth.users au
LEFT JOIN public.profiles p ON p.id = au.id
WHERE p.id IS NULL;

-- 6. Verify the fix
SELECT 
  'Trigger Status' as check_type,
  CASE 
    WHEN COUNT(*) > 0 THEN '⚠️  TRIGGER IS ACTIVE'
    ELSE '✅ TRIGGER IS DISABLED'
  END as status
FROM pg_trigger
WHERE tgname = 'on_auth_user_created';

-- 7. Verify all users have profiles
SELECT 
  'Profile Coverage' as check_type,
  COUNT(DISTINCT au.id) as total_users,
  COUNT(DISTINCT p.id) as users_with_profiles,
  CASE 
    WHEN COUNT(DISTINCT au.id) = COUNT(DISTINCT p.id) THEN '✅ ALL USERS HAVE PROFILES'
    ELSE '❌ SOME USERS MISSING PROFILES'
  END as status
FROM auth.users au
LEFT JOIN public.profiles p ON p.id = au.id;

-- 8. Show all demo users
SELECT 
  au.email,
  p.username,
  p.role,
  CASE 
    WHEN p.id IS NOT NULL THEN '✅'
    ELSE '❌'
  END as has_profile
FROM auth.users au
LEFT JOIN public.profiles p ON p.id = au.id
WHERE au.email LIKE '%@serenagri.com'
ORDER BY au.email;

-- Made with Bob
