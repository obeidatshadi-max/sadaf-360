import { describe, expect, it } from "vitest";
import { buildPortfolio, nextStep, NOT_SET, type SalesRow } from "./portfolio";

const r = (area: string | null, segment: string | null, customer: string, period: "current" | "prior", sales: number): SalesRow => ({ area, segment, customer, period, sales });

const rows: SalesRow[] = [
  // Respiratory: +50%, spread over three customers -> Growing.
  r("Respiratory", "Private", "A", "current", 300), r("Respiratory", "Private", "B", "current", 200), r("Respiratory", "Tender", "C", "current", 100),
  r("Respiratory", "Private", "A", "prior", 200), r("Respiratory", "Private", "B", "prior", 100), r("Respiratory", "Tender", "C", "prior", 100),
  // Surgery: +100% but one customer is 90% of it -> rests on one customer.
  r("Surgery", "Tender", "D", "current", 180), r("Surgery", "Private", "E", "current", 20),
  r("Surgery", "Tender", "D", "prior", 60), r("Surgery", "Private", "E", "prior", 40),
  // Wound care: -30% -> Declining.
  r("Wound care", "Private", "F", "current", 140), r("Wound care", "Private", "F", "prior", 200),
  // Dialysis: flat.
  r("Dialysis", "Private", "G", "current", 150), r("Dialysis", "Private", "G", "prior", 150),
  // Tiny area: below the size floor.
  r("Ophthalmology", "Private", "H", "current", 5), r("Ophthalmology", "Private", "H", "prior", 1),
  // No area set.
  r(null, null, "I", "current", 105), r(null, null, "I", "prior", 90),
];
const coverage = [
  { area: "Respiratory", activeProducts: 2, suppliers: 1 },
  { area: "Surgery", activeProducts: 2, suppliers: 1 },
  { area: "Wound care", activeProducts: 9, suppliers: 4 },
  { area: "Dialysis", activeProducts: 8, suppliers: 3 },
];

describe("buildPortfolio", () => {
  const p = buildPortfolio(rows, coverage);
  const area = (n: string) => p.areas.find((a) => a.area === n)!;

  it("calls broad growth Growing and flags growth that rests on one customer", () => {
    expect(area("Respiratory")).toMatchObject({ signal: "Growing", growth: 0.5, customers: 3, topCustomer: "A" });
    expect(area("Surgery")).toMatchObject({ signal: "Growth comes from one customer", topCustomer: "D" });
    expect(area("Surgery").topCustomerShare).toBeCloseTo(0.9);
  });
  it("labels decline, flat and too-small areas", () => {
    expect(area("Wound care").signal).toBe("Declining");
    expect(area("Dialysis").signal).toBe("Stable");
    expect(area("Ophthalmology").signal).toBe("Too small to judge");
  });
  it("keeps products with no area in their own row and reports their share", () => {
    expect(area(NOT_SET).signal).toBe("Too small to judge");
    expect(p.unclassifiedShare).toBeCloseTo(105 / p.totalSales);
  });
  it("totals add up", () => {
    expect(p.totalSales).toBe(1200);
    expect(p.totalPrior).toBe(941);
    expect(p.areas.reduce((s, a) => s + a.sales, 0)).toBe(p.totalSales);
  });
  it("points at growing areas with thin coverage only", () => {
    expect(p.lookHere.map((a) => a.area)).toEqual(["Respiratory"]);
    expect(area("Respiratory").thinCoverage).toBe(true);
    expect(area("Dialysis").thinCoverage).toBe(false);
  });
  it("breaks an area down by customer type, largest increase first", () => {
    expect(area("Respiratory").bySegment.map((s) => [s.segment, s.delta])).toEqual([["Private", 200], ["Tender", 0]]);
  });
  it("reads an empty ledger as empty, not an error", () => {
    expect(buildPortfolio([], [])).toMatchObject({ totalSales: 0, areas: [], lookHere: [], unclassifiedShare: 0 });
  });
});

describe("nextStep", () => {
  it("suggests looking for range only where growth is broad and the range is thin", () => {
    expect(nextStep({ signal: "Growing", thinCoverage: true })).toMatch(/second supplier/);
    expect(nextStep({ signal: "Growing", thinCoverage: false })).toMatch(/sufficient/);
  });
  it("never suggests new range for one-customer growth or decline", () => {
    expect(nextStep({ signal: "Growth comes from one customer", thinCoverage: true })).toMatch(/repeat/);
    expect(nextStep({ signal: "Declining", thinCoverage: true })).toMatch(/Find out why/);
  });
});
