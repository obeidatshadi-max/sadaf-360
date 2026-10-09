/**
 * Stock risk from one stock snapshot plus recent issues. Pure: rows in, figures out.
 *
 * - Only stock Sadaf owns is valued. A row with no unit cost is counted but left out of value, never valued at zero.
 * - Cover = quantity / average daily issues over the look-back window. No issues in the window = "No recent use".
 * - Expiry risk is ESTIMATED: stock that current demand cannot sell before expiry, earliest expiry served first.
 *   It overlaps with slow stock, so the two are never added together.
 */
import { daysBetween, roundJod, stockCoverDays } from "./calc";

export const SLOW_COVER_DAYS = 365;
export const EXPIRY_WINDOW_DAYS = 180;

export interface StockBatch {
  productCode: string;
  productName: string;
  line: string;
  batch: string;
  quantity: number;
  unitCost: number | null;
  expiryDate: string | null;
}

export interface SlowProduct {
  productCode: string;
  productName: string;
  line: string;
  quantity: number;
  value: number;
  coverDays: number | "No recent use";
}

export interface ExpiryRisk {
  productCode: string;
  productName: string;
  batch: string;
  expiryDate: string;
  daysLeft: number;
  quantity: number;
  unsold: number;
  /** Estimated loss at cost: unsold units x unit cost. */
  estimatedLoss: number;
  expired: boolean;
}

export interface StockRiskReport {
  stockValue: number;
  rows: number;
  rowsWithoutCost: number;
  slowValue: number;
  slowProducts: SlowProduct[];
  expiredValue: number;
  expiryLossEstimate: number;
  expiryRisks: ExpiryRisk[];
}

export function buildStockRisk(
  batches: StockBatch[],
  /** Average daily customer issues per product code over the look-back window. */
  dailyIssues: Map<string, number>,
  asOf: string,
  topN = 10,
): StockRiskReport {
  let stockValue = 0;
  let rowsWithoutCost = 0;
  const perProduct = new Map<string, SlowProduct>();
  for (const b of batches) {
    if (b.quantity <= 0) continue;
    if (b.unitCost === null) {
      rowsWithoutCost += 1;
      continue;
    }
    const value = b.quantity * b.unitCost;
    stockValue += value;
    const p = perProduct.get(b.productCode) ?? { productCode: b.productCode, productName: b.productName, line: b.line, quantity: 0, value: 0, coverDays: "No recent use" as const };
    p.quantity += b.quantity;
    p.value += value;
    perProduct.set(b.productCode, p);
  }

  const slow: SlowProduct[] = [];
  for (const p of perProduct.values()) {
    const cover = stockCoverDays(p.quantity, dailyIssues.get(p.productCode) ?? 0);
    if (typeof cover !== "number") slow.push({ ...p, value: roundJod(p.value), coverDays: "No recent use" });
    else if (cover > SLOW_COVER_DAYS) slow.push({ ...p, value: roundJod(p.value), coverDays: Math.round(cover) });
  }
  slow.sort((a, b) => b.value - a.value || a.productCode.localeCompare(b.productCode));

  const risks: ExpiryRisk[] = [];
  const byProduct = new Map<string, StockBatch[]>();
  for (const b of batches) if (b.quantity > 0 && b.unitCost !== null && b.expiryDate) byProduct.set(b.productCode, [...(byProduct.get(b.productCode) ?? []), b]);
  for (const list of byProduct.values()) {
    list.sort((a, b) => a.expiryDate!.localeCompare(b.expiryDate!) || a.batch.localeCompare(b.batch));
    const daily = Math.max(0, dailyIssues.get(list[0]!.productCode) ?? 0);
    let earlier = 0;
    for (const b of list) {
      const daysLeft = daysBetween(asOf, b.expiryDate!);
      const expired = daysLeft < 0;
      const sellable = expired ? 0 : Math.max(0, Math.floor(daysLeft * daily) - earlier);
      const unsold = Math.max(0, b.quantity - sellable);
      earlier += b.quantity;
      if (unsold > 0 && daysLeft <= EXPIRY_WINDOW_DAYS) {
        risks.push({ productCode: b.productCode, productName: b.productName, batch: b.batch, expiryDate: b.expiryDate!, daysLeft, quantity: b.quantity, unsold, estimatedLoss: roundJod(unsold * b.unitCost!), expired });
      }
    }
  }
  risks.sort((a, b) => b.estimatedLoss - a.estimatedLoss || a.expiryDate.localeCompare(b.expiryDate));

  return {
    stockValue: roundJod(stockValue),
    rows: batches.filter((b) => b.quantity > 0).length,
    rowsWithoutCost,
    slowValue: roundJod(slow.reduce((s, p) => s + p.value, 0)),
    slowProducts: slow.slice(0, topN),
    expiredValue: roundJod(risks.filter((r) => r.expired).reduce((s, r) => s + r.estimatedLoss, 0)),
    expiryLossEstimate: roundJod(risks.reduce((s, r) => s + r.estimatedLoss, 0)),
    expiryRisks: risks.slice(0, topN),
  };
}
