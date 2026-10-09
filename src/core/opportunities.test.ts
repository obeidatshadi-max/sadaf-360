import { describe, expect, it } from "vitest";
import { buildOpportunities, type OrderRow } from "./opportunities";

const asOf = "2026-10-01";
const o = (customerCode: string, date: string, value: number): OrderRow => ({ customerCode, customerName: `Cust ${customerCode}`, date, value });
// Customer A orders every 30 days, last on 2026-06-01 -> long overdue. B has only 2 orders. C is on cycle.
const orders = [
  o("A", "2026-03-04", 100), o("A", "2026-04-03", 100), o("A", "2026-05-03", 100), o("A", "2026-06-02", 200),
  o("B", "2026-08-01", 500), o("B", "2026-09-01", 500),
  o("C", "2026-06-10", 50), o("C", "2026-07-10", 50), o("C", "2026-08-09", 50), o("C", "2026-09-08", 50),
];

describe("buildOpportunities", () => {
  const r = buildOpportunities(orders, new Map([["A", { name: "Cust A", amount: 40 }], ["B", { name: "Cust B", amount: 900 }], ["Z", { name: "Cust Z", amount: 10 }]]), asOf);

  it("counts customers with too little history instead of guessing", () => {
    expect(r.customersWithEnoughHistory).toBe(2);
    expect(r.customersWithoutEnoughHistory).toBe(1);
  });
  it("flags overdue reorders with the average order as the estimated value", () => {
    const a = r.reorders.find((x) => x.customerCode === "A")!;
    expect(a.forecast.level === "Overdue" || a.forecast.level === "Lapsed").toBe(true);
    expect(a.averageOrder).toBe(125);
    expect(r.reorders[0]!.customerCode).toBe("A");
  });
  it("ranks one line per customer, the larger signal first, without adding the others", () => {
    expect(r.ranked.map((x) => [x.customerCode, x.kind, x.value])).toEqual([
      ["B", "Collect overdue", 900],
      ["A", "Reorder overdue", 125],
      ["Z", "Collect overdue", 10],
    ]);
    expect(r.ranked[1]!.alsoFlagged).toEqual(["Collect overdue"]);
    expect(r.ranked[1]!.estimated).toBe(true);
    expect(r.ranked[0]!.estimated).toBe(false);
    expect(r.ranked[2]!.customerName).toBe("Cust Z");
  });
  it("ignores credit-only documents and future-dated rows", () => {
    const e = buildOpportunities([o("A", "2026-01-01", -50), o("A", "2027-01-01", 50)], new Map(), asOf);
    expect(e.customersWithEnoughHistory + e.customersWithoutEnoughHistory).toBe(0);
  });
});
