# Serenagri AI

Serenagri AI adalah platform intelijen pertanian berbasis AI untuk Indonesia. Platform ini menghubungkan seluruh rantai pasok pangan — petani, pembeli/distributor, pemasok sarana produksi, penyedia logistik, lembaga keuangan, dan pemerintah — dalam satu sistem yang didukung Google Gemini untuk analisis, rekomendasi, dan asisten percakapan.

## Daftar Isi

- [Gambaran Umum](#gambaran-umum)
- [Tech Stack](#tech-stack)
- [Arsitektur](#arsitektur)
- [Struktur Proyek](#struktur-proyek)
- [Skema Database](#skema-database)
- [Role & Hak Akses (RBAC)](#role--hak-akses-rbac)
- [Fitur per Role](#fitur-per-role)
- [Kapabilitas AI](#kapabilitas-ai)
- [Instalasi & Menjalankan Aplikasi](#instalasi--menjalankan-aplikasi)
- [Testing](#testing)

## Gambaran Umum

Serenagri AI membantu:

- **Petani** memutuskan komoditas apa yang ditanam, mengelola lahan dan aktivitas tanam, melacak subsidi, merencanakan sarana produksi, dan mendapat akses pembiayaan/logistik pasca-transaksi.
- **Pembeli/distributor** menemukan pasokan yang cocok, membuat kontrak, dan memantau ESG/keberlanjutan pemasoknya.
- **Pemasok sarana produksi** melihat kebutuhan pasar di sekitar matching petani-pembeli.
- **Penyedia logistik** merencanakan pengiriman dan melacak status real-time di peta.
- **Lembaga keuangan** menilai kelayakan pembiayaan petani berbasis data produksi dan risiko.
- **Pemerintah/regulator** memantau stabilitas sistem pangan lewat simulasi platform-wide, analitik regional, dan laporan karbon/ESG.
- **Admin** memantau seluruh platform lewat Super Dashboard (akun, transaksi, marketplace, supply chain, AI usage).

Semua peran berbagi fitur inti: **Chat AI** (asisten pertanian role-aware), **Transaksi**, **Community**, dan riwayat (history) yang bisa diklik ulang untuk memuat input & hasil analisis sebelumnya.

## Tech Stack

| Layer | Teknologi |
|---|---|
| Framework | Next.js 16 (App Router, TypeScript, Turbopack) |
| UI | Tailwind CSS v4, lucide-react (ikon), react-markdown |
| Peta | Leaflet + react-leaflet (peta Indonesia untuk delivery real-time) |
| AI | Google Gemini API (`gemini-flash-latest`, via `@google/generative-ai`) |
| Database & Auth | Supabase (Postgres + Row Level Security + `@supabase/ssr`) |
| Pembayaran | Midtrans (payment gateway) |
| Bahasa UI | Bilingual — English & Bahasa Indonesia (`src/i18n/en.ts`, `id.ts`) |
| Testing | Vitest (206 test, 13 file test) |

## Arsitektur

### Alur Autentikasi & Otorisasi

1. **`src/app/dashboard/layout.tsx`** (server component) — memverifikasi sesi Supabase di setiap request ke `/dashboard/*`. Tidak ada sesi → redirect ke `/login`.
2. **`RoleGuard`** (client component) — mengecek apakah halaman yang diakses ada di daftar `pages` role tersebut (`src/lib/rbac.ts`); jika tidak, redirect ke home page role yang sesuai.
3. **API routes** — setiap route membaca `x-user-id`/`x-user-role` (di-set lewat `getRequestContext()`), lalu memvalidasi role secara eksplisit (mis. `ctx.userRole !== 'farmer'`) dan kepemilikan baris data (`existing.farmer_id !== ctx.userId`) sebelum melanjutkan.
4. **Admin** memakai alur terpisah: `/admin/login` → sesi disimpan terpisah dari sesi role biasa → `/admin` (Super Dashboard, satu halaman dengan banyak tab).

### Alur Data & AI

```
Browser (Client Component)
   │  fetch()
   ▼
API Route  (src/app/api/**/route.ts)
   │  getRequestContext() → cek role & rate limit
   ▼
┌─────────────────────────┬───────────────────────────┐
│ Query layer             │ Gemini wrapper             │
│ src/lib/db/*.ts         │ src/lib/gemini.ts          │
│ (Supabase admin client, │ + prompt builder           │
│  bypass RLS, scoped     │ src/lib/prompts/*.ts       │
│  manual per userId/role)│ (system prompt per domain) │
└─────────────────────────┴───────────────────────────┘
   │                                │
   ▼                                ▼
Supabase Postgres (RLS aktif    Google Gemini API
untuk akses langsung client,    (gemini-flash-latest)
tapi API route pakai            → hasil di-parse (JSON/markdown)
service-role key sehingga       → disimpan via saveAnalysis()
RLS di-bypass secara sengaja)   ke tabel *_analyses masing-masing
```

Setiap domain AI (`farmer`, `buyer`, `matching`, `weather`, `policy`, `chat`, `esg-report`, `market-intelligence`, `pest-alert`, `plant-scan`, `daily-insight`, `performance-analysis`, `regional-analytics`, `calendar`) punya:
- System prompt sendiri di `src/lib/prompts/<domain>-prompt.ts`
- Endpoint `src/app/api/ai/<domain>/route.ts` yang memanggil Gemini lalu mem-parse respons
- Rate limiting per kategori (`ai_analysis`: 10 request/15 menit, `chat`: 30 request/15 menit) via `src/lib/rate-limiter.ts`
- Riwayat tersimpan dan bisa dimuat ulang lewat `src/lib/db/analyses.ts`

### Pola CRUD Non-AI

Fitur operasional murni (Kelola Lahan, Monitoring Tanaman, Riwayat Produksi, Gudang, Contract Farming, Community, Pelacakan Subsidi, Rencana Sarana Produksi) mengikuti pola konsisten:

- **Query layer** (`src/lib/db/<domain>.ts`) — fungsi murni `getX`, `getXById`, `createX`, `updateX`, `deleteX` yang menerima `SupabaseClient` sebagai parameter pertama.
- **API route** (`src/app/api/<domain>/route.ts` + `[id]/route.ts`) — `GET`/`POST` di route dasar, `PATCH`/`DELETE` di `[id]`, semua memvalidasi role dan kepemilikan baris sebelum mutasi.
- **Halaman** (`'use client'`) — pola `isMounted = useRef(true)` untuk mencegah `setState` setelah unmount, form create/edit dalam satu komponen, optimistic list update setelah delete.

## Struktur Proyek

```
src/
├── app/
│   ├── dashboard/              # Halaman per fitur (lihat tabel Fitur per Role)
│   ├── admin/                  # Super Dashboard (login terpisah, 1 halaman + banyak tab)
│   ├── login/, signup/         # Alur autentikasi role biasa
│   ├── auth/                   # Callback konfirmasi email, dsb.
│   ├── account-deactivated/, pending-verification/
│   └── api/
│       ├── ai/                 # Endpoint AI per domain
│       ├── admin-panel/        # Endpoint khusus admin (akun, transaksi, overview)
│       ├── transactions/, contracts/, warehouses/, community/, listings/
│       ├── land-plots/, crop-monitoring/, harvest-records/
│       ├── subsidies/, input-planning/, farmer-operations/
│       ├── payments/, notifications/, institutional-financials/
│       └── platform-overview/
├── components/
│   ├── layout/                 # Sidebar, MobileNav, Topbar
│   ├── auth/                   # LoginForm, AdminLoginForm, RoleGuard
│   ├── shared/                 # Panel AI reusable (Esg, MarketIntelligence, RegionalAnalytics, dll), DeliveryMapInner (Leaflet)
│   ├── ui/                     # Button, Input, Select, Textarea, Badge, Spinner, dll (design system dasar)
│   └── error/                  # ErrorBoundary, ConnectionBanner
├── contexts/                   # AuthContext, LanguageContext, RoleContext
├── i18n/                       # en.ts, id.ts — namespace nav.*, + blok penuh untuk fitur lama
├── lib/
│   ├── gemini.ts                # Wrapper Gemini API (generate, parse response)
│   ├── prompts/                 # System prompt per domain AI
│   ├── rbac.ts                  # Definisi permission per role (pages, apiRoutes, metricCards, quickActions)
│   ├── api-helpers.ts            # getRequestContext, createForbiddenResponse, dll
│   ├── rate-limiter.ts           # Rate limit per kategori endpoint
│   ├── constants.ts               # Provinsi, komoditas, status enum, dll (dipakai form + validasi)
│   ├── db/                       # Query layer per domain (lihat Skema Database)
│   └── supabase/                 # Client browser/server/admin
└── types/                        # Type definitions per domain
```

## Skema Database

Migration berurutan di `supabase/migrations/` (saat ini sampai `030`), dikelompokkan per domain:

| Domain | Migration | Tabel utama |
|---|---|---|
| Inti & analisis AI | 001, 003 | `profiles`, `farmer_analyses`, `buyer_analyses`, `policy_analyses`, `chat_conversations`, `chat_messages`, `matching_analyses`, `weather_analyses` |
| Transaksi & simulasi | 002, 003 | `transactions` |
| Keamanan akun | 004, 007, 013, 014 | Kunci perubahan role, role `admin`, verifikasi institusi, deaktivasi akun |
| Operasional petani | 005, 009 | `farmer_financing_opportunities`, `farmer_logistics_plans`, `farmer_activity_summaries` |
| Marketplace | 006 | `farmer_supply_listings`, `buyer_demand_listings` |
| Notifikasi & signup | 008, 010 | `notifications`, alur signup |
| Pembayaran | 011 | Integrasi Midtrans |
| Lahan & monitoring | 015, 016, 017, 018 | `land_plots`, `crop_monitoring_logs` (+ storage foto), `harvest_records` |
| Kalender AI | 019 | `calendar_analyses` |
| Community & Gudang | 020, 021 | `community_posts`, `community_replies`, `warehouses`, `warehouse_stock` |
| Contract Farming | 022 | `farmer_contracts` |
| Keberlanjutan & ESG | 023, 024 | `sustainability_analyses`, `esg_reports` |
| Market Intelligence & Hama | 025, 026, 027 | `market_intelligence_analyses`, `pest_alert_analyses`, `plant_scans` (+ storage) |
| Insight harian & performa | 028, 029 | `daily_insights`, `performance_analyses`, `regional_analyses` |
| Subsidi & sarana produksi | 030 | `farmer_subsidies`, `farmer_input_plans` |

Semua tabel domain-farmer memakai Row Level Security (RLS) berbasis `auth.uid() = <owner>_id` — kebijakan `select`/`update` untuk akses langsung client, sementara mutasi (`insert`/`delete`) selalu lewat API route dengan service-role key (RLS di-bypass secara sengaja, otorisasi dilakukan manual di route handler).

## Role & Hak Akses (RBAC)

Didefinisikan di [`src/lib/rbac.ts`](src/lib/rbac.ts). Setiap role punya `homePage`, daftar `pages` yang boleh diakses, `apiRoutes` yang boleh dipanggil, `metricCards`, dan `quickActions`.

| Role | Home Page | Jumlah Halaman | Fokus |
|---|---|---|---|
| **Farmer** | `/dashboard/farmer` | 24 | Analisis lahan, cuaca, matching, operasional pasca-transaksi, kelola lahan & monitoring, subsidi, sarana produksi |
| **Buyer** | `/dashboard/buyer` | 16 | Sourcing demand, matching, transaksi, kontrak, gudang, ESG pemasok |
| **Supplier** | `/dashboard/matching` | 11 | Visibilitas demand/matching, transaksi, gudang |
| **Logistics** | `/dashboard/transactions` | 10 | Perencanaan pengiriman, koordinasi operasional petani, gudang |
| **Finance** | `/dashboard/policy` (sebagai Assessment Pembiayaan) | 13 | Penilaian pembiayaan, ringkasan keuangan institusi |
| **Government** | `/dashboard/policy` | 14 | Kebijakan, simulasi platform-wide, analitik regional, ringkasan platform |
| **Admin** | `/admin` | 1 (Super Dashboard, multi-tab) | Monitoring akun, transaksi, marketplace, supply chain, AI usage |

## Fitur per Role

### Petani (Farmer)

| Halaman | Fungsi |
|---|---|
| `/dashboard/farmer` | Rekomendasi tanaman AI berbasis data lahan (estimasi hasil, biaya produksi, subsidi, kebutuhan input) |
| `/dashboard/land-plots` | CRUD lahan (provinsi, luas, komoditas, tanggal tanam/panen, status) |
| `/dashboard/monitoring` | Catat aktivitas (penyiraman/pemupukan/kondisi) per lahan, dengan upload foto |
| `/dashboard/production-history` | Riwayat hasil panen per siklus |
| `/dashboard/calendar` | Kalender tanam berbasis AI |
| `/dashboard/financial` | Dashboard keuangan (pendapatan/pengeluaran/margin) + **Analisis AI** narasi performa |
| `/dashboard/subsidies` | **Pelacakan Subsidi** — program, lembaga, jenis, status pengajuan→pencairan |
| `/dashboard/input-planning` | **Rencana Sarana Produksi** — benih/pupuk/pestisida per musim tanam + estimasi biaya, opsional ditautkan ke lahan |
| `/dashboard/farmer-operations` | Akses pembiayaan, koordinasi logistik, **peta pengiriman real-time** (Leaflet), ringkasan aktivitas transaksi |
| `/dashboard/matching` | Pencocokan pasokan-permintaan dengan pembeli |
| `/dashboard/weather` | Analisis risiko cuaca per lahan/komoditas |
| `/dashboard/pest-alert` | Penilaian risiko hama/penyakit berbasis gejala (AI) |
| `/dashboard/plant-scan` | Diagnosis kesehatan tanaman dari foto (AI vision) |
| `/dashboard/contracts` | Usulkan & kelola Contract Farming dengan pembeli |
| `/dashboard/sustainability` | Skor keberlanjutan praktik budidaya |
| `/dashboard/market-intelligence` | Intelijen pasar AI (tren harga, permintaan) |
| `/dashboard/transactions`, `/community`, `/chat`, `/activity` | Transaksi, forum komunitas, chat AI, riwayat aktivitas |

### Pembeli (Buyer)

`/dashboard/buyer` (sourcing demand), `/dashboard/matching`, `/dashboard/transactions`, `/dashboard/contracts`, `/dashboard/warehouse`, `/dashboard/sustainability`, `/dashboard/esg-report` (laporan karbon & ESG pemasok), `/dashboard/market-intelligence`, `/dashboard/farmer-operations` (visibilitas counterparty ke rencana logistik transaksi yang diikuti), `/community`, `/chat`.

### Pemasok Pertanian (Supplier)

`/dashboard/matching` (home), `/dashboard/transactions`, `/dashboard/warehouse`, `/dashboard/market-intelligence`, `/community`, `/chat`.

### Penyedia Logistik (Logistics)

`/dashboard/transactions` (home, termasuk alur koordinasi Pembeli ↔ Logistik), `/dashboard/farmer-operations` (rencana pengiriman & checkpoint peta), `/dashboard/warehouse`, `/community`, `/chat`.

### Lembaga Keuangan (Finance)

`/dashboard/policy` (home, sebagai Assessment Pembiayaan — mempertemukan kebutuhan petani dengan penilaian risiko/produksi), `/dashboard/transactions`, `/dashboard/institutional-financial` (ringkasan keuangan & produksi platform-wide), `/dashboard/sustainability`, `/dashboard/esg-report`, `/dashboard/market-intelligence`, `/chat`.

### Instansi Pemerintah (Government)

`/dashboard/policy` (home — kebijakan nasional/regional), `/dashboard/simulation` (ringkasan seluruh pengguna/analisis/transaksi platform + **Analitik Regional AI**), `/dashboard/platform-overview` (statistik read-only seluruh platform), `/dashboard/institutional-financial`, `/dashboard/sustainability`, `/dashboard/esg-report`, `/dashboard/market-intelligence`, `/dashboard/pest-alert`, `/chat`.

### Admin

`/admin` — Super Dashboard satu halaman dengan tab: **Monitoring User** (buat/nonaktifkan/aktifkan akun), **Monitoring Transaksi**, **Monitoring Marketplace**, **Monitoring Supply Chain**, **Monitoring AI** (jumlah analisis per fitur), **AI Market Intelligence**, **Carbon & ESG**, **Analitik Regional AI**, **Riwayat Aktivitas**, **Notifikasi**, **Profil**, **Pengaturan**.

## Kapabilitas AI

| Fitur AI | Endpoint | Deskripsi |
|---|---|---|
| Rekomendasi Tanaman | `/api/ai/farmer` | Estimasi hasil, biaya, subsidi berbasis data lahan |
| Sourcing Pembeli | `/api/ai/buyer` | Wilayah produksi potensial, kapasitas, rute logistik |
| Matching Petani-Pembeli | `/api/ai/matching` | Pencocokan pasokan-permintaan |
| Analisis Cuaca | `/api/ai/weather` | Risiko cuaca per skenario |
| Kebijakan/Pembiayaan | `/api/ai/policy` | Insight regional (government) / assessment pembiayaan (finance) |
| Chat AI | `/api/ai/chat` | Asisten percakapan bebas, role-aware, streaming |
| Kalender Tanam | `/api/ai/calendar` | Jadwal tanam optimal |
| Laporan ESG | `/api/ai/esg-report` | Narasi karbon & keberlanjutan |
| Market Intelligence | `/api/ai/market-intelligence` | Tren pasar & harga |
| Peringatan Hama | `/api/ai/pest-alert` | Penilaian risiko dari gejala yang dilaporkan |
| Plant Scan | `/api/ai/plant-scan` | Diagnosis dari foto tanaman (vision) |
| Insight Harian | `/api/ai/daily-insight` | Tip harian personalisasi untuk petani |
| Analisis Performa | `/api/ai/performance-analysis` | Narasi atas metrik keuangan yang sudah dihitung client |
| Analitik Regional | `/api/ai/regional-analytics` | Tren nasional & naratif per provinsi (government/admin) |

## Instalasi & Menjalankan Aplikasi

### Prasyarat

- Node.js 18+
- Akun Supabase (project + service role key)
- API key Google Gemini
- (Opsional) Akun Midtrans sandbox untuk fitur pembayaran

### Instalasi

```bash
npm install
```

### Environment Variables

Buat `.env.local` di root:

```
GEMINI_API_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
MIDTRANS_SERVER_KEY=
NEXT_PUBLIC_MIDTRANS_CLIENT_KEY=
```

### Setup Database

1. Jalankan seluruh file `supabase/migrations/*.sql` secara berurutan lewat Supabase Dashboard → SQL Editor (atau `npm run setup` untuk skema dasar, lihat `scripts/setup-db.mjs`).
2. Seed akun demo & data (opsional, disarankan untuk testing — lihat [documentation-testing.md](documentation-testing.md)):

```bash
npm run seed:users              # Akun demo per role (farmer, buyer, supplier, logistics, finance, government)
npm run seed:admin              # Akun admin (admin@serenagri.com)
npm run seed:listings           # Listing supply/demand marketplace
npm run seed:farmer-operations  # Data pembiayaan/logistik/aktivitas contoh
npm run seed:transactions       # Transaksi demo
npm run seed:demo-history       # Riwayat analisis contoh di semua fitur (tanpa memanggil AI)
```

### Development

```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000).

### Build Produksi

```bash
npm run build
npm start
```

## Testing

- **Unit/integration test**: `npm test` (Vitest — RBAC, helper, dan logic murni lainnya).
- **Lint & type check**: `npm run lint`, `npx tsc --noEmit`.
- **Skenario testing manual & kapabilitas end-to-end**: lihat [documentation-testing.md](documentation-testing.md) — berisi akun demo, alur testing per role, dan skenario lintas-role yang saling terhubung.
