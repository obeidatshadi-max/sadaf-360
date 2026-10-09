import { describe, expect, it } from "vitest";
import { STATUS_RULES, accountStatus, creditUtilization, daysSince, daysUntil, dso, summarize, winRate, yoyGrowth, type StatusInput } from "./accounts";

const base: StatusInput = {
  segment: "Private",
  maxOverdueDays: 0,
  overdueAmount: 0,
  creditUse: 0.5,
  attainment: 1,
  yoy: 0.05,
  capture: null,
  daysSinceLastOrder: 10,
  preparingTenderDays: [],
};

describe("ratios", () => {
  it("growth against last year, unavailable without a base", () => {
    expect(yoyGrowth(110, 100)).toBeCloseTo(0.1);
    expect(yoyGrowth(90, 100)).toBeCloseTo(-0.1);
    expect(yoyGrowth(50, 0)).toBe("Data missing");
  });
  it("days sales outstanding, count-back", () => {
    expect(dso(190000, 770000, 273)).toBeCloseTo(67.364, 3);
    expect(dso(0, 770000, 273)).toBe(0);
    expect(dso(100, 0, 273)).toBe("Data missing");
    expect(dso(100, 500, 0)).toBe("Data missing");
  });
  it("credit use: no limit is unavailable, not zero", () => {
    expect(creditUtilization(45000, 80000)).toBeCloseTo(0.5625);
    expect(creditUtilization(1000, 0)).toBe("Data missing");
  });
  it("days since and until", () => {
    expect(daysSince("2026-08-14", "2026-10-08")).toBe(55);
    expect(daysSince("2026-10-09", "2026-10-08")).toBe(0);
    expect(daysUntil("2026-10-18", "2026-10-08")).toBe(10);
    expect(daysUntil("2026-10-01", "2026-10-08")).toBe(-7);
  });
  it("win rate ignores pending tenders", () => {
    expect(winRate(6, 5)).toBeCloseTo(6 / 11);
    expect(winRate(0, 0)).toBe("Data missing");
    expect(winRate(3, 0)).toBe(1);
  });
});

describe("account status", () => {
  it("healthy when nothing trips a rule", () => {
    expect(accountStatus(base)).toEqual({ level: "Healthy", reasons: [] });
  });
  it("overdue boundary: 90 days is a watch item, 91 puts the account at risk", () => {
    expect(accountStatus({ ...base, overdueAmount: 100, maxOverdueDays: STATUS_RULES.atRiskOverdueDays }).level).toBe("Watch");
    expect(accountStatus({ ...base, overdueAmount: 100, maxOverdueDays: STATUS_RULES.atRiskOverdueDays + 1 }).level).toBe("At risk");
  });
  it("credit use above 90% is at risk, exactly 90% is not", () => {
    expect(accountStatus({ ...base, creditUse: 0.9 }).level).toBe("Healthy");
    expect(accountStatus({ ...base, creditUse: 0.91 }).level).toBe("At risk");
    expect(accountStatus({ ...base, creditUse: "Data missing" }).level).toBe("Healthy");
  });
  it("watch rules", () => {
    expect(accountStatus({ ...base, attainment: 0.84 }).level).toBe("Watch");
    expect(accountStatus({ ...base, attainment: 0.85 }).level).toBe("Healthy");
    expect(accountStatus({ ...base, yoy: -0.11 }).level).toBe("Watch");
    expect(accountStatus({ ...base, yoy: -0.1 }).level).toBe("Healthy");
    expect(accountStatus({ ...base, capture: 0.69 }).level).toBe("Watch");
    expect(accountStatus({ ...base, capture: 0.7 }).level).toBe("Healthy");
    expect(accountStatus({ ...base, capture: null }).level).toBe("Healthy");
  });
  it("quiet-account rule applies to private accounts only", () => {
    expect(accountStatus({ ...base, daysSinceLastOrder: 46 }).level).toBe("Watch");
    expect(accountStatus({ ...base, daysSinceLastOrder: 45 }).level).toBe("Healthy");
    expect(accountStatus({ ...base, segment: "Tender", daysSinceLastOrder: 120 }).level).toBe("Healthy");
  });
  it("tender deadline inside 14 days, or already passed, is a watch item", () => {
    expect(accountStatus({ ...base, segment: "Tender", preparingTenderDays: [14] }).level).toBe("Watch");
    expect(accountStatus({ ...base, segment: "Tender", preparingTenderDays: [15] }).level).toBe("Healthy");
    expect(accountStatus({ ...base, segment: "Tender", preparingTenderDays: [-3] }).reasons[0]).toMatch(/passed 3 days ago/);
  });
  it("at risk lists every reason, risk first", () => {
    const s = accountStatus({ ...base, overdueAmount: 100, maxOverdueDays: 94, capture: 0.5, daysSinceLastOrder: 55 });
    expect(s.level).toBe("At risk");
    expect(s.reasons[0]).toBe("Invoice 94 days overdue");
    expect(s.reasons).toHaveLength(3);
  });
});

describe("summarize", () => {
  const rows = [
    { sales: 1000, grossProfit: 300, directCosts: 50, priorSales: 800, priorGrossProfit: 200, target: 900, collected: 700, outstanding: 300, overdue: 100 },
    { sales: 500, grossProfit: 100, directCosts: 20, priorSales: 600, priorGrossProfit: 150, target: 600, collected: 400, outstanding: 100, overdue: 0 },
  ];
  it("adds up and derives every ratio from the totals, never by averaging ratios", () => {
    const s = summarize(rows, 273);
    expect(s).toMatchObject({ accounts: 2, sales: 1500, grossProfit: 400, contribution: 330, target: 1500, collected: 1100, outstanding: 400, overdue: 100 });
    expect(s.margin).toBeCloseTo(400 / 1500);
    expect(s.salesYoy).toBeCloseTo(1500 / 1400 - 1);
    expect(s.grossProfitYoy).toBeCloseTo(400 / 350 - 1);
    expect(s.attainment).toBe(1);
    expect(s.overdueShare).toBeCloseTo(0.25);
    expect(s.dso).toBeCloseTo((400 / 1500) * 273);
  });
  it("an empty group has unavailable ratios, not NaN", () => {
    const s = summarize([], 273);
    expect(s.accounts).toBe(0);
    for (const k of ["margin", "salesYoy", "grossProfitYoy", "attainment", "overdueShare", "dso"] as const) expect(s[k]).toBe("Data missing");
  });
});
