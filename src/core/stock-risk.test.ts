import { describe, expect, it } from "vitest";
import { buildStockRisk, type StockBatch } from "./stock-risk";

const b = (productCode: string, batch: string, quantity: number, unitCost: number | null, expiryDate: string | null): StockBatch => ({ productCode, productName: `Name ${productCode}`, line: "Consumables", batch, quantity, unitCost, expiryDate });
const asOf = "2026-10-01";

describe("buildStockRisk", () => {
  it("values only costed stock and counts rows without cost apart", () => {
    const r = buildStockRisk([b("A", "", 10, 2, null), b("B", "", 5, null, null), b("C", "", 0, 9, null)], new Map([["A", 1]]), asOf);
    expect(r.stockValue).toBe(20);
    expect(r.rowsWithoutCost).toBe(1);
    expect(r.rows).toBe(2);
  });

  it("flags stock with no recent use or more than a year of cover as slow", () => {
    const r = buildStockRisk([b("A", "", 400, 1, null), b("B", "", 10, 5, null), b("C", "", 30, 1, null)], new Map([["A", 1], ["C", 1]]), asOf);
    // A: 400 days of cover (slow). B: no use (slow). C: 30 days (fine).
    expect(r.slowProducts.map((p) => [p.productCode, p.coverDays])).toEqual([["A", 400], ["B", "No recent use"]]);
    expect(r.slowValue).toBe(450);
  });

  it("estimates expiry loss with the earliest expiry served first", () => {
    // 1 unit a day. Batch X expires in 10 days with 30 units -> sells 10, 20 unsold.
    // Batch Y expires in 40 days with 30 units -> 40 sellable minus 30 already ahead of it = 10, 20 unsold.
    const r = buildStockRisk([b("A", "X", 30, 2, "2026-10-11"), b("A", "Y", 30, 2, "2026-11-10")], new Map([["A", 1]]), asOf);
    expect(r.expiryRisks.map((x) => [x.batch, x.unsold, x.estimatedLoss])).toEqual([["X", 20, 40], ["Y", 20, 40]]);
    expect(r.expiryLossEstimate).toBe(80);
  });

  it("treats expired stock as wholly unsold and ignores batches beyond the window", () => {
    const r = buildStockRisk([b("A", "old", 5, 3, "2026-09-01"), b("A", "far", 5, 3, "2028-01-01")], new Map([["A", 0]]), asOf);
    expect(r.expiryRisks).toHaveLength(1);
    expect(r.expiryRisks[0]).toMatchObject({ batch: "old", expired: true, unsold: 5 });
    expect(r.expiredValue).toBe(15);
  });
});
