-- ============================================================
-- Serenagri AI - Seed Dummy Users (satu per role)
-- ============================================================
-- Jalankan di Supabase Dashboard > SQL Editor
-- ============================================================

-- Hapus user lama jika ada (agar bisa re-run tanpa error)
DELETE FROM auth.users WHERE email IN (
  'farmer@serenagri.com',
  'buyer@serenagri.com',
  'supplier@serenagri.com',
  'logistics@serenagri.com',
  'finance@serenagri.com',
  'government@serenagri.com'
);

-- Farmer
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'farmer@serenagri.com',
  crypt('farmer123', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"username":"Pak Tani","role":"farmer"}',
  now(), now()
);

-- Buyer
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'buyer@serenagri.com',
  crypt('buyer123', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"username":"Bu Pembeli","role":"buyer"}',
  now(), now()
);

-- Supplier
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'supplier@serenagri.com',
  crypt('supplier123', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"username":"Pak Supplier","role":"supplier"}',
  now(), now()
);

-- Logistics
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'logistics@serenagri.com',
  crypt('logistics123', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"username":"Bu Logistik","role":"logistics"}',
  now(), now()
);

-- Finance
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'finance@serenagri.com',
  crypt('finance123', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"username":"Pak Finance","role":"finance"}',
  now(), now()
);

-- Government
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'government@serenagri.com',
  crypt('government123', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"username":"Bu Pemerintah","role":"government"}',
  now(), now()
);

-- Insert identities (wajib agar login email bisa jalan)
INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
SELECT gen_random_uuid(), id, email,
  jsonb_build_object('sub', id::text, 'email', email),
  'email', now(), now(), now()
FROM auth.users
WHERE email IN (
  'farmer@serenagri.com',
  'buyer@serenagri.com',
  'supplier@serenagri.com',
  'logistics@serenagri.com',
  'finance@serenagri.com',
  'government@serenagri.com'
);

-- ============================================================
-- DAFTAR LOGIN:
-- ============================================================
-- | Email                         | Password       | Role       |
-- |-------------------------------|----------------|------------|
-- | farmer@serenagri.com          | farmer123      | farmer     |
-- | buyer@serenagri.com           | buyer123       | buyer      |
-- | supplier@serenagri.com        | supplier123    | supplier   |
-- | logistics@serenagri.com       | logistics123   | logistics  |
-- | finance@serenagri.com         | finance123     | finance    |
-- | government@serenagri.com      | government123  | government |
-- ============================================================
