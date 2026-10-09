import type { Metadata } from "next";
import { PageHeading } from "@/components/page-heading";
import { MIN_ORDERS } from "@/core/predictions";
import { requireUser } from "@/lib/auth/current-user";
import { businessToday } from "@/lib/business-date";
import { companyOpportunities } from "@/lib/opportunities";
import { jod } from "@/lib/format";

export const metadata: Metadata = { title: "Management actions" };

export default async function OpportunitiesPage() {
  const user = await requireUser();
  if (user.guest) {
    return <PageHeading eyebrow="Management actions" title="Opportunities" sub="Sign in as a company user to see opportunities worked out from imported data." />;
  }
  const r = await companyOpportunities(user.companyId, businessToday());
  if (!r) {
    return (
      <div>
        <PageHeading eyebrow={`${user.companyName} · Management actions`} title="Opportunities" sub="No sales have been imported yet. Import products, customers and sales to see which customers are due to reorder." />
        {user.role === "owner" ? (
          <a href="/imports" className="rounded-[7px] bg-brand px-4 py-2 text-sm font-semibold text-brand-ink hover:bg-[#125747]">
            Import data
          </a>
        ) : null}
      </div>
    );
  }

  const late = r.reorders.filter((x) => x.forecast.level === "Overdue" || x.forecast.level === "Lapsed" || x.forecast.level === "Due soon");

  return (
    <div>
      <PageHeading
        eyebrow={`${user.companyName} · Management actions`}
        title="Opportunities"
        sub={`Where to act first, as of ${r.asOf}. One line per customer: the largest signal is shown and the others are named, never added together.`}
      />

      <section aria-label="Ranked opportunities">
        <h2 className="text-sm font-semibold">Largest opportunities</h2>
        {r.ranked.length === 0 ? (
          <p className="mt-2 text-sm text-muted">Nothing to flag right now: no overdue reorders and no overdue balances.</p>
        ) : (
          <div className="mt-2 overflow-x-auto rounded-lg border border-line bg-white">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-muted">
                <tr>
                  <th className="px-3 py-2 font-medium">Customer</th>
                  <th className="px-3 py-2 font-medium">Signal</th>
                  <th className="px-3 py-2 text-right font-medium">Value</th>
                  <th className="px-3 py-2 font-medium">Also flagged</th>
                </tr>
              </thead>
              <tbody>
                {r.ranked.map((x) => (
                  <tr key={x.customerCode} className="border-t border-line">
                    <td className="px-3 py-2">
                      {x.customerName} <span className="text-xs text-muted">{x.customerCode}</span>
                    </td>
                    <td className="px-3 py-2">
                      {x.kind} {x.estimated ? <span className="rounded bg-[#eef2ef] px-1.5 py-0.5 text-[9px] font-semibold tracking-wide text-muted">ESTIMATED</span> : null}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{jod(x.value)}</td>
                    <td className="px-3 py-2 text-xs text-muted">{x.alsoFlagged.length > 0 ? x.alsoFlagged.join(", ") : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-1.5 text-xs text-muted">
          &ldquo;Reorder overdue&rdquo; is an estimate: the customer&rsquo;s average order over the last 12 months, shown because their own usual reorder gap has passed. &ldquo;Collect overdue&rdquo; is a real balance
          past its due date{r.receivablesAsOf ? ` (unpaid invoices as of ${r.receivablesAsOf})` : ", but no unpaid-invoice file has been imported, so none is shown"}.
        </p>
      </section>

      <section aria-label="Reorder timing" className="mt-6">
        <h2 className="text-sm font-semibold">Customers due or past their usual reorder</h2>
        <p className="mt-1 text-xs text-muted">
          ESTIMATED from each customer&rsquo;s own order history, which needs at least {MIN_ORDERS} order days. {n(r.customersWithEnoughHistory)} customer{r.customersWithEnoughHistory === 1 ? " has" : "s have"} enough;{" "}
          {n(r.customersWithoutEnoughHistory)} {r.customersWithoutEnoughHistory === 1 ? "has" : "have"} too few orders and {r.customersWithoutEnoughHistory === 1 ? "is" : "are"} not guessed.
        </p>
        {late.length === 0 ? (
          <p className="mt-2 text-sm text-muted">No customer is due or late.</p>
        ) : (
          <div className="mt-2 overflow-x-auto rounded-lg border border-line bg-white">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-muted">
                <tr>
                  <th className="px-3 py-2 font-medium">Customer</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 text-right font-medium">Usual gap</th>
                  <th className="px-3 py-2 font-medium">Last order</th>
                  <th className="px-3 py-2 font-medium">Expected</th>
                  <th className="px-3 py-2 text-right font-medium">Average order</th>
                  <th className="px-3 py-2 font-medium">Confidence</th>
                </tr>
              </thead>
              <tbody>
                {late.slice(0, 25).map((x) => (
                  <tr key={x.customerCode} className="border-t border-line">
                    <td className="px-3 py-2">
                      {x.customerName} <span className="text-xs text-muted">{x.customerCode}</span>
                    </td>
                    <td className="px-3 py-2">{x.forecast.level}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{x.forecast.cycleDays} d</td>
                    <td className="px-3 py-2 tabular-nums">{x.forecast.lastOrder}</td>
                    <td className="px-3 py-2 tabular-nums">
                      {x.forecast.expectedNext} <span className="text-xs text-muted">{x.forecast.daysToNext < 0 ? `${-x.forecast.daysToNext} d late` : `in ${x.forecast.daysToNext} d`}</span>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{jod(x.averageOrder)}</td>
                    <td className="px-3 py-2">{x.forecast.confidence}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

const n = (v: number) => v.toLocaleString("en-US");
