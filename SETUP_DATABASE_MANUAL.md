# 🗄️ Panduan Setup Database Supabase - Serenagri AI

## Langkah 1: Buka Supabase Dashboard

1. Buka browser dan pergi ke: https://supabase.com/dashboard
2. Login dengan akun Anda
3. Pilih project: **netthmwvtmymrrhwspoz** (Serenagri AI)

## Langkah 2: Jalankan Migrasi Database

### 2.1 Buka SQL Editor
1. Di sidebar kiri, klik **"SQL Editor"**
2. Klik tombol **"New query"** (atau gunakan shortcut)

### 2.2 Copy & Paste Migration 001
1. Buka file: `supabase/migrations/001_initial_schema.sql`
2. Copy SEMUA isi file tersebut
3. Paste ke SQL Editor di Supabase
4. Klik tombol **"Run"** (atau tekan Ctrl+Enter / Cmd+Enter)
5. Tunggu sampai muncul pesan sukses: "Success. No rows returned"

### 2.3 Copy & Paste Migration 002
1. Buka file: `supabase/migrations/002_simulation_features.sql`
2. Copy SEMUA isi file tersebut
3. Paste ke SQL Editor di Supabase (query baru)
4. Klik tombol **"Run"**
5. Tunggu sampai muncul pesan sukses

### 2.4 Copy & Paste Migration 003
1. Buka file: `supabase/migrations/003_performance_role_optimization.sql`
2. Copy SEMUA isi file tersebut
3. Paste ke SQL Editor di Supabase (query baru)
4. Klik tombol **"Run"**
5. Tunggu sampai muncul pesan sukses

## Langkah 3: Verifikasi Tabel Sudah Dibuat

1. Di sidebar kiri, klik **"Table Editor"**
2. Anda harus melihat tabel-tabel berikut:
   - ✅ profiles
   - ✅ farmer_analyses
   - ✅ buyer_analyses
   - ✅ policy_analyses
   - ✅ matching_analyses
   - ✅ weather_analyses
   - ✅ chat_conversations
   - ✅ chat_messages
   - ✅ transactions
   - ✅ rate_limits

## Langkah 4: Buat User Demo (Opsional)

### Opsi A: Menggunakan Script (Recommended)
Jalankan di terminal:
```bash
npm run seed:users
```

### Opsi B: Manual via SQL Editor
1. Buka SQL Editor lagi
2. Copy & Paste isi file: `supabase/seed_users.sql`
3. Klik **"Run"**

## Langkah 5: Test Login

Setelah selesai, Anda bisa login dengan kredensial berikut:

| Email | Password | Role |
|-------|----------|------|
| farmer@serenagri.com | farmer123 | Farmer |
| buyer@serenagri.com | buyer123 | Buyer |
| supplier@serenagri.com | supplier123 | Supplier |
| logistics@serenagri.com | logistics123 | Logistics |
| finance@serenagri.com | finance123 | Finance |
| government@serenagri.com | government123 | Government |

## Troubleshooting

### Error: "relation does not exist"
- Pastikan Anda sudah menjalankan SEMUA 3 migrasi (001, 002, 003)
- Cek di Table Editor apakah tabel sudah ada

### Error: "permission denied"
- Pastikan Anda menggunakan service_role key, bukan anon key
- Cek file `.env.local` sudah benar

### Error: "duplicate key value"
- Tabel sudah ada, skip migration yang error
- Atau drop semua tabel dulu lalu jalankan ulang

### Cara Drop Semua Tabel (Reset Database)
Jika ingin mulai dari awal, jalankan SQL ini:
```sql
-- Drop all tables
DROP TABLE IF EXISTS public.rate_limits CASCADE;
DROP TABLE IF EXISTS public.transactions CASCADE;
DROP TABLE IF EXISTS public.weather_analyses CASCADE;
DROP TABLE IF EXISTS public.matching_analyses CASCADE;
DROP TABLE IF EXISTS public.chat_messages CASCADE;
DROP TABLE IF EXISTS public.chat_conversations CASCADE;
DROP TABLE IF EXISTS public.policy_analyses CASCADE;
DROP TABLE IF EXISTS public.buyer_analyses CASCADE;
DROP TABLE IF EXISTS public.farmer_analyses CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Drop triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.update_updated_at();
```

Lalu jalankan ulang migrasi 001, 002, 003.

## Verifikasi Final

Jalankan query ini di SQL Editor untuk memastikan semuanya OK:
```sql
-- Check tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- Check profiles table
SELECT * FROM public.profiles LIMIT 5;
```

## Selesai! 🎉

Sekarang database Anda sudah siap. Jalankan aplikasi:
```bash
npm run dev
```

Buka http://localhost:3000 dan login dengan salah satu kredensial di atas.