import en, { Messages } from "./en";
import it from "./it";

export type Locale = "en" | "it";

export type { Messages };

// Each language is named in itself in the switch
export const LOCALES: { value: Locale; label: string }[] = [
  { value: "en", label: "English" },
  { value: "it", label: "Italiano" },
];

export const MESSAGES: Record<Locale, Messages> = { en, it };

// Tags for Intl: prices, numbers and dates follow the language (euros are "1.234,56 €" in Italian)
const INTL: Record<Locale, string> = { en: "en-IE", it: "it-IT" };

// localStorage key of the language picked in Settings
export const LOCALE_KEY = "locale";

// The language of the code outside React (labels in lib/, formats), kept in step by I18nProvider (lib/i18n/index.tsx).
// Server code and tests stay in English.
let current: Locale = "en";
export const getLocale = () => current;
export const setCurrentLocale = (locale: Locale) => {
  current = locale;
};
export const messages = () => MESSAGES[current];
export const intlLocale = () => INTL[current];

export const isLocale = (value: unknown): value is Locale => value === "en" || value === "it";
