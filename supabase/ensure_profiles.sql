-- Ensure all auth users have profiles
-- This script creates missing profiles for existing users

-- First, let's see what we have
SELECT 
  au.id,
  au.email,
  au.raw_user_meta_data->>'username' as metadata_username,
  au.raw_user_meta_data->>'role' as metadata_role,
  p.username as profile_username,
  p.role as profile_role
FROM auth.users au
LEFT JOIN public.profiles p ON p.id = au.id
ORDER BY au.created_at;

-- Create missing profiles
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

-- Verify all users now have profiles
SELECT 
  COUNT(*) as total_users,
  COUNT(p.id) as users_with_profiles,
  COUNT(*) - COUNT(p.id) as users_without_profiles
FROM auth.users au
LEFT JOIN public.profiles p ON p.id = au.id;

-- Show final state
SELECT 
  au.email,
  p.username,
  p.role
FROM auth.users au
INNER JOIN public.profiles p ON p.id = au.id
ORDER BY p.role, au.email;

-- Made with Bob
