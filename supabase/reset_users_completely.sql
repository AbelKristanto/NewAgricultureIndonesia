-- COMPLETE RESET: Delete all demo users and recreate them properly
-- This will ensure clean state without any lingering issues

-- 1. First, delete all profiles for demo users
DELETE FROM public.profiles
WHERE id IN (
  SELECT id FROM auth.users
  WHERE email LIKE '%@serenagri.com'
);

-- 2. Delete all demo users from auth.users
-- Note: This requires service_role permissions
DELETE FROM auth.users
WHERE email IN (
  'farmer@serenagri.com',
  'buyer@serenagri.com',
  'supplier@serenagri.com',
  'logistics@serenagri.com',
  'finance@serenagri.com',
  'government@serenagri.com'
);

-- 3. Verify deletion
SELECT 
  'Users Deleted' as status,
  COUNT(*) as remaining_demo_users
FROM auth.users
WHERE email LIKE '%@serenagri.com';

-- 4. Now we need to create users using Supabase Admin API
-- We cannot create auth.users directly via SQL for security reasons
-- Instead, let's prepare the data and use the signup endpoint

-- Show instructions
SELECT '
⚠️  IMPORTANT: Cannot create auth.users directly via SQL.

Please use one of these methods:

METHOD 1: Use Supabase Dashboard
1. Go to Authentication → Users
2. Click "Add User" button
3. Create each user manually with:
   - Email: farmer@serenagri.com, Password: farmer123
   - Email: buyer@serenagri.com, Password: buyer123
   - Email: supplier@serenagri.com, Password: supplier123
   - Email: logistics@serenagri.com, Password: logistics123
   - Email: finance@serenagri.com, Password: finance123
   - Email: government@serenagri.com, Password: government123
4. For each user, set User Metadata:
   {"username": "farmer", "role": "farmer"}
   (adjust for each role)

METHOD 2: Use the seed script
Run: node scripts/seed-users.mjs

METHOD 3: Use Supabase CLI
Run: supabase db reset (if you have migrations)

' as instructions;

-- Made with Bob
