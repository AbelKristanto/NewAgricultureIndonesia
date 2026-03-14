'use client';

import { createContext, useContext, useState, useSyncExternalStore, useCallback, ReactNode } from 'react';
import { getTranslation, Language } from '@/i18n';

function getStoredLang(): Language {
  if (typeof window === 'undefined') return 'id';
  const stored = localStorage.getItem('serenagri-lang');
  return stored === 'en' || stored === 'id' ? stored : 'id';
}

function subscribeLangStorage(callback: () => void) {
  window.addEventListener('storage', callback);
  return () => window.removeEventListener('storage', callback);
}

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const storedLang = useSyncExternalStore(subscribeLangStorage, getStoredLang, () => 'id' as Language);
  const [lang, setLangState] = useState<Language>(storedLang);

  const setLang = useCallback((newLang: Language) => {
    setLangState(newLang);
    localStorage.setItem('serenagri-lang', newLang);
  }, []);

  const t = useCallback((key: string) => {
    return getTranslation(lang, key);
  }, [lang]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
}
