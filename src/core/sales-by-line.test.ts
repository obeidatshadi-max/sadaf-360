import { describe, expect, it } from "vitest";
import { buildSalesByLine, sameDayLastYear, type LineSums } from "./sales-by-line";

const s = (line: LineSums["line"], period: LineSums["period"], sales: number, costedSales: number, cost: number, linesWithoutCost = 0): LineSums => ({ line, period, sales, costedSales, cost, linesWithoutCost });

describe("buildSalesByLine", () => {
  const r = buildSalesByLine([
    s("Equipment", "current", 1000, 1000, 700),
    s("Equipment", "prior", 800, 800, 600),
    s("Consumables", "current", 500, 400, 300, 2), // 100 of sales has no cost
    s("Devices", "prior", 50, 50, 40),
  ]);
  const by = (l: string) => [...r.lines, r.total].find((x) => x.line === l)!;

  it("works out margin and growth per line", () => {
    expect(by("Equipment")).toMatchObject({ sales: 1000, grossProfit: 300, margin: 0.3, growth: 0.25, costCoverage: 1 });
  });
  it("uses only costed sales for margin and reports the coverage", () => {
    expect(by("Consumables")).toMatchObject({ grossProfit: 100, margin: 0.25, costCoverage: 0.8, linesWithoutCost: 2 });
  });
  it("reads a line with no sales as Data missing, not zero", () => {
    expect(by("Devices")).toMatchObject({ sales: 0, margin: "Data missing", growth: -1, costCoverage: "Data missing", grossProfit: "Data missing" });
    expect(by("Consumables").growth).toBe("Data missing");
  });
  it("totals are sums, with margin from the summed figures", () => {
    expect(by("Total")).toMatchObject({ sales: 1500, priorSales: 850, grossProfit: 400, linesWithoutCost: 2 });
    expect(by("Total").margin).toBeCloseTo(400 / 1400);
  });
});

describe("sameDayLastYear", () => {
  it("steps back one year and clamps 29 Feb", () => {
    expect(sameDayLastYear("2026-10-09")).toBe("2025-10-09");
    expect(sameDayLastYear("2028-02-29")).toBe("2027-02-28");
  });
});
