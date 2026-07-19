'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import MarketIntelligencePanel from '@/components/shared/MarketIntelligencePanel';
import { TrendingUp } from 'lucide-react';

export default function MarketIntelligencePage() {
  const { lang } = useLanguage();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
          <TrendingUp className="h-6 w-6 text-primary-700" />
          {lang === 'en' ? 'AI Market Intelligence' : 'AI Market Intelligence'}
        </h1>
        <p className="mt-1 text-surface-500">
          {lang === 'en'
            ? 'AI-generated demand, price, and trend outlook for a commodity and region.'
            : 'Prospek permintaan, harga, dan tren yang dibuat AI untuk komoditas dan wilayah tertentu.'}
        </p>
      </div>

      <MarketIntelligencePanel />
    </div>
  );
}
