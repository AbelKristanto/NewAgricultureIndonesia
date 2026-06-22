-- Diagnose Auth Schema Issues
-- Check if there are fundamental problems with the auth schema

-- 1. Check if auth schema exists
SELECT 
  'Auth Schema' as check_type,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'auth') 
    THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status;

-- 2. Check if auth.users table exists
SELECT 
  'Auth Users Table' as check_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'auth' AND table_name = 'users'
    )
    THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status;

-- 3. Check auth.users table structure
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'auth' 
  AND table_name = 'users'
ORDER BY ordinal_position;

-- 4. Try to query auth.users directly
SELECT 
  'Direct Query Test' as test_type,
  COUNT(*) as user_count,
  '✅ Can query auth.users' as status
FROM auth.users;

-- 5. Check for any locks on auth.users
SELECT 
  locktype,
  relation::regclass,
  mode,
  granted
FROM pg_locks
WHERE relation = 'auth.users'::regclass;

-- 6. Check auth schema permissions
SELECT 
  nspname as schema_name,
  nspowner::regrole as owner,
  has_schema_privilege('authenticated', nspname, 'USAGE') as authenticated_can_use,
  has_schema_privilege('service_role', nspname, 'USAGE') as service_role_can_use
FROM pg_namespace
WHERE nspname = 'auth';

-- 7. Check if there are any broken triggers or functions
SELECT 
  p.proname as function_name,
  pg_get_functiondef(p.oid) as definition,
  CASE 
    WHEN p.proname LIKE '%user%' THEN '⚠️  User-related function'
    ELSE 'Other'
  END as relevance
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname IN ('auth', 'public')
  AND p.proname LIKE '%user%'
ORDER BY n.nspname, p.proname;

-- 8. Check Supabase extensions
SELECT 
  extname as extension_name,
  extversion as version,
  CASE 
    WHEN extname IN ('pg_net', 'pgsodium', 'supabase_vault') THEN '✅ Supabase extension'
    ELSE 'Other'
  END as type
FROM pg_extension
WHERE extname IN ('pg_net', 'pgsodium', 'supabase_vault', 'uuid-ossp', 'pgcrypto')
ORDER BY extname;

-- 9. Try to count users (this might fail if there's a schema issue)
DO $$
DECLARE
  user_count integer;
BEGIN
  SELECT COUNT(*) INTO user_count FROM auth.users;
  RAISE NOTICE 'Successfully counted % users in auth.users', user_count;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'ERROR counting users: % %', SQLERRM, SQLSTATE;
END $$;

-- 10. Check if we can access user metadata
SELECT 
  id,
  email,
  raw_user_meta_data,
  created_at
FROM auth.users
LIMIT 5;

-- Made with Bob
