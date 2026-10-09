/**
 * The Overview's "what has been loaded" counts, against a real Postgres engine (PGlite) with the real migrations:
 * correct per company, newest snapshot only, empty company reads as zeros and no snapshots.
 */
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import * as schema from "@/db/schema";
import { runImport, type Db } from "@/db/import-writer";

const h = vi.hoisted(() => ({ db: null as unknown }));
vi.mock("@/db/client", () => ({ getDb: () => h.db }));

let client: PGlite;
let a: string;
let empty: string;
const TODAY = "2026-10-09";
const q = async <T>(sql: string) => (await client.query<T>(sql)).rows;

beforeAll(async () => {
  client = new PGlite();
  h.db = drizzle(client, { schema });
  const dir = fileURLToPath(new URL("../../drizzle/", import.meta.url));
  for (const f of readdirSync(dir).filter((x) => x.endsWith(".sql")).sort()) {
    for (const stmt of readFileSync(dir + f, "utf8").split("--> statement-breakpoint")) if (stmt.trim()) await client.exec(stmt);
  }
  a = (await q<{ id: string }>(`insert into companies (slug, name) values ('a', 'A') returning id`))[0]!.id;
  empty = (await q<{ id: string }>(`insert into companies (slug, name) values ('e', 'E') returning id`))[0]!.id;
  const imp = (kind: Parameters<typeof runImport>[1]["kind"], text: string, snapshotDate?: string) =>
    runImport(h.db as Db, { companyId: a, userId: null, kind, fileName: `${kind}.csv`, text, today: TODAY, snapshotDate, dryRun: false });
  const csv = (...lines: string[]) => lines.join("\n");
  await imp("products", csv("code,name,category", "P1,Gloves,Consumables", "P2,Analyzer,Equipment"));
  await imp("customers", csv("code,name", "C1,Clinic"));
  await imp("sales", csv("invoice no,line no,date,customer code,product code,qty,net sales", "I1,1,2026-09-01,C1,P1,1,10", "I1,2,2026-09-01,C1,P2,1,20"));
  await imp("open_invoices", csv("invoice no,customer code,invoice date,remaining", "I1,C1,2026-09-01,30"), "2026-10-01");
  await imp("open_invoices", csv("invoice no,customer code,invoice date,remaining", "I1,C1,2026-09-01,25"), "2026-10-08");
}, 60_000);
afterAll(async () => client.close());

describe("companyDataSummary", () => {
  it("counts what was loaded and reports only the newest snapshot", async () => {
    const { companyDataSummary } = await import("@/lib/company-data-summary");
    expect(await companyDataSummary(a)).toEqual({
      products: 2,
      customers: 1,
      invoices: 1,
      salesLines: 2,
      receipts: 0,
      stockTransactions: 0,
      installedUnits: 0,
      openInvoices: { asOf: "2026-10-08", rows: 1 },
      stock: null,
    });
  });

  it("ages the newest unpaid-invoice snapshot, leaving invoices without a due date unaged", async () => {
    const { companyReceivables } = await import("@/lib/receivables");
    const r = await companyReceivables(a);
    expect(r).toMatchObject({ asOf: "2026-10-08", total: 25, overdue: 0, sourceRows: 1 });
    expect(r!.dueDateMissing).toEqual({ invoices: 1, amount: 25 });
    expect(await companyReceivables(empty)).toBeNull();
  });

  it("reads an empty company as zeros with no snapshots", async () => {
    const { companyDataSummary } = await import("@/lib/company-data-summary");
    expect(await companyDataSummary(empty)).toMatchObject({ products: 0, invoices: 0, openInvoices: null, stock: null });
  });
});
