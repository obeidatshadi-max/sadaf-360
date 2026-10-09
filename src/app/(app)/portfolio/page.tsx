import type { Metadata } from "next";
import { PageHeading } from "@/components/page-heading";
import { CONCENTRATION_LIMIT, GROWTH_THRESHOLD, MIN_SHARE, NOT_SET, THIN_PRODUCTS, nextStep, type AreaFigures } from "@/core/portfolio";
import { requireUser } from "@/lib/auth/current-user";
import { businessToday } from "@/lib/business-date";
import { companyPortfolio } from "@/lib/portfolio";
import { jod, pct, signedPct } from "@/lib/format";

export const metadata: Metadata = { title: "Products & suppliers" };

const tone = (a: AreaFigures) => (a.signal === "Growing" ? "text-brand" : a.signal === "Declining" ? "text-[#a44d42]" : "text-muted");

export default async function PortfolioPage() {
  const user = await requireUser();
  if (user.guest) {
    return <PageHeading eyebrow="Products & suppliers" title="Portfolio growth" sub="Sign in as a company user to see portfolio growth from imported data." />;
  }
  const p = await companyPortfolio(user.companyId, businessToday());
  if (!p) {
    return (
      <div>
        <PageHeading eyebrow={`${user.companyName} · Products & suppliers`} title="Portfolio growth" sub="No sales have been imported for this year or last year yet. Import products, customers and sales to see where demand is growing." />
        {user.role === "owner" ? (
          <a href="/imports" className="rounded-[7px] bg-brand px-4 py-2 text-sm font-semibold text-brand-ink hover:bg-[#125747]">
            Import data
          </a>
        ) : null}
      </div>
    );
  }

  return (
    <div>
      <PageHeading
        eyebrow={`${user.companyName} · Products & suppliers`}
        title="Portfolio growth"
        sub={`Where demand is growing, by therapeutic area and customer type: ${p.from} to ${p.to} against ${p.priorFrom} to ${p.priorTo}. Net sales, returns deducted. This is a signal to investigate, not a forecast.`}
      />
      {p.unclassifiedShare > 0.2 ? (
        <p className="mb-4 rounded-lg border border-line bg-white p-3 text-xs text-muted" role="note">
          {pct(p.unclassifiedShare)} of this year&rsquo;s sales are on products with no therapeutic area, so the picture below is incomplete. Add an area to each product in the product list (column &ldquo;therapeutic area&rdquo;) and import it again.
        </p>
      ) : null}

      <section aria-label="Where to look for more products">
        <h2 className="text-sm font-semibold">Growing areas with a thin product range</h2>
        {p.lookHere.length === 0 ? (
          <p className="mt-2 text-sm text-muted">No area is both growing broadly and thinly covered right now.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {p.lookHere.map((a) => {
              const best = a.bySegment.find((s) => s.delta > 0);
              return (
                <li key={a.area} className="rounded-[9px] border border-line bg-white p-4 text-sm">
                  <b>{a.area}</b>: sales {signedPct(a.growth)} ({jod(a.delta)} more than last year), spread over {a.customers} customers.
                  {best ? ` Most of the increase is with ${best.segment} customers (${jod(best.delta)}).` : ""} Only {a.activeProducts} active product{a.activeProducts === 1 ? "" : "s"} from {a.suppliers} supplier{a.suppliers === 1 ? "" : "s"}.
                  <span className="mt-1 block text-xs text-muted">Worth checking whether another product or supplier would serve this demand. Confirm the need, margin and supplier fit before acting.</span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-label="Areas" className="mt-6">
        <h2 className="text-sm font-semibold">All areas</h2>
        <div className="mt-2 overflow-x-auto rounded-lg border border-line bg-white">
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-muted">
              <tr>
                <th className="px-3 py-2 font-medium">Therapeutic area</th>
                <th className="px-3 py-2 text-right font-medium">Sales</th>
                <th className="px-3 py-2 text-right font-medium">Share</th>
                <th className="px-3 py-2 text-right font-medium">vs last year</th>
                <th className="px-3 py-2 font-medium">Signal</th>
                <th className="px-3 py-2 text-right font-medium">Top customer</th>
                <th className="px-3 py-2 text-right font-medium">Range</th>
                <th className="px-3 py-2 font-medium">Suggested next step</th>
              </tr>
            </thead>
            <tbody>
              {p.areas.map((a) => (
                <tr key={a.area} className="border-t border-line align-top">
                  <td className="px-3 py-2">
                    {a.area}
                    {a.bySegment.length > 0 ? (
                      <span className="mt-0.5 block text-xs text-muted">
                        {a.bySegment.map((s) => `${s.segment} ${jod(s.sales)} (${signedPct(s.growth)})`).join(" · ")}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{jod(a.sales)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{pct(a.share, 1)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{signedPct(a.growth)}</td>
                  <td className={`px-3 py-2 ${tone(a)}`}>{a.signal}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{a.sales > 0 ? `${pct(a.topCustomerShare)} (${a.topCustomer})` : "—"}</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {a.area === NOT_SET || a.activeProducts === null ? "—" : `${a.activeProducts} products, ${a.suppliers} supplier${a.suppliers === 1 ? "" : "s"}`}
                    {a.thinCoverage ? <span className="block text-xs text-muted">thin</span> : null}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted">{nextStep(a)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-1.5 text-xs text-muted">
          Rules: &ldquo;Growing&rdquo; means up at least {pct(GROWTH_THRESHOLD)} on the same dates last year; &ldquo;Declining&rdquo; means down at least that much. Areas under {pct(MIN_SHARE)} of sales are too small to judge. If one customer is more than{" "}
          {pct(CONCENTRATION_LIMIT)} of an area, growth is attributed to that customer, not called a trend. The range is thin with fewer than {THIN_PRODUCTS} active products or a single supplier.
        </p>
      </section>
    </div>
  );
}
