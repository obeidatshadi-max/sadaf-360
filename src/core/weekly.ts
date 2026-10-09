/**
 * Week-on-week change. Pure. A week is the 7 days ending today (today included); "before" is the 7 days ahead of that.
 * A change against a base of zero is "—", never a percentage.
 */
import { roundJod, type Unavailable } from "./calc";

export interface Change {
  now: number;
  before: number;
  delta: number;
  /** Relative change, or "Data missing" when there is nothing to compare with. */
  pct: number | Unavailable;
}

export function change(now: number, before: number): Change {
  return { now: roundJod(now), before: roundJod(before), delta: roundJod(now - before), pct: before > 0 ? now / before - 1 : "Data missing" };
}

/** First and last day of the current and previous 7-day windows. */
export function weekWindows(today: string) {
  const shift = (iso: string, days: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
  return { thisFrom: shift(today, -6), thisTo: today, prevFrom: shift(today, -13), prevTo: shift(today, -7) };
}
