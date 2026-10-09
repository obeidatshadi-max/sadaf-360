import type { Metadata } from "next";

export const metadata: Metadata = { title: "Overview" };

export default function DashboardPage() {
  return (
    <section className="rounded-lg border border-line bg-surface p-6">
      <h1 className="text-xl font-semibold">Overview</h1>
      <p className="mt-2 text-sm text-muted">
        No data has been imported yet. The first step is importing the Alpha ERP exports (sales, products, customers, receivables, stock);
        every figure on this page will then show its source file and as-of date.
      </p>
    </section>
  );
}
