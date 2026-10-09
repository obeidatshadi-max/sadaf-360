import { describe, expect, it } from "vitest";
import { lines, invoices } from "./dataset";
import { demoLedger } from "./ledger";

describe("demo ledger agrees with the demo's headline figures", () => {
  const all = demoLedger();
  it("overdue is the demo's own overdue invoice total", () => {
    expect(all.aging.overdue).toBe(invoices.reduce((s, i) => s + i.value, 0));
  });
  it("aging buckets add up with the missing-due-date invoice shown apart", () => {
    const b = Object.values(all.aging.buckets).reduce((a, x) => a + x, 0);
    expect(b + all.aging.dueDateMissing.amount).toBe(all.aging.total);
    expect(all.aging.dueDateMissing).toEqual({ invoices: 1, amount: 12500 });
  });
  it("monthly cash adds up to the demo's year-to-date collections, per line and in total", () => {
    expect(all.cashJanSep).toBe(lines.reduce((s, l) => s + l.col, 0));
    for (const l of lines) expect(demoLedger(l.name).cashJanSep).toBe(l.col);
  });
  it("line filter narrows aging to that line", () => {
    expect(demoLedger("Devices").aging.overdue).toBe(29500);
  });
  it("finds overdue and lapsed reorders and leaves the thin-history customer out", () => {
    const levels = Object.fromEntries(all.opportunities.reorders.map((r) => [r.customerCode, r.forecast.level]));
    expect(levels["Demo Private Hospital A"]).toBe("Lapsed");
    expect(levels["Demo University Hospital C"]).toBe("Overdue");
    expect(levels["Demo Wound Clinic D"]).toBe("Overdue");
    expect(levels["Demo Private Hospital G"]).toBeUndefined();
    expect(all.opportunities.customersWithoutEnoughHistory).toBe(1);
  });
  it("weekly figures come from the same orders and receipts", () => {
    const w = all.weekly;
    expect(w.sales.now).toBe(107000);
    expect(w.sales.before).toBe(49000);
    expect(w.cash.now).toBe(67500);
    expect(w.cash.before).toBe(58000);
    expect(w.overdue.before).toBeGreaterThan(0);
  });
});
