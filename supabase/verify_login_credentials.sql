-- Verify login credentials for all demo users
-- This checks if users exist in auth.users with correct email

SELECT 
  email,
  raw_user_meta_data->>'username' as username,
  raw_user_meta_data->>'role' as role,
  created_at,
  CASE 
    WHEN email = 'farmer@serenagri.com' THEN '✓ Farmer account exists'
    WHEN email = 'buyer@serenagri.com' THEN '✓ Buyer account exists'
    WHEN email = 'supplier@serenagri.com' THEN '✓ Supplier account exists'
    WHEN email = 'logistics@serenagri.com' THEN '✓ Logistics account exists'
    WHEN email = 'finance@serenagri.com' THEN '✓ Finance account exists'
    WHEN email = 'government@serenagri.com' THEN '✓ Government account exists'
    ELSE 'Unknown account'
  END as status
FROM auth.users
WHERE email IN (
  'farmer@serenagri.com',
  'buyer@serenagri.com',
  'supplier@serenagri.com',
  'logistics@serenagri.com',
  'finance@serenagri.com',
  'government@serenagri.com'
)
ORDER BY 
  CASE email
    WHEN 'farmer@serenagri.com' THEN 1
    WHEN 'buyer@serenagri.com' THEN 2
    WHEN 'supplier@serenagri.com' THEN 3
    WHEN 'logistics@serenagri.com' THEN 4
    WHEN 'finance@serenagri.com' THEN 5
    WHEN 'government@serenagri.com' THEN 6
  END;

-- Check which accounts are missing
SELECT 
  role_email,
  CASE 
    WHEN au.email IS NULL THEN '❌ MISSING - Need to create'
    ELSE '✓ EXISTS'
  END as status
FROM (
  VALUES 
    ('farmer@serenagri.com'),
    ('buyer@serenagri.com'),
    ('supplier@serenagri.com'),
    ('logistics@serenagri.com'),
    ('finance@serenagri.com'),
    ('government@serenagri.com')
) AS expected(role_email)
LEFT JOIN auth.users au ON au.email = expected.role_email
ORDER BY role_email;

-- Check profiles for existing users
SELECT 
  au.email,
  p.username,
  p.role,
  CASE 
    WHEN p.id IS NULL THEN '❌ NO PROFILE'
    ELSE '✓ HAS PROFILE'
  END as profile_status
FROM auth.users au
LEFT JOIN public.profiles p ON p.id = au.id
WHERE au.email IN (
  'farmer@serenagri.com',
  'buyer@serenagri.com',
  'supplier@serenagri.com',
  'logistics@serenagri.com',
  'finance@serenagri.com',
  'government@serenagri.com'
)
ORDER BY au.email;

-- Made with Bob
