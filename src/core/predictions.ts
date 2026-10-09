/**
 * Prediction helpers: when a customer should reorder, how late a customer usually pays, and which
 * opportunities to show first. Pure functions; every date-dependent one takes an explicit `asOf`.
 *
 * These are ESTIMATES from the customer's own history, not facts. Each result carries `label: "ESTIMATED"`,
 * and below the minimum history the result is "Not enough data" rather than a guess.
 * Expected-versus-actual consumables gaps live in `calc.ts` (`purchaseGap`, `valueGap`, `repeatScenario`).
 */
import { daysBetween, roundJod } from "./calc";

export const ESTIMATED = "ESTIMATED" as const;
export type NotEnoughData = "Not enough data";

/** Distinct order days needed before a reorder cycle is estimated (4 orders = 3 intervals). */
export const MIN_ORDERS = 4;
/** Paid invoices needed before a customer's payment lateness is estimated. */
export const MIN_PAID_INVOICES = 5;

function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/** Nearest-rank percentile, p in (0, 1]. */
function percentile(values: number[], p: number): number {
  const s = [...values].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.max(0, Math.ceil(p * s.length) - 1))];
}

// ─── Repurchase timing ───────────────────────────────────────────────────────

export type RepurchaseLevel = "On cycle" | "Due soon" | "Overdue" | "Lapsed";

export interface RepurchaseForecast {
  label: typeof ESTIMATED;
  orders: number;
  /** Typical days between orders (median). */
  cycleDays: number;
  lastOrder: string;
  /** Last order + cycle, as a YYYY-MM-DD date. */
  expectedNext: string;
  /** Negative once the expected date has passed. */
  daysToNext: number;
  level: RepurchaseLevel;
  /** Lower when the customer's intervals vary a lot, so the cycle is a weak signal. */
  confidence: "Higher" | "Lower";
}

function addDays(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
}

/**
 * Typical reorder cycle and whether the customer is on, past or far past it.
 * Same-day orders count once. Orders dated after `asOf` throw: a future order means a bad import.
 */
export function repurchaseForecast(orderDates: string[], asOf: string): RepurchaseForecast | NotEnoughData {
  const days = [...new Set(orderDates)].sort();
  for (const d of days) if (daysBetween(d, asOf) < 0) throw new RangeError(`Order date ${d} is after asOf ${asOf}`);
  if (days.length < MIN_ORDERS) return "Not enough data";

  const intervals = days.slice(1).map((d, i) => daysBetween(days[i], d));
  const cycleDays = median(intervals);
  const lastOrder = days[days.length - 1];
  const expectedNext = addDays(lastOrder, Math.round(cycleDays));
  const daysToNext = daysBetween(asOf, expectedNext);
  const sinceLast = daysBetween(lastOrder, asOf);

  const grace = Math.max(7, Math.round(cycleDays * 0.25));
  const soon = Math.max(7, Math.round(cycleDays * 0.2));
  let level: RepurchaseLevel;
  if (sinceLast > cycleDays * 3) level = "Lapsed";
  else if (daysToNext < -grace) level = "Overdue";
  else if (daysToNext <= soon) level = "Due soon";
  else level = "On cycle";

  const spread = median(intervals.map((i) => Math.abs(i - cycleDays)));
  return {
    label: ESTIMATED,
    orders: days.length,
    cycleDays,
    lastOrder,
    expectedNext,
    daysToNext,
    level,
    confidence: cycleDays > 0 && spread / cycleDays > 0.5 ? "Lower" : "Higher",
  };
}

// ─── Payment behaviour and cash forecast ─────────────────────────────────────

export interface PaidInvoice {
  dueDate: string;
  paidDate: string;
}

export interface PaymentBehaviour {
  label: typeof ESTIMATED;
  paidInvoices: number;
  /** Typical days after the due date the customer pays; negative means early. */
  medianDaysLate: number;
  /** Days late that 80% of invoices stay within: a cautious view. */
  p80DaysLate: number;
  /** Share of paid invoices settled after the due date. */
  shareLate: number;
}

