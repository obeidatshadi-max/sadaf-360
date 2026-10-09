import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/current-user";
import { VIEWS, type View } from "@/demo/accounts";
import { AccountsScreen } from "@/demo/accounts-screen";

export const metadata: Metadata = { title: "Accounts" };

export function generateStaticParams() {
  return VIEWS.map((v) => ({ view: v.key }));
}

export default async function AccountsPage({ params }: { params: Promise<{ view: string }> }) {
  const { view } = await params;
  if (!VIEWS.some((v) => v.key === view)) notFound();
  const user = await requireUser();
  // Guests (open access) see the synthetic dataset; signed-in users see their own company's accounts once data is imported.
  if (user.guest) return <AccountsScreen view={view as View} basePath="/accounts" />;
  return (
    <section className="rounded-lg border border-line bg-surface p-6">
      <h1 className="text-xl font-semibold">Accounts</h1>
      <p className="mt-2 text-sm text-muted">
        No account data has been imported yet. Once the Alpha ERP exports are loaded, this page lists every account split into tender and private, with year-to-date gross profit,
        receivables and status.
      </p>
      <a href={`/sample/accounts/${view}`} className="mt-4 inline-block rounded-md bg-brand px-4 py-2 text-sm font-semibold text-brand-ink">
        Explore with sample data
      </a>
    </section>
  );
}
