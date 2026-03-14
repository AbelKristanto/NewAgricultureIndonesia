'use client';

import { useLanguage } from '@/contexts/LanguageContext';

export default function LanguageToggle() {
  const { lang, setLang } = useLanguage();

  return (
    <div className="flex items-center bg-surface-100 rounded-lg p-0.5">
      <button
        onClick={() => setLang('en')}
        className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
          lang === 'en'
            ? 'bg-white text-primary-700 shadow-sm'
            : 'text-surface-500 hover:text-gray-700'
        }`}
      >
        EN
      </button>
      <button
        onClick={() => setLang('id')}
        className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
          lang === 'id'
            ? 'bg-white text-primary-700 shadow-sm'
            : 'text-surface-500 hover:text-gray-700'
        }`}
      >
        ID
      </button>
    </div>
  );
}
