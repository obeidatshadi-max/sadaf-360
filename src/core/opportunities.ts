/**
 * Opportunities for the CEO, from imported invoices and overdue balances. Pure: rows in, figures out.
 *
 * Two signals per customer, ranked by value with the largest one shown and the other named, never added:
 *  - "Reorder overdue": the customer's own reorder cycle has passed. Value = their average order over the last 12
 *    months. ESTIMATED: it is what one missed order would be worth, not a forecast of a sale.
 *  - "Collect overdue": money already invoiced and past its due date. Real balance, not an estimate.
 */
import { daysBetween, roundJod } from "./calc";
import { rankOpportunities, repurchaseForecast, type NotEnoughData, type OpportunitySignal, type RepurchaseForecast } from "./predictions";

export interface OrderRow {
  customerCode: string;
  customerName: string;
  /** Invoice date, YYYY-MM-DD. */
  date: string;
  /** Net sales of the invoice. Credit-only documents (zero or negative) are not orders. */
  value: number;
}

export interface CustomerReorder {
  customerCode: string;
  customerName: string;
  forecast: RepurchaseForecast;
  /** Average order over the last 12 months. */
  averageOrder: number;
}

export interface OpportunitiesReport {
  asOf: string;
  customersWithEnoughHistory: number;
  customersWithoutEnoughHistory: number;
  reorders: CustomerReorder[];
  ranked: { customerCode: string; customerName: string; kind: string; value: number; alsoFlagged: string[]; estimated: boolean }[];
  /** Sum of the single largest signal per customer. Mixes an estimate with real balances, so shown as a range of ideas, not a forecast. */
  total: number;
}

export function buildOpportunities(orders: OrderRow[], overdueByCustomer: Map<string, { name: string; amount: number }>, asOf: string, limit = 10): OpportunitiesReport {
  const names = new Map<string, string>();
  const byCustomer = new Map<string, OrderRow[]>();
  for (const o of orders) {
    if (o.value <= 0 || o.date > asOf) continue;
    names.set(o.customerCode, o.customerName);
    byCustomer.set(o.customerCode, [...(byCustomer.get(o.customerCode) ?? []), o]);
  }

  const reorders: CustomerReorder[] = [];
  let notEnough = 0;
  for (const [code, list] of byCustomer) {
    const f = repurchaseForecast(list.map((o) => o.date), asOf);
    if (f === ("Not enough data" satisfies NotEnoughData)) {
      notEnough += 1;
      continue;
    }
    const recent = list.filter((o) => daysBetween(o.date, asOf) <= 365);
    const avg = recent.length > 0 ? recent.reduce((s, o) => s + o.value, 0) / recent.length : 0;
    reorders.push({ customerCode: code, customerName: names.get(code) ?? code, forecast: f, averageOrder: roundJod(avg) });
  }
  const rank = { Lapsed: 0, Overdue: 1, "Due soon": 2, "On cycle": 3 } as const;
  reorders.sort((a, b) => rank[a.forecast.level] - rank[b.forecast.level] || b.averageOrder - a.averageOrder || a.customerCode.localeCompare(b.customerCode));

  const signals: OpportunitySignal[] = [];
  for (const r of reorders) if (r.forecast.level === "Overdue" || r.forecast.level === "Lapsed") signals.push({ customerId: r.customerCode, kind: "Reorder overdue", value: r.averageOrder });
  for (const [code, o] of overdueByCustomer) {
    names.set(code, names.get(code) ?? o.name);
    signals.push({ customerId: code, kind: "Collect overdue", value: o.amount });
  }
  const ranked = rankOpportunities(signals, limit);
  const allNames = (code: string) => names.get(code) ?? code;

  return {
    asOf,
    customersWithEnoughHistory: reorders.length,
    customersWithoutEnoughHistory: notEnough,
    reorders,
    ranked: ranked.items.map((i) => ({ customerCode: i.customerId, customerName: allNames(i.customerId), kind: i.kind, value: i.value, alsoFlagged: i.alsoFlagged, estimated: i.kind === "Reorder overdue" })),
    total: ranked.total,
  };
}
