import en from './en';
import id from './id';

type Translations = typeof en;
type Language = 'en' | 'id';

const translations: Record<Language, Translations> = { en, id };

function getNestedValue(obj: Record<string, unknown>, path: string): string {
  const keys = path.split('.');
  let current: unknown = obj;
  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = (current as Record<string, unknown>)[key];
    } else {
      return path;
    }
  }
  return typeof current === 'string' ? current : path;
}

export function getTranslation(lang: Language, key: string): string {
  return getNestedValue(translations[lang] as unknown as Record<string, unknown>, key);
}

export type { Language, Translations };
export { translations };
