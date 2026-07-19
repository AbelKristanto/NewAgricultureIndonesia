'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRole } from '@/contexts/RoleContext';
import { getPermissions } from '@/lib/rbac';
import { LifeBuoy, ChevronDown } from 'lucide-react';

const PAGE_INFO: Record<string, { en: string; id: string; enDesc: string; idDesc: string }> = {
  '/dashboard/farmer': { en: 'AI Planting Recommendation', id: 'AI Rekomendasi Tanam', enDesc: 'Get an AI-generated planting plan for your land.', idDesc: 'Dapatkan rencana tanam dari AI untuk lahan Anda.' },
  '/dashboard/buyer': { en: 'Buyer Dashboard', id: 'Dashboard Buyer', enDesc: 'Analyze demand and sourcing options.', idDesc: 'Analisis permintaan dan opsi sumber pasokan.' },
  '/dashboard/policy': { en: 'Policy / Institution Dashboard', id: 'Dashboard Kebijakan/Lembaga', enDesc: 'Regional insight and institutional tools.', idDesc: 'Wawasan regional dan alat kelembagaan.' },
  '/dashboard/land-plots': { en: 'Land Plot Management', id: 'Kelola Lahan', enDesc: 'Register and track your land plots.', idDesc: 'Daftarkan dan pantau lahan Anda.' },
  '/dashboard/monitoring': { en: 'Crop Monitoring', id: 'Monitoring Tanaman', enDesc: 'Log watering, fertilizing, and crop condition.', idDesc: 'Catat penyiraman, pemupukan, dan kondisi tanaman.' },
  '/dashboard/production-history': { en: 'Production History', id: 'Histori Produksi', enDesc: 'Record harvests and export reports.', idDesc: 'Catat hasil panen dan unduh laporan.' },
  '/dashboard/calendar': { en: 'AI Farming Calendar', id: 'AI Calendar & Activity Planner', enDesc: 'AI-generated planting/harvest schedule.', idDesc: 'Jadwal tanam/panen yang dibuat AI.' },
  '/dashboard/financial': { en: 'Financial Dashboard', id: 'Financial Dashboard', enDesc: 'See your revenue, cost, and margin.', idDesc: 'Lihat pendapatan, biaya, dan margin Anda.' },
  '/dashboard/activity': { en: 'Activity Timeline', id: 'Activity Timeline', enDesc: 'A full history of your actions on the platform.', idDesc: 'Riwayat lengkap aktivitas Anda di platform.' },
  '/dashboard/matching': { en: 'Marketplace & AI Matching', id: 'Marketplace & AI Buyer Matching', enDesc: 'Browse listings and get AI-matched partners.', idDesc: 'Jelajahi listing dan dapatkan mitra dari AI.' },
  '/dashboard/transactions': { en: 'Transactions', id: 'Riwayat & Konfirmasi Transaksi', enDesc: 'Negotiate, confirm, and track transactions.', idDesc: 'Negosiasi, konfirmasi, dan pantau transaksi.' },
  '/dashboard/farmer-operations': { en: 'Supply Chain & Financing', id: 'Supply Chain Tracking & Financing', enDesc: 'Track logistics checkpoints and financing requests.', idDesc: 'Pantau checkpoint logistik dan pengajuan pembiayaan.' },
  '/dashboard/community': { en: 'Community', id: 'Community', enDesc: 'Ask questions and share with other users.', idDesc: 'Tanya jawab dan berbagi dengan pengguna lain.' },
  '/dashboard/weather': { en: 'Weather Intelligence', id: 'Weather Intelligence', enDesc: 'BMKG-based weather insight for your area.', idDesc: 'Wawasan cuaca berbasis BMKG untuk wilayah Anda.' },
  '/dashboard/chat': { en: 'AI Chat Assistant', id: 'AI Chat Assistant', enDesc: 'Ask the AI assistant anything about farming or trade.', idDesc: 'Tanyakan apa saja seputar pertanian atau perdagangan ke AI.' },
  '/dashboard/simulation': { en: 'Simulation', id: 'Simulasi', enDesc: 'Explore account and province-level data.', idDesc: 'Jelajahi data akun dan provinsi.' },
  '/dashboard/notifications': { en: 'Notification Center', id: 'Notification Center', enDesc: 'All your notifications in one place.', idDesc: 'Semua notifikasi Anda dalam satu tempat.' },
};

