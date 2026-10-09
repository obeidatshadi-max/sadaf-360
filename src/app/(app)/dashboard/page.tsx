import type { Metadata } from "next";
import { PageHeading } from "@/components/page-heading";
import { requireUser } from "@/lib/auth/current-user";
import { companyDataSummary } from "@/lib/company-data-summary";
import { GuestOverview } from "@/demo/guest-overview";

export const metadata: Metadata = { title: "Overview" };

const n = (v: number) => v.toLocaleString("en-US");

export default async function DashboardPage() {
  const user = await requireUser();
  // Guests (open access) see the synthetic demonstration dataset; signed-in users see their own company's data.
  if (user.guest) return <GuestOverview />;

  const d = await companyDataSummary(user.companyId);
  const empty = d.products + d.customers + d.invoices + d.receipts + d.stockTransactions + d.installedUnits === 0 && !d.openInvoices && !d.stock;
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
            : "What has been imported so far. The sales, margin, cash and receivables figures are being built on this data; until then these are counts of loaded records, not business results."
        }
      />
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
