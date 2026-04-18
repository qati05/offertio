"use client";

import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { TRANSLATIONS, type Locale, type TranslationKey } from "./translations";
import { I18N, type Translations } from "./landing";

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
  /** Landing-page content for the active locale. Structural type — all locales share the shape of German. */
  landing: Translations;
}

const I18nContext = createContext<I18nContextType>({
  locale: "de",
  setLocale: () => {},
  t: (key) => key,
  landing: I18N.de,
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("de");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("offertio_locale") as Locale;
      if (saved && saved in TRANSLATIONS) {
        setLocaleState(saved);
      }
    } catch { /* ignore */ }
  }, []);

  const setLocale = useCallback((loc: Locale) => {
    setLocaleState(loc);
    try {
      localStorage.setItem("offertio_locale", loc);
    } catch { /* ignore */ }
  }, []);

  const t = useCallback(
    (key: TranslationKey, params?: Record<string, string | number>): string => {
      let text = TRANSLATIONS[locale][key] || TRANSLATIONS.de[key] || key;
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          text = text.replace(`{${k}}`, String(v));
        });
      }
      return text;
    },
    [locale]
  );

  const landing = useMemo(() => I18N[locale] as Translations, [locale]);

  return (
    <I18nContext.Provider value={{ locale, setLocale, t, landing }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useT() {
  return useContext(I18nContext);
}
