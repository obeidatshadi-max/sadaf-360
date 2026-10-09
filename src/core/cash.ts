/**
 * Cash collected from customer receipts. Pure: aggregated sums in, figures out.
 * Every receipt allocation is counted once. Cash not linked to an invoice is part of the total and is also shown on
 * its own, so nobody has to guess how much of the total is unapplied.
 */
import { roundJod, type Unavailable } from "./calc";
import { yoyGrowth } from "./accounts";

export interface CashSums {
  ytd: number;
  priorYtd: number;
  last30: number;
  /** Part of year-to-date cash that is not linked to an invoice. */
  unlinkedYtd: number;
  byMonth: { month: string; amount: number }[];
}

export interface CashReport {
  ytd: number;
  priorYtd: number;
  growth: number | Unavailable;
  last30: number;
  unlinkedYtd: number;
  /** One entry per month from January to the current month; a month with no receipts is 0. */
  months: { month: string; amount: number }[];
}

export function buildCash(s: CashSums, today: string): CashReport {
  const year = today.slice(0, 4);
  const thisMonth = Number(today.slice(5, 7));
  const amounts = new Map(s.byMonth.map((m) => [m.month, m.amount]));
  const months = Array.from({ length: thisMonth }, (_, i) => {
    const month = `${year}-${String(i + 1).padStart(2, "0")}`;
    return { month, amount: roundJod(amounts.get(month) ?? 0) };
  });
  return {
    ytd: roundJod(s.ytd),
    priorYtd: roundJod(s.priorYtd),
    growth: yoyGrowth(s.ytd, s.priorYtd),
    last30: roundJod(s.last30),
    unlinkedYtd: roundJod(s.unlinkedYtd),
    months,
  };
}
