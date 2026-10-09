import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/current-user";
import { VIEWS, type View } from "@/demo/accounts";
import { AccountsScreen } from "@/demo/accounts-screen";

export const metadata: Metadata = { title: "Accounts (sample data)" };

export function generateStaticParams() {
  return VIEWS.map((v) => ({ view: v.key }));
}

/** Any signed-in user can explore the accounts screens on the synthetic dataset before importing their own data. */
export default async function SampleAccountsPage({ params }: { params: Promise<{ view: string }> }) {
  const { view } = await params;
  if (!VIEWS.some((v) => v.key === view)) notFound();
  await requireUser();
  return <AccountsScreen view={view as View} basePath="/sample/accounts" banner="Sample data for exploring the product. Not your company's figures." />;
}
