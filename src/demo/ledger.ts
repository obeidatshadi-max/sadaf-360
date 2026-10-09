/**
 * Synthetic transaction-level data for the promotional demo, run through the SAME calculation code as the app
 * (receivables aging, week-on-week change, reorder timing and opportunity ranking). Everything here is invented and
 * built to agree with the demo's headline figures: the overdue invoices are the demo's own, and the monthly cash
 * adds up to the demo's year-to-date collections.
 */
import { lines, invoices as demoInvoices, DEMO_AS_OF, type LineName } from "./dataset";
import { buildReceivables, type OpenInvoiceRow } from "@/core/receivables";
import { buildOpportunities, type OrderRow } from "@/core/opportunities";
import { change, weekWindows } from "@/core/weekly";
import { roundJod } from "@/core/calc";

type Line = LineName | "All lines";

interface OpenInvoice extends OpenInvoiceRow {
  line: LineName;
}

const open = (invoiceNo: string, customerName: string, line: LineName, remaining: number, dueDate: string | null): OpenInvoice => ({
  invoiceNo,
  customerCode: customerName,
  customerName,
  line,
  remaining,
  dueDate,
});

/** Unpaid invoices at the demo snapshot: the demo's four overdue ones plus three that are not overdue or have no due date. */
const OPEN_NOW: OpenInvoice[] = [
  ...demoInvoices.map((i, n) => open(`DEMO-${n + 1}`, i.account, i.line, i.value, i.due)),
  open("DEMO-5", "Demo Public Hospital Group", "Equipment", 42000, "2026-10-28"),
  open("DEMO-6", "Demo Private Hospital G", "Consumables", 9000, "2026-10-20"),
  open("DEMO-7", "Demo Military Medical Center F", "Devices", 12500, null),
];
/** One invoice that was unpaid a week earlier and was paid on 3 October. */
const PAID_LAST_WEEK = open("DEMO-8", "Demo University Hospital C", "Consumables", 31000, "2026-09-15");
const PREVIOUS_SNAPSHOT = "2026-10-01";

const MONTH_WEIGHTS = [0.095, 0.1, 0.105, 0.108, 0.112, 0.118, 0.115, 0.121, 0.126];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep"];

const RECEIPTS: { date: string; amount: number }[] = [
  { date: "2026-09-26", amount: 18000 },
  { date: "2026-09-30", amount: 40000 },
  { date: "2026-10-03", amount: 31000 },
  { date: "2026-10-06", amount: 24500 },
  { date: "2026-10-08", amount: 12000 },
];

const CUSTOMERS: { name: string; cycle: number; last: string; count: number; value: number }[] = [
  { name: "Demo Public Hospital Group", cycle: 28, last: "2026-10-05", count: 10, value: 46000 },
  { name: "Demo University Hospital C", cycle: 30, last: "2026-07-28", count: 9, value: 38000 },
  { name: "Demo Hospital E", cycle: 45, last: "2026-10-07", count: 8, value: 61000 },
  { name: "Demo Military Medical Center F", cycle: 35, last: "2026-09-29", count: 7, value: 27000 },
  { name: "Demo Private Hospital A", cycle: 21, last: "2026-06-30", count: 12, value: 15500 },
  { name: "Demo Surgical Center B", cycle: 40, last: "2026-10-01", count: 6, value: 22000 },
  { name: "Demo Wound Clinic D", cycle: 14, last: "2026-09-14", count: 11, value: 9800 },
  { name: "Demo Private Hospital G", cycle: 30, last: "2026-09-10", count: 3, value: 12000 },
];

const addDays = (iso: string, days: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);

const ORDERS: OrderRow[] = CUSTOMERS.flatMap((c) =>
  Array.from({ length: c.count }, (_, k) => ({
    customerCode: c.name,
    customerName: c.name,
    date: addDays(c.last, -k * c.cycle),
    value: roundJod(c.value * [1, 1.05, 0.95][k % 3]!),
  })),
);

export function demoLedger(line: Line = "All lines") {
  const asOf = DEMO_AS_OF;
  const w = weekWindows(asOf);
  const pick = (rows: OpenInvoice[]) => rows.filter((r) => line === "All lines" || r.line === line);

  const aging = buildReceivables(pick(OPEN_NOW), asOf, 100);

  const cashMonths = MONTHS.map((label) => ({ label, amount: 0 }));
  for (const l of lines.filter((x) => line === "All lines" || x.name === line)) {
    let used = 0;
    cashMonths.forEach((m, i) => {
      const amount = i === MONTHS.length - 1 ? l.col - used : Math.round(l.col * MONTH_WEIGHTS[i]!);
      used += amount;
      m.amount += amount;
    });
  }
  const octToDate = RECEIPTS.filter((r) => r.date >= "2026-10-01").reduce((s, r) => s + r.amount, 0);

  // Company-wide views: orders and receipts are not split by line.
  const inWindow = (d: string, from: string, to: string) => d >= from && d <= to;
  const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
  const salesIn = (from: string, to: string) => sum(ORDERS.filter((o) => inWindow(o.date, from, to)).map((o) => o.value));
  const ordersIn = (from: string, to: string) => ORDERS.filter((o) => inWindow(o.date, from, to)).length;
  const cashIn = (from: string, to: string) => sum(RECEIPTS.filter((r) => inWindow(r.date, from, to)).map((r) => r.amount));

  const allNow = buildReceivables(OPEN_NOW, asOf, 100);
  const before = buildReceivables([...OPEN_NOW, PAID_LAST_WEEK], PREVIOUS_SNAPSHOT, 0);

  const overdueMap = new Map(allNow.topOverdue.map((c) => [c.customerCode, { name: c.customerName, amount: c.overdue }]));
  const opportunities = buildOpportunities(ORDERS, overdueMap, asOf);

  const thisWeek = ORDERS.filter((o) => inWindow(o.date, w.thisFrom, w.thisTo)).reduce<Record<string, number>>(
    (m, o) => ({ ...m, [o.customerName]: (m[o.customerName] ?? 0) + o.value }),
    {},
  );

  return {
    asOf,
    aging,
    cashMonths,
    cashJanSep: cashMonths.reduce((s, m) => s + m.amount, 0),
    octToDate,
    opportunities,
    weekly: {
      windows: w,
      sales: change(salesIn(w.thisFrom, w.thisTo), salesIn(w.prevFrom, w.prevTo)),
      cash: change(cashIn(w.thisFrom, w.thisTo), cashIn(w.prevFrom, w.prevTo)),
      orders: change(ordersIn(w.thisFrom, w.thisTo), ordersIn(w.prevFrom, w.prevTo)),
      overdue: change(allNow.overdue, before.overdue),
      overdueBeforeAsOf: PREVIOUS_SNAPSHOT,
      topCustomers: Object.entries(thisWeek)
        .map(([name, sales]) => ({ name, sales }))
        .sort((a, b) => b.sales - a.sales),
    },
  };
}
