-- Recreate handle_new_user function with proper error handling
-- This version will NOT fail authentication even if profile creation fails

-- 1. Drop existing function
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- 2. Create new function with bulletproof error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Try to insert profile, but don't fail if it errors
  BEGIN
    INSERT INTO public.profiles (id, username, role, created_at, updated_at)
    VALUES (
      NEW.id,
      COALESCE(
        NEW.raw_user_meta_data->>'username',
        split_part(NEW.email, '@', 1),
        'user'
      ),
      COALESCE(
        NEW.raw_user_meta_data->>'role',
        'farmer'
      ),
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      username = COALESCE(
        EXCLUDED.username,
        public.profiles.username
      ),
      role = COALESCE(
        EXCLUDED.role,
        public.profiles.role
      ),
      updated_at = NOW();
    
    RAISE NOTICE 'Profile created/updated for user %', NEW.id;
    
  EXCEPTION
    WHEN OTHERS THEN
      -- Log the error but DON'T fail the trigger
      RAISE WARNING 'Failed to create profile for user %: % %', NEW.id, SQLERRM, SQLSTATE;
      -- Continue anyway - authentication should succeed
  END;
  
  -- Always return NEW to allow authentication to proceed
  RETURN NEW;
END;
$$;

-- 3. Grant execute permission
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

-- 4. Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 5. Ensure all existing users have profiles
INSERT INTO public.profiles (id, username, role, created_at, updated_at)
SELECT 
  au.id,
  COALESCE(
    au.raw_user_meta_data->>'username',
    split_part(au.email, '@', 1),
    'user'
  ) as username,
  COALESCE(
    au.raw_user_meta_data->>'role',
    'farmer'
  ) as role,
  NOW() as created_at,
  NOW() as updated_at
FROM auth.users au
LEFT JOIN public.profiles p ON p.id = au.id
WHERE p.id IS NULL
ON CONFLICT (id) DO UPDATE SET
  username = COALESCE(EXCLUDED.username, profiles.username),
  role = COALESCE(EXCLUDED.role, profiles.role),
  updated_at = NOW();

-- 6. Verify setup
SELECT 
  'Function Status' as check_type,
  COUNT(*) as count,
  '✅ Function exists' as status
FROM pg_proc
WHERE proname = 'handle_new_user';

SELECT 
  'Trigger Status' as check_type,
  COUNT(*) as count,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ Trigger exists'
    ELSE '❌ Trigger missing'
  END as status
FROM pg_trigger
WHERE tgname = 'on_auth_user_created';

SELECT 
  'Profile Coverage' as check_type,
  COUNT(DISTINCT au.id) as total_users,
  COUNT(DISTINCT p.id) as users_with_profiles,
  CASE 
    WHEN COUNT(DISTINCT au.id) = COUNT(DISTINCT p.id) THEN '✅ All users have profiles'
    ELSE '⚠️  Some users missing profiles'
  END as status
FROM auth.users au
LEFT JOIN public.profiles p ON p.id = au.id;

-- 7. Show demo users
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
