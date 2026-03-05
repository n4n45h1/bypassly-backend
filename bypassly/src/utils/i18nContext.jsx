import { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { getT, LANGUAGES } from './i18n';

const I18nContext = createContext();

export const I18nProvider = ({ children }) => {
  const [lang, setLangState] = useState(
    () => localStorage.getItem('bypassly_lang') || 'en',
  );

  const setLang = useCallback((code) => {
    localStorage.setItem('bypassly_lang', code);
    setLangState(code);
  }, []);

  const t = useMemo(() => getT(lang), [lang]);

  const value = useMemo(() => ({ lang, setLang, t, LANGUAGES }), [lang, setLang, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export const useI18n = () => useContext(I18nContext);
