-- ============================================================
-- Test Database Connection & Schema
-- Jalankan di Supabase SQL Editor untuk debug
-- ============================================================

-- 1. Check if profiles table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'profiles'
) as profiles_exists;

-- 2. Check table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'profiles'
ORDER BY ordinal_position;

-- 3. Check RLS status
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename = 'profiles';

-- 4. Check RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'profiles';

-- 5. Try to select from profiles (should work with service_role)
SELECT COUNT(*) as profile_count FROM public.profiles;

-- 6. Check if there are any profiles
SELECT id, username, role, created_at 
FROM public.profiles 
LIMIT 5;

-- 7. Check auth.users
SELECT 
  id,
  email,
  email_confirmed_at,
  raw_user_meta_data->>'username' as username,
  raw_user_meta_data->>'role' as role
FROM auth.users
WHERE email LIKE '%@serenagri.com'
LIMIT 5;

-- Made with Bob
