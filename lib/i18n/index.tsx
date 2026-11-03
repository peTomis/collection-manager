import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { isLocale, Locale, LOCALE_KEY, Messages, MESSAGES, setCurrentLocale } from "./core";

export * from "./core";

// The language picked in Settings, else the browser's when it is one we have
const readLocale = (): Locale => {
  try {
    const saved = localStorage.getItem(LOCALE_KEY);
    if (isLocale(saved)) return saved;
  } catch {}
  const browser = (navigator.languages?.length ? navigator.languages : [navigator.language]).map((l) => l.slice(0, 2).toLowerCase()).find(isLocale);
  return browser ?? "en";
};

interface I18nValue {
  locale: Locale;
  t: Messages;
  setLocale: (locale: Locale) => void;
}

const I18nContext = createContext<I18nValue>({ locale: "en", t: MESSAGES.en, setLocale: () => {} });

// The server renders English (it can't read localStorage); the saved or browser language takes over once the page is hydrated
export const I18nProvider = ({ children }: { children: ReactNode }) => {
  const [locale, setLocaleState] = useState<Locale>("en");
  // During render, so the lib/ labels its children compute are already in the new language
  setCurrentLocale(locale);

  useEffect(() => setLocaleState(readLocale()), []);
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = (l: Locale) => {
    try {
      localStorage.setItem(LOCALE_KEY, l);
    } catch {}
    setLocaleState(l);
  };

  return <I18nContext.Provider value={{ locale, t: MESSAGES[locale], setLocale }}>{children}</I18nContext.Provider>;
};

export const useI18n = () => useContext(I18nContext);
export const useT = () => useContext(I18nContext).t;
