import type { Metadata } from "next";
import { PageHeading } from "@/components/page-heading";
import { requireUser } from "@/lib/auth/current-user";
import { businessToday } from "@/lib/business-date";
import { companyCash } from "@/lib/cash";
import { companyDataSummary } from "@/lib/company-data-summary";
import { companyReceivables } from "@/lib/receivables";
import { companySalesByLine } from "@/lib/sales-by-line";
import { companyStockRisk } from "@/lib/stock-risk";
import { jod, pct, signedPct } from "@/lib/format";
import { GuestOverview } from "@/demo/guest-overview";

export const metadata: Metadata = { title: "Overview" };

const n = (v: number) => v.toLocaleString("en-US");

export default async function DashboardPage() {
  const user = await requireUser();
  // Guests (open access) see the synthetic demonstration dataset; signed-in users see their own company's data.
  if (user.guest) return <GuestOverview />;

  const today = businessToday();
  const [d, sales, cash, ar, stock] = await Promise.all([
    companyDataSummary(user.companyId),
    companySalesByLine(user.companyId, today),
    companyCash(user.companyId, today),
    companyReceivables(user.companyId),
    companyStockRisk(user.companyId),
  ]);
  const empty = d.products + d.customers + d.invoices + d.receipts + d.stockTransactions + d.installedUnits === 0 && !d.openInvoices && !d.stock;
  const t = sales.total;
  const headline: { label: string; value: string; note: string; href: string }[] = [
    {
      label: "Sales this year",
      value: d.invoices > 0 ? jod(t.sales) : "—",
      note: d.invoices > 0 ? `${signedPct(t.growth)} vs same dates last year` : "No sales imported yet",
      href: "/finance",
    },
    {
      label: "Gross margin",
      value: pct(t.margin, 1),
      note: typeof t.costCoverage === "number" ? `Cost known for ${pct(t.costCoverage)} of sales` : "Needs sales with cost",
      href: "/finance",
    },
    {
      label: "Cash collected this year",
      value: cash ? jod(cash.ytd) : "—",
      note: cash ? `${signedPct(cash.growth)} vs same dates last year` : "No receipts imported yet",
      href: "/finance",
    },
    {
      label: "Overdue receivables",
      value: ar ? jod(ar.overdue) : "—",
      note: ar ? `of ${jod(ar.total)} unpaid, as of ${ar.asOf}${ar.dueDateMissing.invoices > 0 ? `; ${ar.dueDateMissing.invoices} invoice${ar.dueDateMissing.invoices === 1 ? "" : "s"} have no due date` : ""}` : "No unpaid-invoice file yet",
      href: "/finance",
    },
    {
      label: "Slow or unused stock",
      value: stock ? jod(stock.slowValue) : "—",
      note: stock ? `of ${jod(stock.stockValue)} owned stock, as of ${stock.asOf}` : "No stock file yet",
      href: "/inventory",
    },
    {
      label: "Expiry loss, estimated",
      value: stock ? jod(stock.expiryLossEstimate) : "—",
      note: stock ? `${jod(stock.expiredValue)} already expired. Estimate, overlaps slow stock` : "No stock file yet",
      href: "/inventory",
    },
  ];
  const stats: { label: string; value: string; note: string }[] = [
    { label: "Products", value: n(d.products), note: "From the product list" },
    { label: "Customers", value: n(d.customers), note: "From the customer list" },
    { label: "Invoices", value: n(d.invoices), note: `${n(d.salesLines)} sales and return lines` },
    { label: "Receipts", value: n(d.receipts), note: "Cash allocation rows" },
    {
      label: "Unpaid invoices",
      value: d.openInvoices ? n(d.openInvoices.rows) : "—",
      note: d.openInvoices ? `Snapshot as of ${d.openInvoices.asOf}` : "Not imported yet",
    },
    { label: "Stock rows", value: d.stock ? n(d.stock.rows) : "—", note: d.stock ? `Snapshot as of ${d.stock.asOf}` : "Not imported yet" },
    { label: "Stock transactions", value: n(d.stockTransactions), note: "Issues, returns, transfers" },
    { label: "Installed equipment", value: n(d.installedUnits), note: "Units at customers" },
  ];

  return (
    <div>
      <PageHeading
        eyebrow={`${user.companyName} · Owner overview`}
        title="Owner overview"
        sub={
          empty
            ? "No data has been imported yet. Import the Alpha ERP exports first (products, customers, sales, receipts, unpaid invoices, stock)."
            : "Worked out from the Alpha ERP files imported so far. Every figure names its period or as-of date; a dash means the file or data it needs is missing. Click a tile for the detail."
        }
      />
      <div className="mb-8 grid grid-cols-2 gap-[10px] md:gap-[14px] min-[1000px]:grid-cols-3">
        {headline.map((s) => (
          <a key={s.label} href={s.href} className="rounded-[9px] border border-line bg-white p-[15px] hover:border-brand md:p-[21px]">
            <p className="text-[11px] text-muted md:text-xs">{s.label}</p>
            <p className="my-2 text-2xl tracking-[-0.9px] md:text-[29px]">{s.value}</p>
            <p className="text-[10px] text-muted md:text-[11px]">{s.note}</p>
          </a>
        ))}
      </div>
      <h2 className="mb-3 text-sm font-semibold">Data loaded</h2>
      <div className="grid grid-cols-2 gap-[10px] md:gap-[14px] min-[1000px]:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-[9px] border border-line bg-white p-[15px] md:p-[21px]">
            <p className="text-[11px] text-muted md:text-xs">{s.label}</p>
            <p className="my-2 text-2xl tracking-[-0.9px] md:text-[29px]">{s.value}</p>
            <p className="text-[10px] text-muted md:text-[11px]">{s.note}</p>
          </div>
        ))}
      </div>
      <div className="mt-5 flex flex-wrap gap-3">
        {user.role === "owner" ? (
          <a href="/imports" className="rounded-[7px] bg-brand px-4 py-2 text-sm font-semibold text-brand-ink hover:bg-[#125747]">
            Import data
          </a>
        ) : null}
        <a href="/sample" className="rounded-[7px] border border-line bg-white px-4 py-2 text-sm hover:border-brand hover:bg-[#f0f6f2]">
          Explore with sample data
        </a>
      </div>
    </div>
  );
}
