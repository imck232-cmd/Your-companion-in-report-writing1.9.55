
import { createContext, useContext } from 'react';
import { translations } from './translations';
import { Language } from '../types';

interface LanguageContextType {
  language: Language;
  t: (key: keyof typeof translations.ar) => string;
  toggleLanguage: () => void;
}

export const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export const LanguageProvider = LanguageContext.Provider;