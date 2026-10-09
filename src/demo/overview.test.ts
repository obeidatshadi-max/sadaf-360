import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { invoices, lines, stock, tenders, units } from "./dataset";
import { lineRows, receivables, recurring, service, stockRows, tenderRows, totals } from "./overview";
import { jod, jodShort, pct } from "@/lib/format";

describe("guest overview figures", () => {
  it("headline totals", () => {
    const t = totals();
    expect(t.sales).toBe(4_530_000);
    expect(t.grossProfit).toBe(1_495_100);
    expect(t.margin).toBeCloseTo(0.33, 2);
    expect(t.contribution).toBe(1_306_100);
    expect(t.cashCollected).toBe(3_875_000);
    expect(t.standaloneConsumables).toBe(480_000);
  });
  it("line rows reconcile to the totals", () => {
    const rows = lineRows();
    expect(rows.reduce((a, r) => a + r.sales, 0)).toBe(totals().sales);
    expect(rows.reduce((a, r) => a + r.contribution, 0)).toBeCloseTo(totals().contribution, 3);
    expect(rows.map((r) => Math.round((r.margin as number) * 100))).toEqual([25, 32, 39]);
  });
  it("receivables: listed total, overdue and buckets agree", () => {
    const r = receivables();
    expect(r.total).toBe(117_500);
    expect(r.overdue).toBe(117_500);
    expect(r.buckets.reduce((a, b) => a + b.amount, 0)).toBe(r.total);
    expect(r.buckets.find((b) => b.bucket === "90+")!.amount).toBe(73_500);
  });
  it("stock: exposure is the sum of lot estimates, equipment has none", () => {
    const s = stockRows();
    expect(s.expiryExposure).toBe(21_810);
    expect(s.rows.find((r) => r.id === "SKU-401")!.expiryLoss).toBe(14_250);
    expect(s.rows.find((r) => r.id === "SKU-420")!.expiryLoss).toBe(7_560);
    expect(s.rows.find((r) => r.id === "SKU-110")!.expiryLoss).toBe(0);
    expect(s.totalValue).toBe(135_320);
    expect(s.stockOutFlags).toBe(1);
  });
  it("recurring cohort", () => {
    const r = recurring();
    expect(r.expected).toBe(18_100);
    expect(r.actual).toBe(12_980);
    expect(r.gap).toBe(5_120);
    expect(r.capture).toBeCloseTo(0.717, 3);
    expect(r.lowCapture).toBe(3);
    expect(r.scenario.extraSales).toBe(24_576);
    expect(r.scenario.extraProfit).toBeCloseTo(7_372.8, 3);
  });
  it("service coverage follows the workbook rule: a contract in its renewal window is still covered", () => {
    const s = service();
    expect(s.units).toBe(6);
    expect(s.covered).toBe(5);
    expect(s.renewalDue).toBe(1);
    expect(s.noContract).toBe(1);
    expect(s.actionNeeded).toBe(2);
    expect(s.coverage).toBeCloseTo(5 / 6);
  });
  it("tenders: every cost split adds back to the value, weighted margin is 23.6%", () => {
    const t = tenderRows();
    for (const r of t.rows) expect(r.productCost + r.fulfillment + r.contribution).toBeCloseTo(r.value, 2);
    expect(t.totalValue).toBe(1_005_000);
    expect(t.weightedMargin).toBeCloseTo(0.2356, 3);
  });
});

describe("formatting", () => {
  it("jod and jodShort", () => {
    expect(jod(117500)).toBe("JOD 117,500");
    expect(jod(1.5)).toBe("JOD 1.5");
    expect(jodShort(4_530_000)).toBe("JOD 4.53M");
    expect(jodShort(117_500)).toBe("JOD 117.5K");
    expect(jodShort(999_999)).toBe("JOD 1.00M");
    expect(jodShort(6_000)).toBe("JOD 6.0K");
    expect(jodShort(950)).toBe("JOD 950");
  });
  it("pct passes unavailable values through as a dash", () => {
    expect(pct(0.717)).toBe("72%");
    expect(pct(0.2356, 1)).toBe("23.6%");
    expect(pct("Data missing")).toBe("—");
  });
});

describe("dataset stays in step with the frozen promotional demo", () => {
  const html = readFileSync(fileURLToPath(new URL("../../demo/index.html", import.meta.url)), "utf8");
  const arr = (name: string) => JSON.parse(new RegExp(`const ${name}=(\\[.*?\\]);\\r?\\n`, "s").exec(html)![1]!) as Record<string, unknown>[];
  const pick = (rows: Record<string, unknown>[], keys: string[]) => rows.map((r) => Object.fromEntries(keys.map((k) => [k, r[k]])));

  it("lines", () => expect(pick(arr("lines"), ["name", "rev", "gp", "cost", "col", "rec"])).toEqual(lines));
  it("units", () =>
    expect(pick(arr("units"), ["id", "line", "expected", "actual", "service"])).toEqual(
      units.map(({ id, line, expected, actual, service }) => ({ id, line, expected, actual, service })),
    ));
  it("stock", () =>
    expect(pick(arr("stock"), ["id", "qty", "value", "months", "expiry", "risk"])).toEqual(
      stock.map(({ id, qty, value, months, expiry, risk }) => ({ id, qty, value, months, expiry, risk })),
    ));
  it("invoices", () => expect(pick(arr("invoices"), ["account", "value", "due"])).toEqual(invoices.map(({ account, value, due }) => ({ account, value, due }))));
  it("tenders", () =>
    expect(pick(arr("tenders"), ["id", "line", "value", "stage", "margin"])).toEqual(
      tenders.map(({ id, line, value, stage, margin }) => ({ id, line, value, stage, margin })),
    ));
});
