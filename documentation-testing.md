# Skrip Testing & Kapabilitas — Serenagri AI

Dokumen ini adalah skrip praktis untuk menguji dan mendemonstrasikan seluruh kapabilitas Serenagri AI: alur apa saja yang tersedia, contoh data apa yang perlu diisi, dan hasil apa yang seharusnya muncul di setiap langkah. Ikuti dari atas ke bawah untuk demo lengkap, atau lompat ke bagian role yang ingin diuji.

## Daftar Isi

- [Persiapan](#persiapan)
- [Akun Demo](#akun-demo)
- [Alur Testing: Petani (Farmer)](#alur-testing-petani-farmer)
- [Alur Testing: Pembeli (Buyer)](#alur-testing-pembeli-buyer)
- [Alur Testing: Pemasok, Logistik, Keuangan](#alur-testing-pemasok-logistik-keuangan)
- [Alur Testing: Pemerintah (Government)](#alur-testing-pemerintah-government)
- [Alur Testing: Admin Super Dashboard](#alur-testing-admin-super-dashboard)
- [Skenario Lintas-Role Terhubung](#skenario-lintas-role-terhubung)
- [Checklist Regresi Umum](#checklist-regresi-umum)

## Persiapan

1. Pastikan `.env.local` sudah terisi (lihat README.md) dan seluruh migration di `supabase/migrations/` sudah dijalankan lewat Supabase Dashboard SQL Editor, berurutan dari `001` sampai nomor terbaru.
2. Jalankan server dev:
   ```bash
   npm run dev
   ```
3. Seed data demo (urutan disarankan, semua idempotent untuk batch demo):
   ```bash
   npm run seed:users
   npm run seed:admin
   npm run seed:listings
   npm run seed:farmer-operations
   npm run seed:transactions
   npm run seed:demo-history
   ```
4. Buka [http://localhost:3000](http://localhost:3000).

## Akun Demo

| Role | Email | Password |
|---|---|---|
| Petani | `farmer@serenagri.com` | `farmer123` |
| Pembeli | `buyer@serenagri.com` | `buyer123` |
| Pemasok Pertanian | `supplier@serenagri.com` | `supplier123` |
| Penyedia Logistik | `logistics@serenagri.com` | `logistics123` |
| Lembaga Keuangan | `finance@serenagri.com` | `finance123` |
| Instansi Pemerintah | `government@serenagri.com` | `government123` |
| Admin | `admin@serenagri.com` (login di `/admin/login`) | `admin123` |

Di halaman login biasa, klik salah satu tombol role di kotak "Role Pengguna yang Didukung" untuk auto-isi email/password akun demo tersebut — tidak perlu mengetik manual.

## Alur Testing: Petani (Farmer)

Login sebagai `farmer@serenagri.com`.

### 1. Rekomendasi Tanaman AI (`/dashboard/farmer`)

Isi form dengan contoh:

| Field | Contoh isian |
|---|---|
| Provinsi | Jawa Tengah |
| Luas lahan | 2 hektar |
| Jenis tanah | Lempung |
| Sumber air | Irigasi |
| Komoditas diinginkan | Padi, Jagung |
| Anggaran | Rp 20.000.000 |

Klik **Analisis** → tunggu beberapa detik → hasil AI muncul: rekomendasi tanaman terurut, estimasi hasil per hektar, biaya produksi, subsidi yang tersedia, kebutuhan input. Klik salah satu item **Riwayat** di bawah untuk memuat ulang analisis sebelumnya.

### 2. Kelola Lahan (`/dashboard/land-plots`)

Klik **Tambah Lahan**, isi:

| Field | Contoh isian |
|---|---|
| Nama lahan | Sawah Belakang Rumah |
| Provinsi | Jawa Tengah |
| Luas | 1.5 hektar |
| Komoditas | Padi/Beras |
| Tanggal tanam | (tanggal hari ini) |

Simpan → lahan muncul sebagai kartu. Uji **Edit** (ubah status ke "Baru dipanen") dan **Hapus**.

### 3. Monitoring Tanaman (`/dashboard/monitoring`)

Pilih lahan yang baru dibuat → pilih jenis aktivitas "Penyiraman" → unggah foto (opsional) → isi catatan "Penyiraman pagi, kondisi daun sehat" → **Tambah catatan**. Catatan baru + foto (jika ada) muncul di Riwayat Aktivitas lahan tersebut.

### 4. Pelacakan Subsidi (`/dashboard/subsidies`)

Klik **Tambah Subsidi**:

| Field | Contoh isian |
|---|---|
| Nama program | Subsidi Pupuk Bersubsidi 2026 |
| Lembaga | Dinas Pertanian Jawa Tengah |
| Jenis subsidi | Subsidi sarana produksi |
| Status | Diajukan |

Simpan → kartu subsidi muncul dengan badge status berwarna. Ubah status jadi "Disetujui" lewat **Edit**, lalu "Dicairkan" — perhatikan warna badge berubah sesuai status.

### 5. Rencana Sarana Produksi (`/dashboard/input-planning`)

Klik **Tambah Sarana Produksi**:

| Field | Contoh isian |
|---|---|
| Nama sarana produksi | Benih Padi Ciherang |
| Jenis | Benih |
| Lahan | (pilih lahan yang sudah dibuat) |
| Komoditas | Padi/Beras |
| Jumlah | 25 |
| Satuan | kg |
| Harga per satuan | 15000 |

Simpan → kartu **Total estimasi biaya** di atas daftar otomatis terhitung (jumlah × harga satuan, dijumlah semua item). Tambahkan item kedua (mis. Pupuk NPK, 100 kg, Rp 8.000/kg) dan verifikasi total ikut bertambah.

### 6. Operasional Petani & Peta Pengiriman (`/dashboard/farmer-operations`)

Halaman ini butuh data transaksi terhubung — pastikan `npm run seed:farmer-operations` dan `npm run seed:transactions` sudah dijalankan. Verifikasi tiga bagian:
- **Akses pembiayaan** — daftar kandidat lembaga keuangan dengan tombol "Reach out".
- **Koordinasi logistik** — status pengiriman (mis. `picked_up`) dan checkpoint.
- **Peta delivery real-time** — peta Indonesia (Leaflet/OpenStreetMap) menampilkan rute dari titik jemput ke tujuan dengan pin berwarna sesuai legenda (Jemput/Posisi Kini/Terlewati/Tujuan). Coba perbesar/perkecil peta dan klik pin untuk melihat popup detail.

### 7. Kalender AI, Cuaca, Pest Alert, Plant Scan

- `/dashboard/calendar` — isi komoditas & tanggal tanam → hasilkan jadwal tanam AI.
- `/dashboard/weather` — pilih region/komoditas/skenario → analisis risiko cuaca.
- `/dashboard/pest-alert` — isi gejala (mis. "Daun menguning dan ada bercak coklat") → AI memberi diagnosis kemungkinan hama/penyakit + tingkat risiko.
- `/dashboard/plant-scan` — unggah foto tanaman → AI menilai kesehatan tanaman dari gambar (coba juga unggah foto yang tidak relevan untuk melihat AI menolak dengan sopan).

### 8. Dashboard Keuangan & Analisis AI (`/dashboard/financial`)

Lihat kartu total pendapatan/pengeluaran/margin dan grafik cashflow sederhana. Klik **Analisis AI** untuk mendapat narasi kekuatan/kelemahan/rekomendasi berbasis angka yang sudah dihitung (bukan angka fiktif dari AI).

### 9. Transaksi, Contract Farming, Community, Chat

- `/dashboard/transactions` — lihat transaksi yang sudah di-seed, klik salah satu untuk detail.
- `/dashboard/contracts` — klik **Usulkan Kontrak**, pilih mitra yang pernah bertransaksi, isi komoditas/volume/harga/tanggal → kontrak baru muncul dengan status "Diusulkan".
- `/dashboard/community` — klik **Buat Postingan**, pilih kategori, isi judul & isi → postingan muncul di daftar teratas.
- `/dashboard/chat` — ketik pertanyaan bebas (mis. "Apa rekomendasi pupuk untuk tanaman tomat saya?") → respons AI streaming muncul dengan format markdown.

## Alur Testing: Pembeli (Buyer)

Login sebagai `buyer@serenagri.com`.

1. `/dashboard/buyer` — isi kebutuhan pasokan (komoditas, volume, lokasi kirim, jadwal, budget) → AI memberi wilayah produksi potensial, kapasitas, rute logistik, timeline.
2. `/dashboard/matching` — cocokkan demand dengan pasokan petani yang tersedia.
3. `/dashboard/warehouse` — kelola gudang penyimpanan (Tambah Gudang → nama, provinsi, kapasitas).
4. `/dashboard/esg-report` — lihat laporan karbon & ESG pemasok yang bertransaksi.
5. `/dashboard/farmer-operations` — sebagai counterparty (bukan pemilik), verifikasi hanya melihat rencana logistik dari transaksi yang diikuti (bukan data pribadi petani lain).

## Alur Testing: Pemasok, Logistik, Keuangan

**Pemasok** (`supplier@serenagri.com`): `/dashboard/matching` (home), `/dashboard/warehouse`, `/dashboard/transactions` — verifikasi akses read-only/counterparty sesuai peran, tidak bisa membuka halaman farmer-only seperti `/dashboard/farmer` (harus redirect).

**Logistik** (`logistics@serenagri.com`): `/dashboard/transactions` (home, cek alur Pembeli ↔ Logistik), `/dashboard/farmer-operations` (rencana pengiriman & checkpoint yang jadi tanggung jawabnya), `/dashboard/warehouse`.

**Keuangan** (`finance@serenagri.com`): `/dashboard/policy` (sebagai Assessment Pembiayaan — cocokkan kebutuhan petani dengan lembaga keuangan), `/dashboard/institutional-financial` (ringkasan keuangan & produksi platform-wide — pastikan angkanya agregat semua petani, bukan kosong/personal).

## Alur Testing: Pemerintah (Government)

Login sebagai `government@serenagri.com`.

1. `/dashboard/policy` — analisis kebijakan nasional/regional (region, komoditas, jenis analisis, horizon waktu).
2. `/dashboard/simulation` — **Ringkasan Simulasi**: statistik seluruh pengguna/analisis/transaksi platform. Expand bagian **Analitik Regional AI**, klik **Buat Analisis** → narasi tren nasional + naratif per provinsi (mis. "Jawa Barat memiliki pasokan tanpa permintaan...").
3. `/dashboard/platform-overview` — statistik read-only seluruh platform (pengguna per peran, transaksi per status, listing marketplace, supply chain).
4. `/dashboard/institutional-financial` — sama seperti role finance, tapi dari sudut pandang regulator.

## Alur Testing: Admin Super Dashboard

Login di `/admin/login` dengan `admin@serenagri.com` / `admin123`.

Uji setiap tab satu per satu:

| Tab | Yang diuji |
|---|---|
| Monitoring User | Klik **Buat akun** → isi nama, email, password, role → akun baru muncul di tabel. Klik **Nonaktifkan** pada akun tersebut (muncul dialog konfirmasi native browser — klik OK) → status berubah "deactivated", tombol berubah jadi **Aktifkan kembali**. |
| Monitoring Transaksi | Daftar transaksi seluruh platform. |
| Monitoring Marketplace | Ringkasan listing supply/demand berdasarkan status. |
| Monitoring Supply Chain | Ringkasan rencana logistik. |
| Monitoring AI | Jumlah analisis yang sudah dijalankan per fitur AI. |
| AI Market Intelligence, Carbon & ESG | Generate laporan platform-wide, sama seperti versi buyer/finance tapi agregat. |
| Analitik Regional AI | Sama seperti di halaman Simulation milik government. |
| Riwayat Aktivitas | Feed aktivitas seluruh platform (akun baru, transaksi baru, dst). |
| Notifikasi, Profil, Pengaturan | Sama seperti versi role biasa, disesuaikan untuk admin. |

> Catatan: jangan uji tombol **Nonaktifkan** pada akun demo utama (`farmer@serenagri.com`, dst.) kecuali memang berniat menonaktifkannya — gunakan akun yang baru dibuat khusus untuk testing.

## Skenario Lintas-Role Terhubung

`npm run seed:demo-history` menanam tiga skenario yang datanya saling terhubung antar role — pakai ini untuk mendemonstrasikan bahwa aplikasi ini benar-benar satu ekosistem, bukan fitur-fitur terpisah:

| Skenario ID | Komoditas | Petani → Pembeli | Rute Logistik | Kebutuhan Modal |
|---|---|---|---|---|
| `rice-subang-jakarta-2026` | Padi | Petani Demo Subang → Buyer Demo Jakarta | Subang - Pantura - Jakarta Utara | Rp 180.000.000 |
| `chili-garut-bandung-2026` | Cabai | Petani Demo Garut → Buyer Demo Bandung | Garut - Nagreg - Bandung | Rp 52.000.000 |
| `corn-malang-surabaya-2026` | Jagung | Petani Demo Malang → Buyer Demo Surabaya | Malang → Surabaya | — |

**Cara mendemonstrasikan keterhubungan** (pakai skenario padi sebagai contoh):

1. Login sebagai **farmer** → buka riwayat Matching → temukan hasil yang menyebut "Buyer Demo Jakarta" dan rute "Subang - Pantura - Jakarta Utara".
2. Login sebagai **buyer** → buka Transaksi → temukan transaksi padi 20-25 ton dengan "Petani Demo Subang" sebagai pihak lawan.
3. Login sebagai **finance** → buka Policy/Assessment Pembiayaan → temukan kebutuhan modal kerja ~Rp 180.000.000 yang mereferensikan transaksi/petani yang sama.
4. Login sebagai **logistics** → buka Transaksi/Farmer Operations → temukan rencana pengiriman dengan rute "Subang - Pantura - Jakarta Utara" untuk transaksi yang sama.
5. Login sebagai **government** → buka Chat AI atau Riwayat Aktivitas → konteks yang sama harus terlihat sebagai bagian dari gambaran besar platform.

Ulangi dengan skenario cabai (Garut-Bandung, melibatkan buyer/farmer/logistics) dan jagung (Malang-Surabaya, melibatkan supplier/buyer/farmer/government) untuk cakupan role yang berbeda-beda.

## Checklist Regresi Umum

Jalankan setelah perubahan besar apa pun pada kode:

- [ ] `npx tsc --noEmit`, `npm run lint`, `npm test` — semua lolos.
- [ ] Login gagal (password salah) menampilkan pesan error yang jelas, bukan halaman kosong/hang.
- [ ] Toggle bahasa EN/ID mengubah seluruh teks UI, bukan sebagian.
- [ ] Sidebar collapse/expand berfungsi dan preferensinya tersimpan (localStorage) lintas reload.
- [ ] Buka setiap halaman di setiap role — tidak ada error di console browser maupun log server, tidak ada request API yang gagal tanpa penanganan.
- [ ] Coba akses halaman/API yang bukan haknya (mis. buyer membuka `/dashboard/farmer`) — harus redirect/ditolak, bukan menampilkan data.
- [ ] Uji tampilan di lebar mobile (375px), tablet (768px), dan desktop (1280px) — tidak ada elemen terpotong atau overflow horizontal pada body halaman (tabel boleh scroll horizontal di dalam containernya sendiri).
- [ ] Untuk setiap fitur CRUD baru: uji create → muncul di list, edit → perubahan tersimpan & tampil, delete → hilang dari list & tidak error.
- [ ] Untuk setiap fitur AI baru: uji dengan input valid (hasil masuk akal) dan input minim/kosong (tidak crash, pesan error yang wajar).
