import "server-only";
import { sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { buildCash, type CashSums } from "@/core/cash";
import { sameDayLastYear } from "@/core/sales-by-line";

/** Cash collected year to date from imported receipts, against the same dates last year. `today` is the Jordan business date. */
export async function companyCash(companyId: string, today: string) {
  const yearStart = `${today.slice(0, 4)}-01-01`;
  const priorStart = `${Number(today.slice(0, 4)) - 1}-01-01`;
  const priorEnd = sameDayLastYear(today);
  const db = getDb();
  const t = await db.execute(sql`
    select
      coalesce(sum(allocated_amount) filter (where receipt_date between ${yearStart}::date and ${today}::date), 0)::text as ytd,
      coalesce(sum(allocated_amount) filter (where receipt_date between ${priorStart}::date and ${priorEnd}::date), 0)::text as prior_ytd,
      coalesce(sum(allocated_amount) filter (where receipt_date between (${today}::date - 29) and ${today}::date), 0)::text as last30,
      coalesce(sum(allocated_amount) filter (where invoice_id is null and receipt_date between ${yearStart}::date and ${today}::date), 0)::text as unlinked,
      count(*)::int as n
    from receipts where company_id = ${companyId}
  `);
  const m = await db.execute(sql`
    select to_char(receipt_date, 'YYYY-MM') as month, sum(allocated_amount)::text as amount
    from receipts
    where company_id = ${companyId} and receipt_date between ${yearStart}::date and ${today}::date
    group by 1 order by 1
  `);
  const row = t.rows[0] as Record<string, string | number>;
  if (Number(row.n) === 0) return null;
  const sums: CashSums = {
    ytd: Number(row.ytd),
    priorYtd: Number(row.prior_ytd),
    last30: Number(row.last30),
    unlinkedYtd: Number(row.unlinked),
    byMonth: (m.rows as Record<string, string>[]).map((x) => ({ month: String(x.month), amount: Number(x.amount) })),
  };
  return { ...buildCash(sums, today), from: yearStart, to: today, priorFrom: priorStart, priorTo: priorEnd };
}
