const nf = new Intl.NumberFormat("en-US", { maximumFractionDigits: 3 });

/** "JOD 1,234" (fils shown only when present). */
export const jod = (n: number): string => `JOD ${nf.format(n)}`;

/** Compact form for headline tiles: JOD 4.53M, JOD 117.5K, JOD 6,000. */
export function jodShort(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 999_950) return `JOD ${(n / 1e6).toFixed(2)}M`;
  if (abs >= 1000) return `JOD ${(n / 1e3).toFixed(1)}K`;
  return jod(n);
}

/** Ratio as a percentage; unavailable values (for example "Data missing") show as an em dash. */
export const pct = (v: number | string, digits = 0): string => (typeof v === "number" ? `${(v * 100).toFixed(digits)}%` : "—");

/** Signed percentage for growth: +10.0%, -6.3%. Unavailable values show as an em dash. */
export const signedPct = (v: number | string, digits = 1): string =>
  typeof v === "number" ? `${v >= 0 ? "+" : "-"}${Math.abs(v * 100).toFixed(digits)}%` : "—";

/** Whole days, for ageing columns. */
export const daysText = (n: number | string): string => (typeof n === "number" ? `${Math.round(n)} d` : "—");
