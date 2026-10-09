import type { Metadata } from "next";
import { PageHeading } from "@/components/page-heading";
import type { Change } from "@/core/weekly";
import { requireUser } from "@/lib/auth/current-user";
import { businessToday } from "@/lib/business-date";
import { companyWeekly } from "@/lib/weekly";
import { jod, signedPct } from "@/lib/format";

export const metadata: Metadata = { title: "Weekly summary" };

const jordanTime = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Amman", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: false });
const sign = (v: number) => (v > 0 ? "+" : v < 0 ? "-" : "");

function Tile({ label, c, money, note }: { label: string; c: Change; money: boolean; note: string }) {
  const fmt = (v: number) => (money ? jod(v) : v.toLocaleString("en-US"));
  return (
    <div className="rounded-[9px] border border-line bg-white p-[15px] md:p-[21px]">
      <p className="text-[11px] text-muted md:text-xs">{label}</p>
      <p className="my-2 text-2xl tracking-[-0.9px] md:text-[29px]">{fmt(c.now)}</p>
      <p className="text-[10px] text-muted md:text-[11px]">
        {sign(c.delta)}
        {fmt(Math.abs(c.delta))} ({signedPct(c.pct)}) vs {fmt(c.before)} the week before
      </p>
      <p className="mt-1 text-[10px] text-muted md:text-[11px]">{note}</p>
    </div>
  );
}

export default async function WeeklyPage() {
  const user = await requireUser();
  if (user.guest) {
    return <PageHeading eyebrow="Data & update routine" title="Weekly summary" sub="Sign in as a company user to see what changed this week in your imported data." />;
  }
  const w = await companyWeekly(user.companyId, businessToday());
  const { thisFrom, thisTo, prevFrom, prevTo } = w.windows;
  const nothing = w.sales.now === 0 && w.sales.before === 0 && w.cash.now === 0 && w.cash.before === 0;

  return (
    <div>
      <PageHeading
        eyebrow={`${user.companyName} · Data & update routine`}
        title="Weekly summary"
        sub={`What changed in the last 7 days (${thisFrom} to ${thisTo}) against the 7 before (${prevFrom} to ${prevTo}), from the files imported so far. It is only as current as the last import.`}
      />
      {nothing ? (
        <p className="mb-4 rounded-lg border border-line bg-white p-3 text-xs text-muted" role="note">
          No sales or cash fall in these two weeks. Either nothing happened or the latest export has not been imported yet, so check the import dates below before reading the zeros.
        </p>
      ) : null}
      <div className="grid grid-cols-2 gap-[10px] md:gap-[14px] min-[1000px]:grid-cols-3">
        <Tile label="Sales" c={w.sales} money note="Net of tax, returns deducted" />
        <Tile label="Cash collected" c={w.cash} money note="Customer receipts" />
        <Tile label="Invoices issued" c={w.orders} money={false} note="Invoices with positive sales" />
      </div>

      <section aria-label="Overdue receivables" className="mt-6">
        <h2 className="text-sm font-semibold">Overdue receivables</h2>
        {w.overdue ? (
          <p className="mt-1 text-sm">
            {jod(w.overdue.now.now)} overdue as of {w.overdue.nowAsOf}, {w.overdue.now.delta >= 0 ? "up" : "down"} {jod(Math.abs(w.overdue.now.delta))} from {jod(w.overdue.now.before)} as of {w.overdue.beforeAsOf}.
            <span className="text-xs text-muted"> Compared snapshot to snapshot, not week to week.</span>
          </p>
        ) : (
          <p className="mt-1 text-sm text-muted">Needs two unpaid-invoice imports on different dates to show a change.</p>
        )}
      </section>

      <section aria-label="Top customers this week" className="mt-6">
        <h2 className="text-sm font-semibold">Biggest customers this week</h2>
        {w.topCustomers.length === 0 ? (
          <p className="mt-1 text-sm text-muted">No sales in the last 7 days.</p>
        ) : (
          <div className="mt-2 overflow-x-auto rounded-lg border border-line bg-white">
            <table className="w-full text-left text-sm">
              <tbody>
                {w.topCustomers.map((c) => (
                  <tr key={c.code} className="border-t border-line first:border-t-0">
                    <td className="px-3 py-2">
                      {c.name} <span className="text-xs text-muted">{c.code}</span>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{jod(c.sales)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section aria-label="Imports this week" className="mt-6">
        <h2 className="text-sm font-semibold">Files imported in the last 7 days</h2>
        {w.importsThisWeek.length === 0 ? (
          <p className="mt-1 text-sm text-muted">None. The figures above may be out of date.</p>
        ) : (
          <ul className="mt-1 text-sm">
            {w.importsThisWeek.map((i) => (
              <li key={i.kind}>
                {i.kind.replace("_", " ")} <span className="text-xs text-muted">last loaded {jordanTime.format(i.at)} Jordan time</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
