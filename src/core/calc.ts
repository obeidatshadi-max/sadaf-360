/**
 * Sadaf 360 calculation core. Pure functions, no I/O, no dates read from the clock:
 * every date-dependent function takes an explicit `asOf` so results are reproducible.
 * Mirrors the "Worked examples" sheet of the inputs workbook.
 */

export type Unavailable = 'Data missing' | 'No recent use' | 'No target';

const DAY_MS = 86_400_000;
const AVG_DAYS_PER_MONTH = 30.4375;

/** True only for a real calendar date written YYYY-MM-DD (rejects 2026-02-30 and free text). */
export function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const t = Date.parse(`${value}T00:00:00Z`);
  return !Number.isNaN(t) && new Date(t).toISOString().slice(0, 10) === value;
}

function assertDate(value: string, label: string): void {
  if (!isIsoDate(value)) throw new RangeError(`${label} is not a valid YYYY-MM-DD date: "${value}"`);
}

/** JOD has 1,000 fils: round money to 3 decimals so float noise (172.79999999999998) never reaches a report. */
export const roundJod = (n: number): number => Math.round((n + Number.EPSILON) * 1000) / 1000;

/** Whole days from `from` to `to` (UTC dates, time ignored). Throws on an invalid date instead of returning NaN. */
export function daysBetween(from: string, to: string): number {
  assertDate(from, "from");
  assertDate(to, "to");
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS);
}

export const grossProfit = (sales: number, productCost: number) => roundJod(sales - productCost);

export function grossMargin(sales: number, productCost: number): number | Unavailable {
  return sales === 0 ? 'Data missing' : (sales - productCost) / sales;
}

/** Days past the contractual due date at the snapshot; 0 when paid or not yet due. */
export function daysOverdue(outstanding: number, dueDate: string, asOf: string): number {
  return outstanding > 0 ? Math.max(0, daysBetween(dueDate, asOf)) : 0;
}

export interface OpenInvoice {
  outstanding: number;
  dueDate: string;
}

export const AGING_BUCKETS = ['Not due', '1-30', '31-60', '61-90', '90+'] as const;
export type AgingBucket = (typeof AGING_BUCKETS)[number];

export function agingBucket(days: number): AgingBucket {
  if (days <= 0) return 'Not due';
  if (days <= 30) return '1-30';
  if (days <= 60) return '31-60';
  if (days <= 90) return '61-90';
  return '90+';
}

/** Total receivables split by age bucket, from the contractual due date. */
export function receivablesAging(invoices: OpenInvoice[], asOf: string) {
  const buckets = Object.fromEntries(AGING_BUCKETS.map((b) => [b, 0])) as Record<AgingBucket, number>;
  for (const inv of invoices) {
    if (inv.outstanding <= 0) continue;
    buckets[agingBucket(daysBetween(inv.dueDate, asOf))] += inv.outstanding;
  }
  for (const b of AGING_BUCKETS) buckets[b] = roundJod(buckets[b]);
  const total = roundJod(AGING_BUCKETS.reduce((s, b) => s + buckets[b], 0));
  const overdue = roundJod(total - buckets['Not due']);
  return { buckets, total, overdue };
}

export const stockValue = (qty: number, unitCost: number) => roundJod(qty * unitCost);

export function stockCoverDays(qty: number, avgDailyIssues: number): number | Unavailable {
  return avgDailyIssues <= 0 ? 'No recent use' : qty / avgDailyIssues;
}

/**
 * Units a single batch cannot sell before expiry, assuming stable demand.
 * Whole pieces, rounded down. Real systems must allocate demand across batches earliest-expiry-first.
 */
export function unsoldAtExpiry(qty: number, avgDailyIssues: number, expiry: string, asOf: string): number {
  const daysLeft = Math.max(0, daysBetween(asOf, expiry));
  const sellable = Math.floor(daysLeft * Math.max(0, avgDailyIssues));
  return Math.max(0, qty - sellable);
}

/** Estimated, not confirmed, loss. Overlaps with slow-stock value; never add the two. */
export const expiryLoss = (unsold: number, unitCost: number) => roundJod(unsold * unitCost);

/** Average daily issues implied by a stock cover in months. Zero cover means no usable demand figure: returns 0. */
export const dailyIssuesFromCover = (qty: number, coverMonths: number) =>
  coverMonths > 0 ? qty / (coverMonths * AVG_DAYS_PER_MONTH) : 0;

