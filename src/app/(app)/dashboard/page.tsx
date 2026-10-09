import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/current-user";
import { GuestOverview } from "@/demo/guest-overview";

export const metadata: Metadata = { title: "Overview" };

export default async function DashboardPage() {
  const user = await requireUser();
  // Guests (open access) see the synthetic demonstration dataset; signed-in users see their own company's data.
  if (user.guest) return <GuestOverview />;
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
