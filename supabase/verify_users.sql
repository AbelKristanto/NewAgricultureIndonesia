-- Verify users exist in auth.users
SELECT 
  id,
  email,
  email_confirmed_at,
  raw_user_meta_data->>'username' as username,
  raw_user_meta_data->>'role' as role,
  created_at
FROM auth.users
WHERE email LIKE '%@serenagri.com'
ORDER BY email;

-- Verify identities exist
SELECT 
  i.id,
  i.provider,
  i.provider_id as email,
  u.email as user_email
FROM auth.identities i
JOIN auth.users u ON i.user_id = u.id
WHERE u.email LIKE '%@serenagri.com'
ORDER BY u.email;

-- Verify profiles exist
SELECT 
  p.id,
  p.username,
  p.role,
  u.email
FROM public.profiles p
JOIN auth.users u ON p.id = u.id
WHERE u.email LIKE '%@serenagri.com'
ORDER BY u.email;

-- Made with Bob
