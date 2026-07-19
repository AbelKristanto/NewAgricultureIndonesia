'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import EsgReportPanel from '@/components/shared/EsgReportPanel';
import { Leaf } from 'lucide-react';

export default function EsgReportPage() {
  const { lang } = useLanguage();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
          <Leaf className="h-6 w-6 text-primary-700" />
          {lang === 'en' ? 'Carbon & ESG Report' : 'Laporan Karbon & ESG'}
        </h1>
        <p className="mt-1 text-surface-500">
          {lang === 'en'
            ? 'AI-generated ESG narrative based on aggregated farmer sustainability assessments.'
            : 'Narasi ESG yang dibuat AI berdasarkan agregasi penilaian keberlanjutan petani.'}
        </p>
      </div>

      <EsgReportPanel />
    </div>
  );
}
