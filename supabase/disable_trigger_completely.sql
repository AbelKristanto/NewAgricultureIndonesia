-- ============================================================
-- DISABLE AUTH TRIGGER COMPLETELY
-- Kita akan buat profile manual dari aplikasi
-- ============================================================

-- Step 1: Drop trigger completely
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Step 2: Ensure all existing users have profiles
INSERT INTO public.profiles (id, username, role)
SELECT 
  u.id,
  COALESCE(u.raw_user_meta_data->>'username', split_part(u.email, '@', 1)),
  COALESCE(u.raw_user_meta_data->>'role', 'farmer')
FROM auth.users u
WHERE u.id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;

-- Step 3: Verify all users have profiles
SELECT 
  u.email,
  p.username,
  p.role,
  CASE 
    WHEN p.id IS NULL THEN '❌ MISSING' 
    ELSE '✅ OK' 
  END as status
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE u.email LIKE '%@serenagri.com'
ORDER BY u.email;

-- Step 4: Count
SELECT 
  COUNT(*) FILTER (WHERE p.id IS NOT NULL) as profiles_ok,
  COUNT(*) FILTER (WHERE p.id IS NULL) as profiles_missing,
  COUNT(*) as total_users
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE u.email LIKE '%@serenagri.com';

-- Made with Bob