export interface MonthlyUnitInput {
  activityCount: number;
  consumablesPerActivity: number;
  referencePrice: number;
  purchasedQty: number;
}

/** Estimated demand vs purchases for one unit-month. A gap is an investigation, not a confirmed loss. */
export function purchaseGap(i: MonthlyUnitInput) {
  const expectedQty = i.activityCount * i.consumablesPerActivity;
  const expectedValue = roundJod(expectedQty * i.referencePrice);
  const purchasedValue = roundJod(i.purchasedQty * i.referencePrice);
  return {
    expectedQty,
    expectedValue,
    purchasedValue,
    gap: roundJod(expectedValue - purchasedValue),
    capture: expectedQty === 0 ? ('Data missing' as const) : i.purchasedQty / expectedQty,
  };
}

export function customerStockDays(
  customerQty: number,
  expectedMonthlyQty: number,
  daysInMonth: number,
): number | Unavailable {
  return expectedMonthlyQty === 0 ? 'No recent use' : customerQty / (expectedMonthlyQty / daysInMonth);
}

export function equipmentUseRate(activity: number, practicalCapacity: number): number | Unavailable {
  return practicalCapacity === 0 ? 'Data missing' : activity / practicalCapacity;
}

/** Scenario only: monthly gap x assumed share won x 12. Overlapping signals must not be summed. */
export function repeatScenario(monthlyGap: number, shareWon: number, margin: number) {
  const extraSales = roundJod(Math.max(0, monthlyGap) * shareWon * 12);
  return { extraSales, extraProfit: roundJod(extraSales * margin) };
}

export interface Tender {
  value: number;
  plannedCost: number;
}

export const plannedTenderProfit = (t: Tender) => roundJod(t.value - t.plannedCost);

/** Weighted margin = total planned profit / total value. */
export function weightedTenderMargin(tenders: Tender[]): number | Unavailable {
  const value = tenders.reduce((s, t) => s + t.value, 0);
  if (value === 0) return 'Data missing';
  return tenders.reduce((s, t) => s + plannedTenderProfit(t), 0) / value;
}

/**
 * Splits a tender value into product cost and freight/installation/training/warranty,
 * given the business line's gross margin and the tender's planned contribution margin.
 */
export function tenderCostSplit(value: number, lineGrossMargin: number, plannedMargin: number) {
  return {
    productCost: roundJod(value * (1 - lineGrossMargin)),
    fulfillment: roundJod(value * (lineGrossMargin - plannedMargin)),
    contribution: roundJod(value * plannedMargin),
  };
}

export interface Agreement {
  held: 'Yes' | 'No' | 'Unknown';
  start?: string;
  end?: string;
}
export type AgreementStatus = 'No contract' | 'Data missing' | 'Not started' | 'Expired' | 'Renewal due' | 'Active';

export function agreementStatus(a: Agreement, asOf: string, renewalWarningDays = 30): AgreementStatus {
  if (a.held === 'No') return 'No contract';
  if (a.held !== 'Yes' || !a.start || !a.end || !isIsoDate(a.start) || !isIsoDate(a.end)) return 'Data missing';
  assertDate(asOf, 'asOf');
  if (a.start > asOf) return 'Not started';
  if (a.end < asOf) return 'Expired';
  if (daysBetween(asOf, a.end) <= renewalWarningDays) return 'Renewal due';
  return 'Active';
}

/** Renewal-due still counts as covered until expiry. */
export const isCovered = (s: AgreementStatus): 1 | 0 | 'Data missing' =>
  s === 'Data missing' ? 'Data missing' : s === 'Active' || s === 'Renewal due' ? 1 : 0;

/** Review signal only, not a replacement requirement. */
export function ageReview(installed: string | undefined, asOf: string, thresholdYears = 5): 'Review age' | 'Below threshold' | 'Data missing' {
  if (!installed || !isIsoDate(installed)) return 'Data missing';
  assertDate(asOf, 'asOf');
  const d = new Date(`${installed}T00:00:00Z`);
  d.setUTCFullYear(d.getUTCFullYear() + thresholdYears);
  return d.toISOString().slice(0, 10) <= asOf ? 'Review age' : 'Below threshold';
}

/** Attainment against a target for the SAME scope and month (never a project vs a category target). */
export const attainment = (actual: number, target: number): number | Unavailable =>
  target <= 0 ? 'No target' : actual / target;
