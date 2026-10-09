/**
 * Tender-versus-private account analysis, derived from the synthetic data through the calculation core.
 * Pure (no React, no I/O) so every number on the accounts screens is unit-testable.
 */
import { daysBetween, daysOverdue, roundJod, valueGap, weightedTenderMargin, type Unavailable } from "@/core/calc";
import {
  accountStatus,
  creditUtilization,
  daysSince,
  daysUntil,
  dso,
  summarize,
  winRate,
  yoyGrowth,
  type AccountStatus,
  type AccountFigures,
} from "@/core/accounts";
import { DEMO_AS_OF, invoices, tenders, units, type LineName } from "./dataset";
import { DEMO_PERIOD_END, DEMO_PERIOD_START, accounts, tenderHistory, tenderProgress, type AccountSeed, type Segment } from "./accounts-dataset";

export type View = "all" | "tender" | "private";
export const VIEWS: { key: View; label: string }[] = [
  { key: "all", label: "All accounts" },
  { key: "tender", label: "Tender accounts" },
  { key: "private", label: "Private accounts" },
];

/** Days in the year-to-date period (both ends included). */
export const PERIOD_DAYS = daysBetween(DEMO_PERIOD_START, DEMO_PERIOD_END) + 1;
/** Months elapsed in the period, for order cadence. */
export const PERIOD_MONTHS = 9;

const LINES: LineName[] = ["Equipment", "Devices", "Consumables"];

export interface AccountRow {
  seed: AccountSeed;
  sales: number;
  grossProfit: number;
  directCosts: number;
  margin: number;
  contribution: number;
  byLine: Record<LineName, { sales: number; grossProfit: number; margin: number | Unavailable }>;
  salesYoy: number | Unavailable;
  grossProfitYoy: number | Unavailable;
  attainment: number | Unavailable;
  /** Share of the company's gross profit. */
  gpShare: number;
  outstanding: number;
  overdue: number;
  maxOverdueDays: number;
  notDue: number;
  creditUse: number | Unavailable;
  dso: number | Unavailable;
  daysSinceLastOrder: number;
  avgOrderValue: number | Unavailable;
  /** Recurring consumables captured against estimated demand for the account's installed units (null: no units on record). */
  capture: number | Unavailable | null;
  unitCount: number;
  unitsCovered: number;
  status: AccountStatus;
}

const figures = (r: AccountRow): AccountFigures => ({
  sales: r.sales,
  grossProfit: r.grossProfit,
  directCosts: r.directCosts,
  priorSales: r.seed.priorSales,
  priorGrossProfit: r.seed.priorGrossProfit,
  target: r.seed.target,
  collected: r.seed.collected,
  outstanding: r.outstanding,
  overdue: r.overdue,
});

let cache: AccountRow[] | null = null;

export function allAccountRows(): AccountRow[] {
  if (cache) return cache;
  const companyGp = accounts.reduce((a, s) => a + LINES.reduce((b, l) => b + s.byLine[l].grossProfit, 0), 0);
  cache = accounts.map((seed) => {
    const sum = (k: "sales" | "grossProfit" | "directCosts") => roundJod(LINES.reduce((a, l) => a + seed.byLine[l][k], 0));
    const sales = sum("sales");
    const grossProfit = sum("grossProfit");
    const directCosts = sum("directCosts");

    const own = invoices.filter((i) => i.account === seed.name && daysOverdue(i.value, i.due, DEMO_AS_OF) > 0);
    const overdue = roundJod(own.reduce((a, i) => a + i.value, 0));
    const maxOverdueDays = own.reduce((m, i) => Math.max(m, daysOverdue(i.value, i.due, DEMO_AS_OF)), 0);

    const myUnits = units.filter((u) => u.account === seed.name);
    const expected = myUnits.reduce((a, u) => a + u.expected, 0);
    const actual = myUnits.reduce((a, u) => a + u.actual, 0);
    const capture = myUnits.length ? valueGap(expected, actual).capture : null;
    // Workbook rule: a contract inside its renewal window still counts as covered until it expires.
    const unitsCovered = myUnits.filter((u) => u.service !== "No contract").length;

    const creditUse = creditUtilization(seed.outstanding, seed.creditLimit);
    const attainment = seed.target > 0 ? sales / seed.target : ("Data missing" as const);
    const salesYoy = yoyGrowth(sales, seed.priorSales);
    const lastOrderDays = daysSince(seed.lastOrder, DEMO_AS_OF);
    const preparingTenderDays = tenders
      .filter((t) => t.account === seed.name && t.stage === "Preparing")
      .map((t) => daysUntil(t.due, DEMO_AS_OF));

    const row: AccountRow = {
      seed,
      sales,
      grossProfit,
      directCosts,
      margin: grossProfit / sales,
      contribution: roundJod(grossProfit - directCosts),
      byLine: Object.fromEntries(
        LINES.map((l) => [l, { sales: seed.byLine[l].sales, grossProfit: seed.byLine[l].grossProfit, margin: seed.byLine[l].sales > 0 ? seed.byLine[l].grossProfit / seed.byLine[l].sales : "Data missing" }]),
      ) as AccountRow["byLine"],
      salesYoy,
      grossProfitYoy: yoyGrowth(grossProfit, seed.priorGrossProfit),
      attainment,
      gpShare: grossProfit / companyGp,
      outstanding: seed.outstanding,
      overdue,
      maxOverdueDays,
      notDue: roundJod(seed.outstanding - overdue),
      creditUse,
      dso: dso(seed.outstanding, sales, PERIOD_DAYS),
      daysSinceLastOrder: lastOrderDays,
      avgOrderValue: seed.ordersYtd > 0 ? sales / seed.ordersYtd : "Data missing",
      capture,
      unitCount: myUnits.length,
      unitsCovered,
      status: { level: "Healthy", reasons: [] },
    };
    row.status = accountStatus({
      segment: seed.segment,
      maxOverdueDays,
      overdueAmount: overdue,
      creditUse,
      attainment,
      yoy: salesYoy,
      capture,
      daysSinceLastOrder: lastOrderDays,
      preparingTenderDays,
    });
    return row;
  });
  return cache;
}

