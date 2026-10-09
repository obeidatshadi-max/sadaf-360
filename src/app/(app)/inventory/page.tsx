import type { Metadata } from "next";
import { PageHeading } from "@/components/page-heading";
import { EXPIRY_WINDOW_DAYS, SLOW_COVER_DAYS } from "@/core/stock-risk";
import { requireUser } from "@/lib/auth/current-user";
import { companyStockRisk } from "@/lib/stock-risk";
import { jod } from "@/lib/format";

export const metadata: Metadata = { title: "Inventory & supply" };

const n = (v: number) => v.toLocaleString("en-US");

export default async function InventoryPage() {
  const user = await requireUser();
  if (user.guest) {
    return <PageHeading eyebrow="Inventory & supply" title="Stock risk" sub="Sign in as a company user to see stock risk from imported data." />;
  }
  const r = await companyStockRisk(user.companyId);
  if (!r) {
    return (
      <div>
        <PageHeading eyebrow={`${user.companyName} · Inventory & supply`} title="Stock risk" sub="No stock file has been imported yet. Import the Stock by batch export (E06) to see slow-moving and near-expiry stock." />
        {user.role === "owner" ? (
          <a href="/imports" className="rounded-[7px] bg-brand px-4 py-2 text-sm font-semibold text-brand-ink hover:bg-[#125747]">
            Import data
          </a>
        ) : null}
      </div>
    );
  }

  const shortHistory = r.historyDays === null || r.historyDays < 90;
  const stats = [
    { label: "Stock value (owned)", value: jod(r.stockValue), note: `${n(r.rows)} stock rows as of ${r.asOf}` },
    { label: "Slow or unused stock", value: jod(r.slowValue), note: `No use in ${r.windowDays} days, or over ${SLOW_COVER_DAYS} days of cover` },
    { label: "Expired stock", value: jod(r.expiredValue), note: "At cost, still on the shelf" },
    { label: "Expiry loss, estimated", value: jod(r.expiryLossEstimate), note: `Not sellable before expiry, next ${EXPIRY_WINDOW_DAYS} days` },
  ];

  return (
    <div>
      <PageHeading
        eyebrow={`${user.companyName} · Inventory & supply`}
        title="Stock risk"
        sub={`Owned stock only, valued at unit cost, from the stock snapshot of ${r.asOf}. Demand is the average daily customer issues over the ${r.windowDays} days before it.`}
      />
      {shortHistory ? (
        <p className="mb-4 rounded-lg border border-line bg-white p-3 text-xs text-muted" role="note">
          {r.historyDays === null ? "No stock issues have been imported." : `Only ${r.historyDays} days of stock issues have been imported.`} Cover and expiry estimates need about 90 days or more of issues to be reliable; until then products may be shown as unused when they are not.
        </p>
      ) : null}
      <div className="grid grid-cols-2 gap-[10px] md:gap-[14px] min-[1000px]:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-[9px] border border-line bg-white p-[15px] md:p-[21px]">
            <p className="text-[11px] text-muted md:text-xs">{s.label}</p>
            <p className="my-2 text-2xl tracking-[-0.9px] md:text-[29px]">{s.value}</p>
            <p className="text-[10px] text-muted md:text-[11px]">{s.note}</p>
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs text-muted">
        Slow stock and expiry loss overlap, so do not add them together.
        {r.rowsWithoutCost > 0 ? ` ${r.rowsWithoutCost} stock row${r.rowsWithoutCost === 1 ? " has" : "s have"} no unit cost and ${r.rowsWithoutCost === 1 ? "is" : "are"} left out of every value above.` : ""}
      </p>

      <section aria-label="Slow stock" className="mt-6">
        <h2 className="text-sm font-semibold">Largest slow or unused stock</h2>
        {r.slowProducts.length === 0 ? (
          <p className="mt-2 text-sm text-muted">None.</p>
        ) : (
          <div className="mt-2 overflow-x-auto rounded-lg border border-line bg-white">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-muted">
                <tr>
                  <th className="px-3 py-2 font-medium">Product</th>
                  <th className="px-3 py-2 font-medium">Line</th>
                  <th className="px-3 py-2 text-right font-medium">Quantity</th>
                  <th className="px-3 py-2 text-right font-medium">Value</th>
                  <th className="px-3 py-2 text-right font-medium">Cover</th>
                </tr>
              </thead>
              <tbody>
                {r.slowProducts.map((p) => (
                  <tr key={p.productCode} className="border-t border-line">
                    <td className="px-3 py-2">
                      {p.productName} <span className="text-xs text-muted">{p.productCode}</span>
                    </td>
                    <td className="px-3 py-2">{p.line}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{n(p.quantity)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{jod(p.value)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{typeof p.coverDays === "number" ? `${n(p.coverDays)} d` : "No recent use"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section aria-label="Expiry risk" className="mt-6">
        <h2 className="text-sm font-semibold">Batches at expiry risk (estimated)</h2>
        {r.expiryRisks.length === 0 ? (
          <p className="mt-2 text-sm text-muted">No batch expires within {EXPIRY_WINDOW_DAYS} days with stock left over.</p>
        ) : (
          <div className="mt-2 overflow-x-auto rounded-lg border border-line bg-white">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-muted">
                <tr>
                  <th className="px-3 py-2 font-medium">Product</th>
                  <th className="px-3 py-2 font-medium">Batch</th>
                  <th className="px-3 py-2 font-medium">Expires</th>
                  <th className="px-3 py-2 text-right font-medium">Quantity</th>
                  <th className="px-3 py-2 text-right font-medium">Unsold at expiry</th>
                  <th className="px-3 py-2 text-right font-medium">Est. loss</th>
                </tr>
              </thead>
              <tbody>
                {r.expiryRisks.map((x) => (
                  <tr key={`${x.productCode}-${x.batch}`} className="border-t border-line">
                    <td className="px-3 py-2">
                      {x.productName} <span className="text-xs text-muted">{x.productCode}</span>
                    </td>
                    <td className="px-3 py-2">{x.batch || "—"}</td>
                    <td className="px-3 py-2 tabular-nums">
                      {x.expiryDate} <span className="text-xs text-muted">{x.expired ? "expired" : `${x.daysLeft} d`}</span>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{n(x.quantity)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{n(x.unsold)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{jod(x.estimatedLoss)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-1.5 text-xs text-muted">Estimate, not a confirmed loss: it assumes demand stays at the recent average and the earliest-expiring batch sells first.</p>
      </section>
    </div>
  );
}
