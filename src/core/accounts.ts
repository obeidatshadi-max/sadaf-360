/**
 * Account-level calculations: growth, collection speed, credit use, health status and tender outcomes.
 * Pure functions; every date-dependent one takes an explicit `asOf`.
 */
import { daysBetween, roundJod, type Unavailable } from "./calc";

export type Segment = "Tender" | "Private";

/** Prior-year comparison. Unavailable (not zero) when there is no prior-year base. */
export function yoyGrowth(current: number, prior: number): number | Unavailable {
  return prior > 0 ? current / prior - 1 : "Data missing";
}

/**
 * Days sales outstanding, count-back style: outstanding / sales in the period x days in the period.
 * Only meaningful when the outstanding balance and the sales cover the same account and period; opening
 * receivables from before the period inflate it, so the result is a monitoring signal, not an audit figure.
 */
export function dso(outstanding: number, periodSales: number, periodDays: number): number | Unavailable {
  return periodSales > 0 && periodDays > 0 ? (outstanding / periodSales) * periodDays : "Data missing";
}

/** Share of the credit limit in use. No limit on file is "Data missing", never 0%. */
export function creditUtilization(outstanding: number, creditLimit: number): number | Unavailable {
  return creditLimit > 0 ? outstanding / creditLimit : "Data missing";
}

/** Days since a date (0 when it is the snapshot day). Throws on an invalid date, like the core. */
export const daysSince = (date: string, asOf: string): number => Math.max(0, daysBetween(date, asOf));

/** Days from the snapshot to a deadline; negative once it has passed. */
export const daysUntil = (deadline: string, asOf: string): number => daysBetween(asOf, deadline);

/** Won / (won + lost). Tenders still pending are excluded: they have no outcome yet. */
export function winRate(won: number, lost: number): number | Unavailable {
  return won + lost > 0 ? won / (won + lost) : "Data missing";
}

// ─── Account health status ───────────────────────────────────────────────────

export const STATUS_RULES = {
  /** An invoice more than this many days past due puts the account at risk. */
  atRiskOverdueDays: 90,
  /** Credit used above this share puts the account at risk. */
  atRiskCreditUse: 0.9,
  /** Sales below this share of the YTD target is a watch item. */
  watchAttainment: 0.85,
  /** Sales down more than this against last year is a watch item. */
  watchYoy: -0.1,
  /** Recurring consumable purchases below this share of estimated demand is a watch item. */
  watchCapture: 0.7,
  /** Private accounts that have not ordered for more than this many days are a watch item. */
  watchQuietDays: 45,
  /** A tender still in preparation with a deadline inside this many days is a watch item. */
  watchTenderDays: 14,
} as const;

export type StatusLevel = "At risk" | "Watch" | "Healthy";

export interface StatusInput {
  segment: Segment;
  /** Oldest unpaid invoice, in days past its contractual due date (0 when nothing is overdue). */
  maxOverdueDays: number;
  overdueAmount: number;
  creditUse: number | Unavailable;
  attainment: number | Unavailable;
  yoy: number | Unavailable;
  capture: number | Unavailable | null;
  daysSinceLastOrder: number | null;
  /** Deadlines (days from snapshot) of tenders still being prepared. */
  preparingTenderDays: number[];
}

export interface AccountStatus {
  level: StatusLevel;
  reasons: string[];
}

const pctText = (v: number) => `${Math.round(v * 100)}%`;

/** Health status with the reasons behind it, so the CEO sees why, not just a colour. */
export function accountStatus(i: StatusInput): AccountStatus {
  const risk: string[] = [];
  const watch: string[] = [];
  const R = STATUS_RULES;

  if (i.maxOverdueDays > R.atRiskOverdueDays) risk.push(`Invoice ${i.maxOverdueDays} days overdue`);
  else if (i.overdueAmount > 0) watch.push(`Overdue balance, oldest ${i.maxOverdueDays} days`);
  if (typeof i.creditUse === "number" && i.creditUse > R.atRiskCreditUse) risk.push(`Credit limit ${pctText(i.creditUse)} used`);
  if (typeof i.attainment === "number" && i.attainment < R.watchAttainment) watch.push(`Sales at ${pctText(i.attainment)} of target`);
  if (typeof i.yoy === "number" && i.yoy < R.watchYoy) watch.push(`Sales ${pctText(i.yoy)} against last year`);
  if (typeof i.capture === "number" && i.capture < R.watchCapture) watch.push(`Consumable purchases at ${pctText(i.capture)} of estimated demand`);
  if (i.segment === "Private" && i.daysSinceLastOrder !== null && i.daysSinceLastOrder > R.watchQuietDays)
    watch.push(`No order for ${i.daysSinceLastOrder} days`);
  for (const d of i.preparingTenderDays) if (d <= R.watchTenderDays) watch.push(d < 0 ? `Tender deadline passed ${-d} days ago` : `Tender deadline in ${d} days`);

  if (risk.length) return { level: "At risk", reasons: [...risk, ...watch] };
  if (watch.length) return { level: "Watch", reasons: watch };
  return { level: "Healthy", reasons: [] };
}

// ─── Segment aggregation ─────────────────────────────────────────────────────

export interface AccountFigures {
  sales: number;
  grossProfit: number;
  directCosts: number;
  priorSales: number;
  priorGrossProfit: number;
  target: number;
  collected: number;
  outstanding: number;
  overdue: number;
}

/** Totals and ratios for any group of accounts. Ratios are "Data missing" when their base is zero. */
export function summarize(rows: AccountFigures[], periodDays: number) {
  const sum = (k: keyof AccountFigures) => roundJod(rows.reduce((a, r) => a + r[k], 0));
  const sales = sum("sales");
  const grossProfit = sum("grossProfit");
  const outstanding = sum("outstanding");
  const overdue = sum("overdue");
  const target = sum("target");
  return {
    accounts: rows.length,
    sales,
    grossProfit,
    margin: sales > 0 ? grossProfit / sales : ("Data missing" as const),
    contribution: roundJod(grossProfit - sum("directCosts")),
    priorSales: sum("priorSales"),
    salesYoy: yoyGrowth(sales, sum("priorSales")),
    grossProfitYoy: yoyGrowth(grossProfit, sum("priorGrossProfit")),
    target,
    attainment: target > 0 ? sales / target : ("Data missing" as const),
    collected: sum("collected"),
    outstanding,
    overdue,
    overdueShare: outstanding > 0 ? overdue / outstanding : ("Data missing" as const),
    dso: dso(outstanding, sales, periodDays),
  };
}
