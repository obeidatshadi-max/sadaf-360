import { describe, expect, it } from "vitest";
import { buildReceivables, type OpenInvoiceRow } from "./receivables";

const row = (invoiceNo: string, customerCode: string, remaining: number, dueDate: string | null): OpenInvoiceRow => ({
  invoiceNo,
  customerCode,
  customerName: `Customer ${customerCode}`,
  remaining,
  dueDate,
});

describe("buildReceivables", () => {
  const asOf = "2026-10-08";
  const r = buildReceivables(
    [
      row("I1", "A", 100, "2026-10-20"), // not due
      row("I2", "A", 200, "2026-09-28"), // 10 days
      row("I3", "B", 300, "2026-06-18"), // 112 days
      row("I4", "B", 50, "2026-09-01"), // 37 days
      row("I5", "C", 70, null), // no due date
      row("I6", "C", 0, "2026-01-01"), // paid, ignored
    ],
    asOf,
  );

  it("splits by bucket from the due date and keeps totals consistent", () => {
    expect(r.buckets).toEqual({ "Not due": 100, "1-30": 200, "31-60": 50, "61-90": 0, "90+": 300 });
    expect(r.overdue).toBe(550);
    expect(r.total).toBe(720);
  });

  it("never ages an invoice that has no due date", () => {
    expect(r.dueDateMissing).toEqual({ invoices: 1, amount: 70 });
    expect(Object.values(r.buckets).reduce((a, b) => a + b, 0) + r.dueDateMissing.amount).toBe(r.total);
  });

  it("ranks customers by overdue amount with their oldest lateness", () => {
    expect(r.topOverdue).toEqual([
      { customerCode: "B", customerName: "Customer B", overdue: 350, invoices: 2, oldestDaysOverdue: 112 },
      { customerCode: "A", customerName: "Customer A", overdue: 200, invoices: 1, oldestDaysOverdue: 10 },
    ]);
  });

  it("reads an empty snapshot as zeros", () => {
    const e = buildReceivables([], asOf);
    expect(e.total).toBe(0);
    expect(e.topOverdue).toEqual([]);
  });
});
