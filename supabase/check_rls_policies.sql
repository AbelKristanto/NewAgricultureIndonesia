-- Check RLS policies on profiles table
-- RLS might be blocking the trigger from inserting profiles

-- 1. Check if RLS is enabled on profiles
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled,
  CASE 
    WHEN rowsecurity THEN '⚠️  RLS IS ENABLED'
    ELSE '✅ RLS IS DISABLED'
  END as status
FROM pg_tables
WHERE tablename = 'profiles';

-- 2. List all policies on profiles table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd as command,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies
WHERE tablename = 'profiles';

-- 3. Check table owner and permissions
SELECT 
  t.schemaname,
  t.tablename,
  t.tableowner,
  has_table_privilege('authenticated', 'public.profiles', 'SELECT') as can_select,
  has_table_privilege('authenticated', 'public.profiles', 'INSERT') as can_insert,
  has_table_privilege('authenticated', 'public.profiles', 'UPDATE') as can_update,
  has_table_privilege('service_role', 'public.profiles', 'SELECT') as service_can_select,
  has_table_privilege('service_role', 'public.profiles', 'INSERT') as service_can_insert
FROM pg_tables t
WHERE t.tablename = 'profiles';

-- 4. Try to disable RLS temporarily to test
-- WARNING: This will allow anyone to read/write profiles
-- Only do this for testing, then re-enable it
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- 5. Verify RLS is disabled
SELECT 
  tablename,
  rowsecurity as rls_enabled,
  CASE 
    WHEN rowsecurity THEN '⚠️  RLS STILL ENABLED'
    ELSE '✅ RLS NOW DISABLED'
  END as status
FROM pg_tables
WHERE tablename = 'profiles';

-- 6. Now test if we can insert a profile manually
-- This simulates what the trigger does
DO $$
DECLARE
  test_user_id uuid;
BEGIN
  -- Get a test user ID
  SELECT id INTO test_user_id
  FROM auth.users
  WHERE email = 'farmer@serenagri.com'
  LIMIT 1;
  
  IF test_user_id IS NOT NULL THEN
    -- Try to insert/update profile
    INSERT INTO public.profiles (id, username, role, created_at, updated_at)
    VALUES (
      test_user_id,
      'test_farmer',
      'farmer',
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      username = EXCLUDED.username,
      updated_at = NOW();
    
    RAISE NOTICE 'Successfully inserted/updated profile for user %', test_user_id;
  ELSE
    RAISE NOTICE 'No test user found';
  END IF;
END $$;

-- 7. Check if the insert worked
SELECT 
  au.email,
  p.username,
  p.role,
  p.updated_at
FROM auth.users au
INNER JOIN public.profiles p ON p.id = au.id
WHERE au.email = 'farmer@serenagri.com';

-- Made with Bob
