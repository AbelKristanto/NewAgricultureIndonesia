-- NUCLEAR OPTION: Disable ALL triggers on auth.users table
-- This will completely stop any automatic profile creation

-- 1. List all triggers on auth.users
SELECT 
  tgname as trigger_name,
  tgenabled as enabled,
  CASE tgenabled
    WHEN 'O' THEN '✅ ENABLED'
    WHEN 'D' THEN '❌ DISABLED'
    ELSE 'UNKNOWN'
  END as status
FROM pg_trigger
WHERE tgrelid = 'auth.users'::regclass
  AND tgname NOT LIKE 'pg_%';

-- 2. Disable ALL triggers on auth.users (except system triggers)
DO $$
DECLARE
  trigger_record RECORD;
BEGIN
  FOR trigger_record IN 
    SELECT tgname
    FROM pg_trigger
    WHERE tgrelid = 'auth.users'::regclass
      AND tgname NOT LIKE 'pg_%'
  LOOP
    EXECUTE format('ALTER TABLE auth.users DISABLE TRIGGER %I', trigger_record.tgname);
    RAISE NOTICE 'Disabled trigger: %', trigger_record.tgname;
  END LOOP;
END $$;

-- 3. Verify all triggers are disabled
SELECT 
  tgname as trigger_name,
  CASE tgenabled
    WHEN 'O' THEN '⚠️  STILL ENABLED'
    WHEN 'D' THEN '✅ DISABLED'
    ELSE 'UNKNOWN'
  END as status
FROM pg_trigger
WHERE tgrelid = 'auth.users'::regclass
  AND tgname NOT LIKE 'pg_%';

-- 4. Check if there are any functions with SECURITY DEFINER that might be causing issues
SELECT 
  p.proname as function_name,
  pg_get_functiondef(p.oid) as definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname LIKE '%user%'
  AND prosecdef = true;

-- 5. Ensure all demo users have profiles
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
WHERE p.id IS NULL
  AND au.email LIKE '%@serenagri.com';

-- 6. Final verification
SELECT 
  au.email,
  au.id,
  p.username,
  p.role,
  CASE 
    WHEN p.id IS NOT NULL THEN '✅ HAS PROFILE'
    ELSE '❌ NO PROFILE'
  END as profile_status
FROM auth.users au
LEFT JOIN public.profiles p ON p.id = au.id
WHERE au.email LIKE '%@serenagri.com'
ORDER BY au.email;

-- 7. Check auth schema permissions
SELECT 
  schemaname,
  tablename,
  tableowner,
  hasindexes,
  hasrules,
  hastriggers
FROM pg_tables
WHERE schemaname = 'auth'
  AND tablename = 'users';

-- Made with Bob