export function paymentBehaviour(paid: PaidInvoice[]): PaymentBehaviour | NotEnoughData {
  if (paid.length < MIN_PAID_INVOICES) return "Not enough data";
  const late = paid.map((p) => daysBetween(p.dueDate, p.paidDate));
  return {
    label: ESTIMATED,
    paidInvoices: paid.length,
    medianDaysLate: median(late),
    p80DaysLate: percentile(late, 0.8),
    shareLate: late.filter((d) => d > 0).length / late.length,
  };
}

export interface OpenCustomerInvoice {
  customerId: string;
  outstanding: number;
  dueDate: string;
}

export interface CashForecast {
  label: typeof ESTIMATED;
  /** Cumulative expected collections inside each window, using each customer's typical payment day. */
  windows: { days: number; amount: number }[];
  /** Invoices already later than the customer's typical payment day: timing is unreliable, so not counted in windows. */
  pastTypical: number;
  /** Invoices of customers without enough payment history: not forecast, not guessed. */
  notForecast: number;
  /** Invoices expected after the longest window. */
  later: number;
}

/**
 * Expected collections in the next N days. Each open invoice is placed on its due date plus the customer's
 * median lateness. Amounts are partitioned, never double counted:
 * windows + later + pastTypical + notForecast = total outstanding.
 */
export function cashForecast(
  open: OpenCustomerInvoice[],
  behaviour: Map<string, PaymentBehaviour | NotEnoughData>,
  asOf: string,
  horizons: number[] = [30, 60, 90],
): CashForecast {
  const sorted = [...horizons].sort((a, b) => a - b);
  const windows = sorted.map((days) => ({ days, amount: 0 }));
  let pastTypical = 0;
  let notForecast = 0;
  let later = 0;
  for (const inv of open) {
    if (inv.outstanding <= 0) continue;
    const b = behaviour.get(inv.customerId);
    if (!b || b === "Not enough data") {
      notForecast += inv.outstanding;
      continue;
    }
    const daysToPay = daysBetween(asOf, inv.dueDate) + Math.round(b.medianDaysLate);
    if (daysToPay < 0) {
      pastTypical += inv.outstanding;
      continue;
    }
    const w = windows.find((x) => daysToPay <= x.days);
    if (w) w.amount += inv.outstanding;
    else later += inv.outstanding;
  }
  let running = 0;
  const cumulative = windows.map((w) => ({ days: w.days, amount: roundJod((running += w.amount)) }));
  return {
    label: ESTIMATED,
    windows: cumulative,
    pastTypical: roundJod(pastTypical),
    notForecast: roundJod(notForecast),
    later: roundJod(later),
  };
}

// ─── Opportunity ranking ─────────────────────────────────────────────────────

export interface OpportunitySignal {
  customerId: string;
  kind: string;
  /** Estimated JOD value of this signal. */
  value: number;
}

export interface RankedOpportunity {
  customerId: string;
  kind: string;
  value: number;
  /** Other signals on the same customer. They overlap with the main one, so their value is not added. */
  alsoFlagged: string[];
}

/**
 * One line per customer: the largest signal, with the others named but not summed. Signals on the same
 * customer describe the same money from different angles, so adding them would overstate the opportunity.
 */
export function rankOpportunities(signals: OpportunitySignal[], limit = 10) {
  const byCustomer = new Map<string, OpportunitySignal[]>();
  for (const s of signals) {
    if (s.value <= 0) continue;
    byCustomer.set(s.customerId, [...(byCustomer.get(s.customerId) ?? []), s]);
  }
  const ranked: RankedOpportunity[] = [...byCustomer.values()]
    .map((list) => {
      const [top, ...rest] = [...list].sort((a, b) => b.value - a.value);
      return { customerId: top.customerId, kind: top.kind, value: roundJod(top.value), alsoFlagged: rest.map((r) => r.kind) };
    })
    .sort((a, b) => b.value - a.value || a.customerId.localeCompare(b.customerId));
  return { label: ESTIMATED, items: ranked.slice(0, limit), total: roundJod(ranked.reduce((s, r) => s + r.value, 0)) };
}
