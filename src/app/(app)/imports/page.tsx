import type { Metadata } from "next";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { importBatches } from "@/db/schema";
import { requireUser } from "@/lib/auth/current-user";
import { ImportForm } from "./import-form";

export const metadata: Metadata = { title: "Import data" };

export default async function ImportsPage() {
  const user = await requireUser();
  if (user.guest || user.role !== "owner") {
    return (
      <section className="rounded-lg border border-line bg-surface p-6">
        <h1 className="text-xl font-semibold">Import data</h1>
        <p className="mt-2 text-sm text-muted">Only the company owner can import ERP files.</p>
      </section>
    );
  }

  const history = await getDb()
    .select({
      id: importBatches.id,
      kind: importBatches.kind,
      fileName: importBatches.fileName,
      snapshotDate: importBatches.snapshotDate,
      rowsAccepted: importBatches.rowsAccepted,
      rowsRejected: importBatches.rowsRejected,
      status: importBatches.status,
      createdAt: importBatches.createdAt,
    })
    .from(importBatches)
    .where(eq(importBatches.companyId, user.companyId))
    .orderBy(desc(importBatches.createdAt))
    .limit(15);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Import data</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Upload the accountant&apos;s Alpha ERP exports. Start with products and customers, then sales, receipts, unpaid invoices and stock: later files point at the codes in the earlier ones.
          Use &quot;Check file&quot; first. It validates everything and shows totals to compare with Alpha, without saving.
        </p>
      </div>
      <ImportForm />
      <section aria-label="Recent imports">
        <h2 className="text-sm font-semibold">Recent imports</h2>
        {history.length === 0 ? (
          <p className="mt-2 text-sm text-muted">Nothing imported yet.</p>
        ) : (
          <div className="mt-2 overflow-x-auto rounded-lg border border-line bg-surface">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-muted">
                <tr>
                  <th className="px-3 py-2 font-medium">When</th>
                  <th className="px-3 py-2 font-medium">Type</th>
                  <th className="px-3 py-2 font-medium">File</th>
                  <th className="px-3 py-2 font-medium">As of</th>
                  <th className="px-3 py-2 text-right font-medium">Loaded</th>
                  <th className="px-3 py-2 text-right font-medium">Rejected</th>
                  <th className="px-3 py-2 font-medium">Result</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id} className="border-t border-line">
                    <td className="px-3 py-2 tabular-nums">{h.createdAt.toISOString().slice(0, 16).replace("T", " ")}</td>
                    <td className="px-3 py-2">{h.kind.replace("_", " ")}</td>
                    <td className="px-3 py-2">{h.fileName}</td>
                    <td className="px-3 py-2 tabular-nums">{h.snapshotDate ?? "—"}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{h.rowsAccepted}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{h.rowsRejected}</td>
                    <td className="px-3 py-2">{h.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
