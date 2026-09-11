import React, { createContext, useContext, useState, useEffect } from 'react';
import { LanguageCode } from '../types';
import { translations, phraseTranslations } from '../i18n/translations';

interface LanguageContextType {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  t: (keyOrPhrase: string, fallback?: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_LANG_KEY = 'mutikukwama_lang_pref';

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<LanguageCode>('pt');

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_LANG_KEY) as LanguageCode;
      if (saved && ['pt', 'en', 'fr', 'es', 'zh'].includes(saved)) {
        setLanguageState(saved);
        document.documentElement.lang = saved;
      } else {
        document.documentElement.lang = 'pt';
      }
    } catch (e) {
      console.warn('Could not read language from localStorage:', e);
    }
  }, []);

  const setLanguage = (lang: LanguageCode) => {
    setLanguageState(lang);
    try {
      document.documentElement.lang = lang;
      localStorage.setItem(STORAGE_LANG_KEY, lang);
      window.dispatchEvent(new CustomEvent('mutikukwama:language-changed', { detail: { language: lang } }));
    } catch (e) {
      console.warn('Could not save language to localStorage:', e);
    }
  };

  const t = (keyOrPhrase: string, fallback?: string): string => {
    if (!keyOrPhrase) return fallback || '';

    // If language is Portuguese and key is a phrase, return keyOrPhrase or translations.pt[keyOrPhrase]
    if (language === 'pt') {
      if (translations.pt && translations.pt[keyOrPhrase]) {
        return translations.pt[keyOrPhrase];
      }
      return fallback || keyOrPhrase;
    }

    // 1. Direct translation key lookup in the current language
    const currentLangDict = translations[language];
    if (currentLangDict && currentLangDict[keyOrPhrase]) {
      return currentLangDict[keyOrPhrase];
    }

    // 2. Direct phrase translation lookup (e.g. t('Pesquisar'))
    const currentPhraseDict = phraseTranslations[language];
    if (currentPhraseDict && currentPhraseDict[keyOrPhrase]) {
      return currentPhraseDict[keyOrPhrase];
    }

    // 3. Fallback translation key lookup if fallback was provided
    if (fallback) {
      if (currentLangDict && currentLangDict[fallback]) {
        return currentLangDict[fallback];
      }
      if (currentPhraseDict && currentPhraseDict[fallback]) {
        return currentPhraseDict[fallback];
      }
    }

    // 4. Default fallback to Portuguese dictionary
    if (translations.pt && translations.pt[keyOrPhrase]) {
      return translations.pt[keyOrPhrase];
    }

    return fallback || keyOrPhrase;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