const inView = (v: View) => (r: AccountRow) => v === "all" || r.seed.segment === (v === "tender" ? "Tender" : "Private");

export function viewRows(view: View): AccountRow[] {
  return allAccountRows()
    .filter(inView(view))
    .sort((a, b) => b.grossProfit - a.grossProfit);
}

export function viewSummary(view: View) {
  const rows = viewRows(view);
  const s = summarize(rows.map(figures), PERIOD_DAYS);
  const total = allAccountRows().reduce((a, r) => a + r.grossProfit, 0);
  const sorted = [...rows].sort((a, b) => b.sales - a.sales);
  return {
    ...s,
    gpShare: total > 0 ? s.grossProfit / total : ("Data missing" as const),
    atRisk: rows.filter((r) => r.status.level === "At risk").length,
    watch: rows.filter((r) => r.status.level === "Watch").length,
    healthy: rows.filter((r) => r.status.level === "Healthy").length,
    topAccountShare: s.sales > 0 && sorted[0] ? sorted[0].sales / s.sales : ("Data missing" as const),
    ordersYtd: rows.reduce((a, r) => a + r.seed.ordersYtd, 0),
  };
}

/** Tender vs private side by side, plus the company total they must add up to. */
export function segmentComparison() {
  return { tender: viewSummary("tender"), private: viewSummary("private"), all: viewSummary("all") };
}

// ─── Tender board ────────────────────────────────────────────────────────────

export type TenderStageGroup = "Pipeline" | "Delivering" | "Collecting";
const GROUP: Record<string, TenderStageGroup> = { Preparing: "Pipeline", Submitted: "Pipeline", "Won · delivery": "Delivering", Delivered: "Collecting" };

export function tenderBoard() {
  const rows = tenders.map((t) => {
    const p = tenderProgress[t.id]!;
    const delivered = roundJod((t.value * p.deliveredPct) / 100);
    return {
      ...t,
      group: GROUP[t.stage] ?? ("Pipeline" as TenderStageGroup),
      daysToDeadline: daysUntil(t.due, DEMO_AS_OF),
      deliveredPct: p.deliveredPct,
      toDeliver: roundJod(t.value - delivered),
      deliveredNotInvoiced: roundJod(delivered - p.invoiced),
      invoiced: p.invoiced,
      collected: p.collected,
      invoicedNotCollected: roundJod(p.invoiced - p.collected),
      guarantee: { ...p.guarantee, daysToExpiry: daysUntil(p.guarantee.expires, DEMO_AS_OF) },
      plannedProfit: roundJod((t.value * t.margin) / 100),
    };
  });
  const open = rows.filter((r) => r.group === "Pipeline");
  const by = (g: TenderStageGroup) => rows.filter((r) => r.group === g);
  const sum = (rs: typeof rows, k: "value" | "toDeliver" | "deliveredNotInvoiced" | "invoicedNotCollected") => roundJod(rs.reduce((a, r) => a + r[k], 0));
  const nextDeadline = open.filter((r) => r.daysToDeadline >= 0).sort((a, b) => a.daysToDeadline - b.daysToDeadline)[0];
  return {
    rows,
    pipeline: { count: open.length, value: sum(open, "value"), plannedMargin: weightedTenderMargin(open.map((r) => ({ value: r.value, plannedCost: r.value - r.plannedProfit }))) },
    delivering: { count: by("Delivering").length, backlogToDeliver: sum(by("Delivering"), "toDeliver") },
    collecting: { count: by("Collecting").length, invoicedNotCollected: sum(rows, "invoicedNotCollected") },
    deliveredNotInvoiced: sum(rows, "deliveredNotInvoiced"),
    nextDeadline: nextDeadline ? { id: nextDeadline.id, days: nextDeadline.daysToDeadline } : null,
    history: {
      ...tenderHistory,
      winRate: winRate(tenderHistory.won, tenderHistory.lost),
      avgWonValue: tenderHistory.won > 0 ? roundJod(tenderHistory.valueWon / tenderHistory.won) : ("Data missing" as const),
    },
  };
}

// ─── Private view extras ─────────────────────────────────────────────────────

export function privateInsights() {
  const rows = viewRows("private");
  const withUnits = rows.filter((r) => r.unitCount > 0);
  const cohort = valueGap(
    units.filter((u) => rows.some((r) => r.seed.name === u.account)).reduce((a, u) => a + u.expected, 0),
    units.filter((u) => rows.some((r) => r.seed.name === u.account)).reduce((a, u) => a + u.actual, 0),
  );
  return {
    quiet: rows.filter((r) => r.status.reasons.some((x) => x.startsWith("No order"))).length,
    capture: cohort.capture,
    monthlyGap: cohort.gap,
    unitCount: withUnits.reduce((a, r) => a + r.unitCount, 0),
    unitsCovered: withUnits.reduce((a, r) => a + r.unitsCovered, 0),
    ordersPerMonth: rows.reduce((a, r) => a + r.seed.ordersYtd, 0) / PERIOD_MONTHS,
  };
}

export type { Segment };
