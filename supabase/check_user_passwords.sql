-- Check if demo users exist and can authenticate
-- This will help us understand if the issue is with user creation or authentication

-- 1. Check if users exist in auth.users
SELECT 
  email,
  id,
  created_at,
  email_confirmed_at,
  CASE 
    WHEN encrypted_password IS NOT NULL THEN '✅ Has Password'
    ELSE '❌ No Password'
  END as password_status,
  raw_user_meta_data->>'username' as username,
  raw_user_meta_data->>'role' as role
FROM auth.users
WHERE email IN (
  'farmer@serenagri.com',
  'buyer@serenagri.com',
  'supplier@serenagri.com',
  'logistics@serenagri.com',
  'finance@serenagri.com',
  'government@serenagri.com'
)
ORDER BY email;

-- 2. Check profiles
SELECT 
  au.email,
  p.id,
  p.username,
  p.role,
  CASE 
    WHEN p.id IS NOT NULL THEN '✅ Has Profile'
    ELSE '❌ No Profile'
  END as profile_status
FROM auth.users au
LEFT JOIN public.profiles p ON p.id = au.id
WHERE au.email LIKE '%@serenagri.com'
ORDER BY au.email;

-- 3. Check if email is confirmed (might be required for login)
SELECT 
  email,
  CASE 
    WHEN email_confirmed_at IS NOT NULL THEN '✅ Email Confirmed'
    ELSE '❌ Email NOT Confirmed'
  END as email_status,
  email_confirmed_at
FROM auth.users
WHERE email LIKE '%@serenagri.com'
ORDER BY email;

-- 4. List all triggers on auth.users (we can't disable them but we can see them)
SELECT 
  tgname as trigger_name,
  CASE tgenabled
    WHEN 'O' THEN 'ENABLED'
    WHEN 'D' THEN 'DISABLED'
    ELSE 'UNKNOWN'
  END as status,
  pg_get_triggerdef(oid) as definition
FROM pg_trigger
WHERE tgrelid = 'auth.users'::regclass
  AND tgname NOT LIKE 'pg_%'
  AND tgname NOT LIKE 'RI_%';

-- 5. Check the handle_new_user function
SELECT 
  proname as function_name,
  prosrc as source_code
FROM pg_proc
WHERE proname = 'handle_new_user';

-- Made with Bob
