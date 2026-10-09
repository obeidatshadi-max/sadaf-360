import { describe, expect, it } from "vitest";
import {
  ESTIMATED,
  cashForecast,
  paymentBehaviour,
  rankOpportunities,
  repurchaseForecast,
  type PaymentBehaviour,
} from "./predictions";

const monthly = ["2026-01-01", "2026-01-31", "2026-03-02", "2026-04-01"]; // 30-day cycle, last order 1 April

describe("repurchaseForecast", () => {
  it("needs at least four distinct order days", () => {
    expect(repurchaseForecast(monthly.slice(0, 3), "2026-04-15")).toBe("Not enough data");
    expect(repurchaseForecast([...monthly.slice(0, 3), "2026-03-02"], "2026-04-15")).toBe("Not enough data");
    expect(repurchaseForecast([], "2026-04-15")).toBe("Not enough data");
  });

  it("estimates the cycle and expected next order", () => {
    const f = repurchaseForecast(monthly, "2026-04-15");
    expect(f).toMatchObject({ label: ESTIMATED, orders: 4, cycleDays: 30, lastOrder: "2026-04-01", expectedNext: "2026-05-01", daysToNext: 16, level: "On cycle", confidence: "Higher" });
  });

  it("moves from on cycle to due soon to overdue to lapsed", () => {
    const level = (asOf: string) => (repurchaseForecast(monthly, asOf) as { level: string }).level;
    expect(level("2026-04-28")).toBe("Due soon");
    expect(level("2026-05-05")).toBe("Due soon"); // 4 days past expected, inside the grace period
    expect(level("2026-05-15")).toBe("Overdue");
    expect(level("2026-07-15")).toBe("Lapsed"); // 105 days since the last order, over 3 cycles
  });

  it("marks an erratic customer as lower confidence", () => {
    const erratic = ["2026-01-01", "2026-01-11", "2026-03-12", "2026-03-22", "2026-05-21"]; // 10, 60, 10, 60
    const f = repurchaseForecast(erratic, "2026-06-01");
    expect(f).toMatchObject({ cycleDays: 35, confidence: "Lower" });
  });

  it("throws on an order dated after the snapshot", () => {
    expect(() => repurchaseForecast([...monthly, "2026-05-01"], "2026-04-15")).toThrow(RangeError);
  });
});

describe("paymentBehaviour", () => {
  const paid = [
    ["2026-01-10", "2026-01-08"], // 2 days early
    ["2026-01-10", "2026-01-10"],
    ["2026-01-10", "2026-01-15"],
    ["2026-01-10", "2026-01-20"],
    ["2026-01-10", "2026-02-09"], // 30 days late
  ].map(([dueDate, paidDate]) => ({ dueDate, paidDate }));

  it("needs at least five paid invoices", () => {
    expect(paymentBehaviour(paid.slice(0, 4))).toBe("Not enough data");
  });

  it("estimates typical lateness, a cautious view and the share paid late", () => {
    expect(paymentBehaviour(paid)).toEqual({ label: ESTIMATED, paidInvoices: 5, medianDaysLate: 5, p80DaysLate: 10, shareLate: 0.6 });
  });
});

describe("cashForecast", () => {
  const a = paymentBehaviour(
    ["2026-01-08", "2026-01-10", "2026-01-15", "2026-01-20", "2026-02-09"].map((paidDate) => ({ dueDate: "2026-01-10", paidDate })),
  ) as PaymentBehaviour;
  const behaviour = new Map<string, PaymentBehaviour | "Not enough data">([
    ["A", a],
    ["B", "Not enough data"],
  ]);
  const open = [
    { customerId: "A", outstanding: 1000, dueDate: "2026-10-11" }, // due in 10 days + 5 typical late = day 15
    { customerId: "A", outstanding: 500, dueDate: "2026-11-15" }, // day 50
    { customerId: "A", outstanding: 200, dueDate: "2027-03-01" }, // beyond 90 days
    { customerId: "A", outstanding: 300, dueDate: "2026-09-20" }, // already past its typical payment day
    { customerId: "B", outstanding: 400, dueDate: "2026-10-05" }, // too little history
    { customerId: "C", outstanding: 100, dueDate: "2026-10-05" }, // no history at all
    { customerId: "A", outstanding: 0, dueDate: "2026-10-05" }, // paid: ignored
  ];

  it("accumulates windows and keeps unforecast money separate", () => {
    const f = cashForecast(open, behaviour, "2026-10-01");
    expect(f.windows).toEqual([
      { days: 30, amount: 1000 },
      { days: 60, amount: 1500 },
      { days: 90, amount: 1500 },
    ]);
    expect(f).toMatchObject({ label: ESTIMATED, later: 200, pastTypical: 300, notForecast: 500 });
  });

  it("partitions the outstanding total: nothing counted twice or dropped", () => {
    const f = cashForecast(open, behaviour, "2026-10-01");
    const last = f.windows[f.windows.length - 1].amount;
    expect(last + f.later + f.pastTypical + f.notForecast).toBe(2500);
  });
});

describe("rankOpportunities", () => {
  const signals = [
    { customerId: "c1", kind: "consumables gap", value: 5000 },
    { customerId: "c1", kind: "overdue repurchase", value: 3000 },
    { customerId: "c2", kind: "overdue repurchase", value: 4000 },
    { customerId: "c3", kind: "consumables gap", value: 0 },
    { customerId: "c4", kind: "consumables gap", value: -50 },
  ];

  it("keeps the largest signal per customer and does not add overlapping ones", () => {
    const r = rankOpportunities(signals);
    expect(r.items).toEqual([
      { customerId: "c1", kind: "consumables gap", value: 5000, alsoFlagged: ["overdue repurchase"] },
      { customerId: "c2", kind: "overdue repurchase", value: 4000, alsoFlagged: [] },
    ]);
    expect(r.total).toBe(9000); // not 12000
  });

  it("limits the list but reports the total across all customers", () => {
    const r = rankOpportunities(signals, 1);
    expect(r.items).toHaveLength(1);
    expect(r.total).toBe(9000);
  });
});
