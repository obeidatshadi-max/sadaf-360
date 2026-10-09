import "server-only";
import { sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { buildOpportunities, type OrderRow } from "@/core/opportunities";
import { companyReceivables } from "@/lib/receivables";

/** Reorder and collection opportunities from imported invoices and the newest unpaid-invoice snapshot. */
export async function companyOpportunities(companyId: string, today: string) {
  const r = await getDb().execute(sql`
    select c.code as customer_code, c.name as customer_name, i.invoice_date::text as date, sum(s.net_sales)::text as value
    from invoices i
    join customers c on c.company_id = i.company_id and c.id = i.customer_id
    join sales_lines s on s.company_id = i.company_id and s.invoice_id = i.id
    where i.company_id = ${companyId} and i.invoice_date <= ${today}::date
    group by c.code, c.name, i.id, i.invoice_date
  `);
  const orders: OrderRow[] = (r.rows as Record<string, string>[]).map((x) => ({
    customerCode: String(x.customer_code),
    customerName: String(x.customer_name),
    date: String(x.date),
    value: Number(x.value),
  }));
  if (orders.length === 0) return null;
  const ar = await companyReceivables(companyId, Number.MAX_SAFE_INTEGER);
  const overdue = new Map((ar?.topOverdue ?? []).map((c) => [c.customerCode, { name: c.customerName, amount: c.overdue }]));
  return { ...buildOpportunities(orders, overdue, today), receivablesAsOf: ar?.asOf ?? null };
}
