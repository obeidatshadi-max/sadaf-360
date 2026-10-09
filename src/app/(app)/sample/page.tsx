import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/current-user";
import { GuestOverview } from "@/demo/guest-overview";

export const metadata: Metadata = { title: "Sample data" };

/** Any signed-in user can explore the product on the synthetic dataset before importing their own data. */
export default async function SamplePage() {
  await requireUser();
  return <GuestOverview />;
}
