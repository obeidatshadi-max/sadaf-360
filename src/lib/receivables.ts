import "server-only";
import { sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { buildReceivables, type OpenInvoiceRow, type ReceivablesReport } from "@/core/receivables";

/** Receivables aging from the company's newest unpaid-invoice snapshot, or null when none has been imported. */
export async function companyReceivables(companyId: string): Promise<(ReceivablesReport & { sourceRows: number }) | null> {
  const db = getDb();
  const latest = await db.execute(sql`select max(snapshot_date)::text as d from open_invoice_snapshots where company_id = ${companyId}`);
  const asOf = (latest.rows[0] as { d: string | null } | undefined)?.d;
  if (!asOf) return null;
  const r = await db.execute(sql`
    select i.invoice_no, c.code as customer_code, c.name as customer_name, s.remaining_amount::text as remaining, i.due_date::text as due_date
    from open_invoice_snapshots s
    join invoices i on i.company_id = s.company_id and i.id = s.invoice_id
    join customers c on c.company_id = i.company_id and c.id = i.customer_id
    where s.company_id = ${companyId} and s.snapshot_date = ${asOf}
  `);
  const rows: OpenInvoiceRow[] = (r.rows as Record<string, string | null>[]).map((x) => ({
    invoiceNo: String(x.invoice_no),
    customerCode: String(x.customer_code),
    customerName: String(x.customer_name),
    remaining: Number(x.remaining),
    dueDate: x.due_date,
  }));
  return { ...buildReceivables(rows, asOf), sourceRows: rows.length };
}
