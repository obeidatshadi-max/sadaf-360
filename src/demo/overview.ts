/**
 * Guest-view overview, derived entirely from the synthetic dataset through the calculation core.
 * Pure (no React, no I/O) so every number on the guest screen is unit-testable.
 */
import {
  AGING_BUCKETS,
  expiryLoss,
  grossMargin,
  isCovered,
  dailyIssuesFromCover,
  isIsoDate,
  receivablesAging,
  repeatScenario,
  roundJod,
  tenderCostSplit,
  unsoldAtExpiry,
  valueGap,
  weightedTenderMargin,
  type AgreementStatus,
} from "@/core/calc";
import { DEMO_AS_OF, invoices, lines, stock, tenders, units, type BusinessLine, type LineName } from "./dataset";

/** Assumptions for the recurring-revenue scenario (shown on screen as assumptions, not facts). */
export const SCENARIO = { shareWon: 0.4, margin: 0.3 } as const;
/** A unit buying less than this share of its estimated demand is flagged for review. */
export const LOW_CAPTURE = 0.7;

export function lineRows() {
  return lines.map((l: BusinessLine) => ({
    name: l.name,
    sales: l.rev,
    grossProfit: l.gp,
    margin: grossMargin(l.rev, l.rev - l.gp),
    directCosts: l.cost,
    contribution: roundJod(l.gp - l.cost),
    contributionMargin: grossMargin(l.rev, l.rev - (l.gp - l.cost)),
    cashCollected: l.col,
  }));
}

export function totals() {
  const sales = roundJod(lines.reduce((a, l) => a + l.rev, 0));
  const grossProfit = roundJod(lines.reduce((a, l) => a + l.gp, 0));
  const directCosts = roundJod(lines.reduce((a, l) => a + l.cost, 0));
  const cashCollected = roundJod(lines.reduce((a, l) => a + l.col, 0));
  const consumables = lines.find((l) => l.name === "Consumables")!;
  return {
    sales,
    grossProfit,
    margin: grossMargin(sales, sales - grossProfit),
    directCosts,
    contribution: roundJod(grossProfit - directCosts),
    cashCollected,
    standaloneConsumables: roundJod(consumables.rev - consumables.rec),
  };
}

export function receivables() {
  const aging = receivablesAging(
    invoices.map((i) => ({ outstanding: i.value, dueDate: i.due })),
    DEMO_AS_OF,
  );
  return {
    ...aging,
    buckets: AGING_BUCKETS.map((b) => ({ bucket: b, amount: aging.buckets[b] })),
  };
}

export function stockRows() {
  const rows = stock.map((s) => {
    const dated = isIsoDate(s.expiry);
    const unsold = dated ? unsoldAtExpiry(s.qty, dailyIssuesFromCover(s.qty, s.months), s.expiry, DEMO_AS_OF) : 0;
    return { ...s, unsoldAtExpiry: unsold, expiryLoss: dated ? expiryLoss(unsold, s.value / s.qty) : 0 };
  });
  return {
    rows,
    totalValue: roundJod(rows.reduce((a, r) => a + r.value, 0)),
    // Estimated exposure; it overlaps with slow-stock value, so the two are never added together.
    expiryExposure: roundJod(rows.reduce((a, r) => a + r.expiryLoss, 0)),
    stockOutFlags: rows.filter((r) => r.risk === "Running-out risk").length,
  };
}

export function recurring() {
  const rows = units.map((u) => ({ ...u, ...valueGap(u.expected, u.actual) }));
  const expected = rows.reduce((a, u) => a + u.expected, 0);
  const actual = rows.reduce((a, u) => a + u.actual, 0);
  const cohort = valueGap(expected, actual);
  return {
    rows,
    expected,
    actual,
    gap: cohort.gap,
    capture: cohort.capture,
    lowCapture: rows.filter((u) => typeof u.capture === "number" && u.capture < LOW_CAPTURE).length,
    scenario: repeatScenario(cohort.gap, SCENARIO.shareWon, SCENARIO.margin),
  };
}

const AGREEMENT: Record<string, AgreementStatus> = { Active: "Active", "No contract": "No contract", Expiring: "Renewal due" };

export function service() {
  const statuses = units.map((u) => AGREEMENT[u.service] ?? "Data missing");
  // Workbook rule: a contract inside its renewal window still counts as covered until it expires.
  const covered = statuses.filter((s) => isCovered(s) === 1).length;
  return {
    units: units.length,
    covered,
    renewalDue: statuses.filter((s) => s === "Renewal due").length,
    noContract: statuses.filter((s) => s === "No contract").length,
    /** Units without an Active contract: need a renewal or conversion conversation. */
    actionNeeded: statuses.filter((s) => s !== "Active").length,
    coverage: units.length ? covered / units.length : 0,
  };
}

export function tenderRows() {
  const rows = tenders.map((t) => {
    const line = lines.find((l) => l.name === (t.line as LineName))!;
    const split = tenderCostSplit(t.value, line.gp / line.rev, t.margin / 100);
    return { ...t, ...split, plannedCost: roundJod(t.value - split.contribution) };
  });
  return {
    rows,
    totalValue: roundJod(rows.reduce((a, t) => a + t.value, 0)),
    weightedMargin: weightedTenderMargin(rows.map((t) => ({ value: t.value, plannedCost: t.plannedCost }))),
  };
}
