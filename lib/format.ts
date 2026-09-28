const eurFormat = new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 2 });

const sign = (v: number) => (v >= 0 ? "+" : "−");

export const eur = (v: number) => eurFormat.format(v);
export const signedEur = (v: number) => sign(v) + eurFormat.format(Math.abs(v));
export const pct = (v: number) => sign(v) + Math.abs(v).toFixed(1) + "%";

// Percentage change from `from` to `to`, 0 when there is nothing to compare with
export const change = (to: number, from: number) => (from > 0 ? ((to - from) / from) * 100 : 0);

export const deltaColor = (v: number) => (v >= 0 ? "text-gain" : "text-loss");
