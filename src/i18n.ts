import fr from './locales/fr.json';
import en from './locales/en.json';

const LANG = import.meta.env.VITE_APP_LANGUAGE || 'fr';

const dictionary: any = LANG === 'en' ? en : fr;

export const t = (key: string): string => {
  return dictionary[key] || key;
};

export const currentLang = LANG;
