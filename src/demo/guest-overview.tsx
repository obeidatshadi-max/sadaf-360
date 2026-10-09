import { DEMO_AS_OF, DEMO_PERIOD } from "./dataset";
import { LOW_CAPTURE, SCENARIO, lineRows, receivables, recurring, service, stockRows, tenderRows, totals } from "./overview";
import { jod, jodShort, pct } from "@/lib/format";

const card = "rounded-lg border border-line bg-surface p-5";
const th = "px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-muted";
const td = "px-3 py-2.5 text-sm";

function Tile({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className={card}>
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-2 text-2xl font-medium tracking-tight">{value}</p>
      <p className="mt-1 text-xs text-muted">{note}</p>
    </div>
  );
}

function Panel({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <section className={card}>
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="mb-3 mt-0.5 text-xs text-muted">{sub}</p>
      <div className="overflow-x-auto">{children}</div>
    </section>
  );
}

function Head({ cols }: { cols: string[] }) {
  return (
    <thead>
      <tr>
        {cols.map((h) => (
          <th key={h} className={th}>
            {h}
          </th>
        ))}
      </tr>
    </thead>
  );
}

/** Guest (open-access) overview: synthetic dataset, every figure derived through the calculation core. */
export function GuestOverview() {
  const t = totals();
  const lr = lineRows();
  const ar = receivables();
  const st = stockRows();
  const rc = recurring();
  const sv = service();
  const tn = tenderRows();

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-brand">Sadaf Medical · Jordan · {DEMO_PERIOD}</p>
        <h1 className="mt-1 text-2xl font-medium tracking-tight">Owner overview</h1>
        <p className="mt-1 text-sm text-muted">
          Made-up demonstration data, on {DEMO_AS_OF}. These are not real company figures. Estimates are labelled. Check them against Alpha ERP.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label="Sales this year" value={jodShort(t.sales)} note="Sales without tax, by business line" />
        <Tile label="Gross profit" value={jodShort(t.grossProfit)} note={`${pct(t.margin, 1)} margin · before running costs`} />
        <Tile label="Cash received this year" value={jodShort(t.cashCollected)} note="Some payments may be for earlier sales" />
        <Tile label="Overdue balances" value={jodShort(ar.overdue)} note="Sample of unpaid invoices, not the total owed" />
      </div>

      <Panel title="Sales and margin by line" sub="Profit after costs = gross profit minus direct delivery costs. It does not include company running costs, tax or loan costs.">
        <table className="w-full whitespace-nowrap">
          <Head cols={["Line", "Sales this year", "Gross profit", "Gross margin", "Direct costs", "Profit after costs", "Cash received"]} />
          <tbody>
            {lr.map((r) => (
              <tr key={r.name} className="border-t border-line">
                <td className={`${td} font-medium`}>{r.name}</td>
                <td className={td}>{jodShort(r.sales)}</td>
                <td className={td}>{jodShort(r.grossProfit)}</td>
                <td className={td}>{pct(r.margin)}</td>
                <td className={td}>{jodShort(r.directCosts)}</td>
                <td className={td}>
                  {jodShort(r.contribution)} <span className="text-muted">({pct(r.contributionMargin, 1)})</span>
                </td>
                <td className={td}>{jodShort(r.cashCollected)}</td>
              </tr>
            ))}
            <tr className="border-t border-line font-medium">
              <td className={td}>All lines</td>
              <td className={td}>{jodShort(t.sales)}</td>
              <td className={td}>{jodShort(t.grossProfit)}</td>
              <td className={td}>{pct(t.margin)}</td>
              <td className={td}>{jodShort(t.directCosts)}</td>
              <td className={td}>{jodShort(t.contribution)}</td>
              <td className={td}>{jodShort(t.cashCollected)}</td>
            </tr>
          </tbody>
        </table>
      </Panel>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Unpaid invoices by age" sub={`Sample of unpaid invoices. Age is counted from the due date on ${DEMO_AS_OF}.`}>
          <table className="w-full">
            <Head cols={["Days past due", "Amount"]} />
            <tbody>
              {ar.buckets.map((b) => (
                <tr key={b.bucket} className="border-t border-line">
                  <td className={td}>{b.bucket}</td>
                  <td className={td}>{jod(b.amount)}</td>
                </tr>
              ))}
              <tr className="border-t border-line font-medium">
                <td className={td}>Total listed</td>
                <td className={td}>{jod(ar.total)}</td>
              </tr>
            </tbody>
          </table>
        </Panel>

        <Panel title="Stock risk" sub="Possible loss from expiry = units we cannot sell before they expire × unit cost. It is an estimate, not a confirmed loss.">
          <table className="w-full whitespace-nowrap">
            <Head cols={["Product", "Value", "Cover (mo)", "Expiry", "Exposure"]} />
            <tbody>
              {st.rows.map((r) => (
                <tr key={r.id} className="border-t border-line">
                  <td className={td}>
                    {r.name}
                    <span className="block text-[11px] text-muted">{r.risk}</span>
                  </td>
                  <td className={td}>{jod(r.value)}</td>
                  <td className={td}>{r.months}</td>
                  <td className={td}>{r.expiry}</td>
                  <td className={td}>{r.expiryLoss ? jod(r.expiryLoss) : "—"}</td>
                </tr>
              ))}
              <tr className="border-t border-line font-medium">
                <td className={td}>Total</td>
                <td className={td}>{jod(st.totalValue)}</td>
                <td className={td} />
                <td className={td} />
                <td className={td}>{jod(st.expiryExposure)}</td>
              </tr>
            </tbody>
          </table>
        </Panel>
      </div>

      <Panel
        title="Repeat consumables"
        sub={`Group of installed units (${sv.units} sample units). A gap of ${jod(rc.gap)} a month is an estimated gap in purchases to look into. It is not a confirmed loss.`}
      >
        <table className="w-full whitespace-nowrap">
          <Head cols={["Unit", "Account", "Expected / mo", "Actual / mo", "Capture", "Contract"]} />
          <tbody>
            {rc.rows.map((u) => (
              <tr key={u.id} className="border-t border-line">
                <td className={td}>
                  {u.name}
                  <span className="block text-[11px] text-muted">{u.id}</span>
                </td>
                <td className={td}>{u.account}</td>
                <td className={td}>{jod(u.expected)}</td>
                <td className={td}>{jod(u.actual)}</td>
                <td className={`${td} ${typeof u.capture === "number" && u.capture < LOW_CAPTURE ? "font-medium text-bad" : ""}`}>{pct(u.capture)}</td>
                <td className={td}>{u.service}</td>
              </tr>
            ))}
            <tr className="border-t border-line font-medium">
              <td className={td}>Cohort</td>
              <td className={td} />
              <td className={td}>{jod(rc.expected)}</td>
              <td className={td}>{jod(rc.actual)}</td>
              <td className={td}>{pct(rc.capture)}</td>
              <td className={td}>
                {sv.covered} of {sv.units} covered · {sv.actionNeeded} need action
              </td>
            </tr>
          </tbody>
        </table>
        <p className="mt-3 text-xs text-muted">
          Example (assumptions, not a forecast): if we win back {pct(SCENARIO.shareWon)} of the gap at a profit margin of {pct(SCENARIO.margin)}, we add about{" "}
          {jod(rc.scenario.extraSales)} sales and {jod(rc.scenario.extraProfit)} profit a year, if demand stays the same. {rc.lowCapture} units buy less than{" "}
          {pct(LOW_CAPTURE)} of the estimated need.
        </p>
      </Panel>

      <Panel title="Tenders" sub={`Face value ${jodShort(tn.totalValue)}, average planned margin ${pct(tn.weightedMargin, 1)}. A tender is not sales until the contract is booked.`}>
        <table className="w-full whitespace-nowrap">
          <Head cols={["Tender", "Stage", "Value", "Planned margin", "Product cost", "Freight & install", "Attention"]} />
          <tbody>
            {tn.rows.map((r) => (
              <tr key={r.id} className="border-t border-line">
                <td className={td}>
                  {r.name}
                  <span className="block text-[11px] text-muted">
                    {r.id} · {r.account}
                  </span>
                </td>
                <td className={td}>{r.stage}</td>
                <td className={td}>{jod(r.value)}</td>
                <td className={td}>{r.margin}%</td>
                <td className={td}>{jod(r.productCost)}</td>
                <td className={td}>{jod(r.fulfillment)}</td>
                <td className={td}>{r.risk}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      <p className="text-xs text-muted">
        Gross profit = net sales − cost of goods; it excludes freight, installation, warranty, overhead and finance costs. Standalone consumable sales:{" "}
        {jodShort(t.standaloneConsumables)} (not linked to installed units). Repeat consumables are counted once, in Consumables.
      </p>
    </div>
  );
}
