import { intlLocale } from "@/lib/i18n/core";

// One formatter per language: euros are "€1,234.56" in English and "1.234,56 €" in Italian
const eurFormats = new Map<string, Intl.NumberFormat>();
const pctFormats = new Map<string, Intl.NumberFormat>();
const formatter = (cache: Map<string, Intl.NumberFormat>, options: Intl.NumberFormatOptions) => {
  const locale = intlLocale();
  if (!cache.has(locale)) cache.set(locale, new Intl.NumberFormat(locale, options));
  return cache.get(locale)!;
};
const eurFormat = () => formatter(eurFormats, { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pctFormat = () => formatter(pctFormats, { minimumFractionDigits: 1, maximumFractionDigits: 1, useGrouping: false });

const sign = (v: number) => (v >= 0 ? "+" : "−");

export const eur = (v: number) => eurFormat().format(v);
export const signedEur = (v: number) => sign(v) + eurFormat().format(Math.abs(v));
export const pct = (v: number) => sign(v) + pctFormat().format(Math.abs(v)) + "%";

// Percentage change from `from` to `to`, 0 when there is nothing to compare with
export const change = (to: number, from: number) => (from > 0 ? ((to - from) / from) * 100 : 0);

export const deltaColor = (v: number) => (v >= 0 ? "text-gain" : "text-loss");