const FAQ_ITEMS: { en: { q: string; a: string }; id: { q: string; a: string } }[] = [
  {
    en: { q: 'Why is my account "Pending review"?', a: 'Some roles (finance, government) require an institution verification document. An admin reviews it before your account is fully approved — you\'ll get a notification once it\'s done.' },
    id: { q: 'Kenapa akun saya "Menunggu verifikasi"?', a: 'Beberapa peran (lembaga keuangan, pemerintah) memerlukan dokumen verifikasi institusi. Admin akan meninjaunya sebelum akun disetujui — Anda akan menerima notifikasi setelah selesai.' },
  },
  {
    en: { q: 'How do I change the app language?', a: 'Go to Pengaturan Aplikasi (App Settings) or use the language toggle in the top bar to switch between Indonesian and English.' },
    id: { q: 'Bagaimana cara mengganti bahasa aplikasi?', a: 'Buka Pengaturan Aplikasi atau gunakan tombol bahasa di bagian atas layar untuk beralih antara Bahasa Indonesia dan Inggris.' },
  },
  {
    en: { q: 'Where can I see all my notifications?', a: 'Click the bell icon in the top bar for recent ones, or open Notification Center from the sidebar for the full list.' },
    id: { q: 'Di mana saya bisa melihat semua notifikasi?', a: 'Klik ikon lonceng di bagian atas untuk notifikasi terbaru, atau buka Pusat Notifikasi dari sidebar untuk daftar lengkap.' },
  },
  {
    en: { q: 'How does AI Buyer Matching decide who to match me with?', a: 'It scores listings by commodity volume fit, quality grade, location proximity, and timeline alignment — you can see the matched reasons on each result.' },
    id: { q: 'Bagaimana AI Buyer Matching menentukan kecocokan?', a: 'Sistem menilai listing berdasarkan kecocokan volume komoditas, grade kualitas, kedekatan lokasi, dan kesesuaian waktu — alasan kecocokan ditampilkan pada setiap hasil.' },
  },
  {
    en: { q: 'How do I reset my password?', a: 'Go to Pengaturan Aplikasi (App Settings) and use the "Change password" form.' },
    id: { q: 'Bagaimana cara mengatur ulang kata sandi?', a: 'Buka Pengaturan Aplikasi dan gunakan formulir "Ubah kata sandi".' },
  },
];

export default function HelpPage() {
  const { lang } = useLanguage();
  const { role } = useRole();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const availablePages = getPermissions(role).pages.filter((p) => PAGE_INFO[p]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
          <LifeBuoy className="h-6 w-6 text-primary-700" />
          {lang === 'en' ? 'Help & Education Center' : 'Bantuan & Pusat Edukasi'}
        </h1>
        <p className="mt-1 text-surface-500">
          {lang === 'en' ? 'What you can do on Serenagri AI, and answers to common questions.' : 'Apa yang bisa Anda lakukan di Serenagri AI, dan jawaban atas pertanyaan umum.'}
        </p>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-gray-900">
          {lang === 'en' ? 'Features available to you' : 'Fitur yang tersedia untuk Anda'}
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {availablePages.map((page) => {
            const info = PAGE_INFO[page];
            return (
              <Link
                key={page}
                href={page}
                className="rounded-xl border border-surface-200 bg-white p-4 transition-colors hover:border-primary-300 hover:bg-primary-50/40"
              >
                <p className="text-sm font-medium text-gray-900">{lang === 'en' ? info.en : info.id}</p>
                <p className="mt-1 text-xs text-surface-500">{lang === 'en' ? info.enDesc : info.idDesc}</p>
              </Link>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-gray-900">
          {lang === 'en' ? 'Frequently asked questions' : 'Pertanyaan yang sering diajukan'}
        </h2>
        <div className="divide-y divide-surface-200 rounded-xl border border-surface-200 bg-white">
          {FAQ_ITEMS.map((item, i) => {
            const entry = lang === 'en' ? item.en : item.id;
            const isOpen = openFaq === i;
            return (
              <div key={i}>
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : i)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-gray-900"
                >
                  {entry.q}
                  <ChevronDown className={`h-4 w-4 shrink-0 text-surface-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>
                {isOpen && <p className="px-4 pb-4 text-sm text-surface-600">{entry.a}</p>}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
