/**
 * Receivables aging from one unpaid-invoice snapshot. Pure: rows in, figures out.
 * Age counts from the contractual due date only. An invoice with no due date is never aged by a guess: it is reported
 * separately as "Due date missing" and is included in the total but not in any bucket or in "overdue".
 */
import { AGING_BUCKETS, daysOverdue, receivablesAging, roundJod, type AgingBucket } from "./calc";

export interface OpenInvoiceRow {
  invoiceNo: string;
  customerCode: string;
  customerName: string;
  remaining: number;
  dueDate: string | null;
}

export interface CustomerOverdue {
  customerCode: string;
  customerName: string;
  overdue: number;
  invoices: number;
  oldestDaysOverdue: number;
}

export interface ReceivablesReport {
  asOf: string;
  /** Everything still unpaid in the snapshot, including invoices with no due date. */
  total: number;
  /** Past due date (buckets 1-30 and older). Excludes invoices with no due date. */
  overdue: number;
  buckets: Record<AgingBucket, number>;
  dueDateMissing: { invoices: number; amount: number };
  topOverdue: CustomerOverdue[];
}

export function buildReceivables(rows: OpenInvoiceRow[], asOf: string, topN = 10): ReceivablesReport {
  const open = rows.filter((r) => r.remaining > 0);
  const dated = open.filter((r): r is OpenInvoiceRow & { dueDate: string } => r.dueDate !== null);
  const undated = open.filter((r) => r.dueDate === null);

  const aging = receivablesAging(
    dated.map((r) => ({ outstanding: r.remaining, dueDate: r.dueDate })),
    asOf,
  );
  const missingAmount = roundJod(undated.reduce((s, r) => s + r.remaining, 0));

  const byCustomer = new Map<string, CustomerOverdue>();
  for (const r of dated) {
    const late = daysOverdue(r.remaining, r.dueDate, asOf);
    if (late <= 0) continue;
    const c = byCustomer.get(r.customerCode) ?? { customerCode: r.customerCode, customerName: r.customerName, overdue: 0, invoices: 0, oldestDaysOverdue: 0 };
    c.overdue = roundJod(c.overdue + r.remaining);
    c.invoices += 1;
    c.oldestDaysOverdue = Math.max(c.oldestDaysOverdue, late);
    byCustomer.set(r.customerCode, c);
  }
  const topOverdue = [...byCustomer.values()].sort((a, b) => b.overdue - a.overdue || a.customerCode.localeCompare(b.customerCode)).slice(0, topN);

  return {
    asOf,
    total: roundJod(aging.total + missingAmount),
    overdue: aging.overdue,
    buckets: aging.buckets,
    dueDateMissing: { invoices: undated.length, amount: missingAmount },
    topOverdue,
  };
}

export { AGING_BUCKETS };
