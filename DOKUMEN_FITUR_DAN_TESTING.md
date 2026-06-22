# Dokumen Fitur, Mekanisme Testing, dan Penggunaan

Dokumen ini menjelaskan cara menjalankan demo Serenagri AI, akun login untuk setiap role, fitur yang bisa diuji, dan checklist testing untuk memastikan dashboard, history, transaksi, serta akses role berjalan sesuai kapabilitas akun.

## Cara Menjalankan Aplikasi

1. Pastikan file `.env.local` tersedia di root project.
2. Install dependency jika belum:

```bash
npm install
```

3. Jalankan development server:

```bash
npm run dev
```

4. Buka aplikasi dari URL yang muncul di terminal. Biasanya:

```text
http://localhost:3000
```

Jika port 3000 sedang dipakai, Next.js akan otomatis memakai port lain, misalnya:

```text
http://localhost:3001
```

## Akun Demo Login

Gunakan akun berikut untuk menguji akses setiap role.

| Role | Email | Password | Fokus Pengujian |
|---|---|---|---|
| Farmer | `farmer@serenagri.com` | `farmer123` | Analisis lahan, cuaca, matching, chat |
| Buyer | `buyer@serenagri.com` | `buyer123` | Sourcing buyer, matching, transaksi, cuaca, chat |
| Supplier | `supplier@serenagri.com` | `supplier123` | Matching, cuaca, transaksi read-only, chat |
| Logistics | `logistics@serenagri.com` | `logistics123` | Transaksi, matching, cuaca, chat |
| Finance | `finance@serenagri.com` | `finance123` | Policy, transaksi read-only, cuaca, chat |
| Government | `government@serenagri.com` | `government123` | Policy, farmer/buyer intelligence, simulation, semua monitoring |

## Seed Data Demo

Data dummy dipakai agar setiap role langsung punya riwayat, chat, dan transaksi yang bisa diklik.

Jalankan seed history:

```bash
npm run seed:demo-history
```

Jalankan seed transaksi:

```bash
npm run seed:transactions
```

Seed bersifat idempotent untuk batch demo: saat dijalankan ulang, data demo batch sebelumnya akan dibersihkan lalu dibuat ulang.

## Fitur Utama

### Dashboard

Dashboard menampilkan metric card dan recent activity sesuai role.

Yang perlu diuji:

- Klik metric card harus masuk ke halaman fitur terkait.
- Klik recent activity transaksi harus membuka halaman transaksi dan langsung memilih detail transaksi.
- Klik recent activity chat harus membuka conversation terkait.
- Quick action hanya menampilkan fitur yang sesuai role.
- Role yang tidak punya akses tidak boleh bisa membuka halaman/API tertentu.

### Farmer Intelligence

Lokasi: `/dashboard/farmer`

Fitur:

- Form analisis lahan.
- Tombol `Info` untuk bantuan pengisian form.
- Riwayat analisis selalu tersedia.
- Klik item riwayat memuat ulang input dan hasil analisis.

Uji dengan role:

- Farmer
- Government

### Buyer Intelligence

Lokasi: `/dashboard/buyer`

Fitur:

- Form kebutuhan pasokan buyer.
- Tombol `Info` berisi panduan volume, lokasi kirim, jadwal, dan budget.
- Riwayat sourcing.
- Klik riwayat memuat input dan hasil.

Uji dengan role:

- Buyer
- Government

### Supply Matching

Lokasi: `/dashboard/matching`

Fitur:

- Pencocokan pasokan berdasarkan komoditas, volume, tujuan, kualitas, dan timeline.
- Tombol `Info` untuk menjelaskan input matching.
- Riwayat matching.
- Klik riwayat memuat hasil matched regions, capacity, logistics, timeline, price, dan recommendation.

Uji dengan role:

- Farmer
- Buyer
- Supplier
- Logistics
- Government

### Weather Intelligence

Lokasi: `/dashboard/weather`

Fitur:

- Analisis cuaca berdasarkan region, crop, scenario, dan season.
- Tombol `Info` untuk menjelaskan skenario dan mitigasi.
- Riwayat cuaca.
- Klik riwayat memuat impact assessment, crop adjustment, irrigation, schedule, mitigation, dan risk level.

Uji dengan role:

- Farmer
- Buyer
- Supplier
- Logistics
- Finance
- Government

### Policy Intelligence

Lokasi: `/dashboard/policy`

Fitur:

- Analisis kebijakan berdasarkan region, commodity, analysis type, dan time horizon.
- Tombol `Info` menjelaskan cakupan nasional/regional.
- Riwayat policy.
- Klik riwayat memuat production overview, supply-demand, risk zones, recommendations, dan priority actions.

Uji dengan role:

- Finance
- Government

### Chat AI

Lokasi: `/dashboard/chat`

Fitur:

- Chat AI sesuai role.
- Tombol `Percakapan` untuk membuka history conversation.
- Klik conversation memuat pesan sebelumnya.
- Link `/dashboard/chat?conversation=<id>` membuka conversation spesifik.

Uji dengan semua role.

### Transaksi

Lokasi: `/dashboard/transactions`

Fitur:

- Buyer dapat membuat transaksi baru.
- Role lain melihat transaksi sesuai akses participant.
- Row transaksi bisa diklik untuk membuka detail.
- Detail transaksi menampilkan status, harga, jadwal, catatan, history negosiasi, dan action sesuai role.
- Link `/dashboard/transactions?tx=<id>` membuka transaksi spesifik.

Uji tombol berdasarkan status:

- Draft: buyer bisa submit proposal.
- Proposed: pihak yang berhak bisa counter, accept, atau reject.
- Accepted: buyer/farmer bisa update ke in progress atau cancel.
- Participant non buyer/farmer seperti supplier, logistics, finance, government hanya melihat detail sesuai akses.

### Simulation

Lokasi: `/dashboard/simulation`

Fitur:

- Monitoring data demo dan hasil analisis.
- Hanya government yang punya akses.

Uji dengan role:

- Government boleh akses.
- Role lain harus diarahkan kembali ke halaman yang sesuai.

## Checklist Testing Role

Untuk setiap akun demo:

1. Login.
2. Pastikan diarahkan ke default dashboard role.
3. Klik semua metric card.
4. Klik semua quick action.
5. Buka history di setiap halaman yang diizinkan.
6. Klik item history dan pastikan form + hasil terisi.
7. Buka dashboard lagi, klik recent activity.
8. Buka transaksi, klik row transaksi.
9. Coba tombol action yang tersedia sesuai role.
10. Coba buka URL fitur yang tidak diizinkan dan pastikan akses diblokir/redirect.

## Command Verifikasi Developer

Jalankan sebelum dianggap stabil:

```bash
npx tsc --noEmit
npm run lint
npm test
```

Ekspektasi saat dokumen ini dibuat:

```text
TypeScript: pass
ESLint: pass
Vitest: 180 tests pass
```

## File yang Tidak Perlu Masuk Git

File runtime, cache, report, secret, dan output lokal tidak perlu masuk Git. Pola yang sudah diabaikan di `.gitignore` mencakup:

- `.env*`
- `node_modules`
- `.next`
- `out`
- `build`
- `coverage`
- `reports`
- `playwright-report`
- `test-results`
- `.cache`
- `.turbo`
- `*.tsbuildinfo`
- dump atau scratch SQL lokal seperti `*.dump` dan `*.sql.local`

File kode aplikasi, script seed demo, migration utama, dan dokumentasi ini tetap boleh masuk Git karena dibutuhkan untuk menjalankan dan menguji aplikasi.
