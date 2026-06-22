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
| Buyer | `buyer@serenagri.com` | `buyer123` | Demand sourcing, matching petani-pembeli, transaksi, cuaca, chat |
| Supplier | `supplier@serenagri.com` | `supplier123` | Visibilitas demand/input di sekitar matching petani-pembeli, cuaca, transaksi read-only, chat |
| Logistics | `logistics@serenagri.com` | `logistics123` | Perencanaan pembeli-logistik, transaksi, cuaca, chat |
| Finance | `finance@serenagri.com` | `finance123` | Assessment pembiayaan petani-lembaga keuangan, transaksi read-only, cuaca, chat |
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

Dummy demo sekarang memakai skenario koneksi yang sama di history, chat, dan transaksi:

| Skenario | Alur utama | Role yang terlihat |
|---|---|---|
| `rice-subang-jakarta-2026` | Petani Demo Subang bertemu Buyer Demo Jakarta untuk beras, lalu finance menilai kebutuhan modal kerja dan logistics melihat rute Subang - Jakarta Utara. | Farmer, Buyer, Finance, Logistics, Government |
| `chili-garut-bandung-2026` | Petani Demo Garut bertemu Buyer Demo Bandung untuk cabai, lalu logistics menguji rute Garut - Bandung. | Buyer, Farmer, Logistics, Government |
| `corn-malang-surabaya-2026` | Petani Demo Malang bertemu Buyer Demo Surabaya untuk jagung, supplier/input dan government bisa memantau konteks transaksi. | Supplier, Buyer, Farmer, Government |

Gunakan ID skenario tersebut untuk mengecek apakah history matching, assessment pembiayaan, perencanaan logistik, chat, dan detail transaksi sudah saling terhubung secara naratif.

## Fitur Utama

Capability yang dianggap utama di aplikasi saat ini:

- Crop Recommendation: halaman Farmer Analysis.
- Buyer Sourcing Demand: halaman Buyer Sourcing.
- Farmer-Buyer Supply Matching: halaman Matching.
- Weather Risk Analysis: halaman Weather Intelligence.
- Buyer-Farmer Transactions: halaman Transactions.
- Agricultural Financing Assessment: halaman Policy untuk role Finance.
- Buyer-Logistics Planning: halaman Transactions untuk role Logistics.
- Policy and Simulation Monitoring: halaman Policy dan Simulation untuk Government.
- AI Advisory Chat: halaman Chat.

Capability seperti subsidy, input planning, dan crop monitoring belum menjadi modul mandiri; saat ini muncul sebagai bagian hasil Farmer Analysis atau Simulation Monitoring.

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

### Farmer-Buyer Supply Matching

Lokasi: `/dashboard/matching`

Fitur:

- Pencocokan pasokan untuk mempertemukan petani dengan pembeli berdasarkan komoditas, volume, tujuan, kualitas, dan timeline.
- Tombol `Info` untuk menjelaskan input matching.
- Riwayat matching.
- Klik riwayat memuat hasil wilayah/petani pemasok, capacity, logistics, timeline, price, dan recommendation.

Alur yang harus terlihat:

- Petani menyediakan pasokan.
- Pembeli membawa kebutuhan demand.
- Sistem menampilkan kecocokan, kapasitas, risiko logistik, dan rekomendasi tindak lanjut.

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

Untuk role Finance, halaman ini berfungsi sebagai `Assessment Pembiayaan`: mempertemukan kebutuhan petani dengan lembaga keuangan berdasarkan sinyal produksi, risiko, wilayah, komoditas, dan transaksi.

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

Untuk role Logistics, halaman transaksi juga menampilkan alur `Pembeli ↔ Pihak Logistik`, sehingga kebutuhan pengiriman pembeli, rute, tanggal, dan risiko operasional bisa terlihat untuk koordinasi logistik.

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
