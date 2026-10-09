/**
 * Business-data schema against a real Postgres engine (PGlite) using the project's actual migrations.
 * Checks the guarantees the importers rely on: tenant isolation, re-import safety, and "missing stays NULL".
 */
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

let db: PGlite;
let a: string; // company A
let b: string; // company B

const q = async <T = Record<string, unknown>>(sql: string, params: unknown[] = []) => (await db.query<T>(sql, params)).rows;
const id = async (sql: string, params: unknown[]) => ((await q<{ id: string }>(sql, params))[0]!.id);
const rejects = async (p: Promise<unknown>, pattern: RegExp) => {
  await expect(p).rejects.toThrow(pattern);
};

const customer = (company: string, code: string) =>
  id(`insert into customers (company_id, code, name) values ($1, $2, $2) returning id`, [company, code]);
const product = (company: string, code: string) =>
  id(`insert into products (company_id, code, name, line) values ($1, $2, $2, 'Consumables') returning id`, [company, code]);

beforeAll(async () => {
  db = new PGlite();
  const dir = fileURLToPath(new URL("../../drizzle/", import.meta.url));
  for (const f of readdirSync(dir).filter((x) => x.endsWith(".sql")).sort()) {
    for (const stmt of readFileSync(dir + f, "utf8").split("--> statement-breakpoint")) if (stmt.trim()) await db.exec(stmt);
  }
  a = await id(`insert into companies (slug, name) values ('a', 'Company A') returning id`, []);
  b = await id(`insert into companies (slug, name) values ('b', 'Company B') returning id`, []);
});
afterAll(async () => db.close());

describe("business schema", () => {
  it("creates every table", async () => {
    const names = (await q<{ table_name: string }>(`select table_name from information_schema.tables where table_schema = 'public'`)).map((r) => r.table_name);
    for (const t of ["import_batches", "products", "customers", "invoices", "sales_lines", "receipts", "open_invoice_snapshots", "stock_snapshots", "stock_transactions", "installed_units"]) {
      expect(names).toContain(t);
    }
  });

  it("keeps ERP codes unique per company, not globally", async () => {
    await customer(a, "C-1");
    await rejects(customer(a, "C-1"), /duplicate key/);
    await expect(customer(b, "C-1")).resolves.toBeTruthy();
  });

  it("rejects a child row that points at another company's parent", async () => {
    const custA = await customer(a, "C-2");
    await rejects(
      q(`insert into invoices (company_id, invoice_no, customer_id, invoice_date) values ($1, 'INV-X', $2, '2026-09-01')`, [b, custA]),
      /foreign key/,
    );
    const invA = await id(`insert into invoices (company_id, invoice_no, customer_id, invoice_date) values ($1, 'INV-1', $2, '2026-09-01') returning id`, [a, custA]);
    const prodB = await product(b, "P-1");
    await rejects(
      q(`insert into sales_lines (company_id, invoice_id, line_no, product_id, quantity, net_sales) values ($1, $2, '1', $3, 1, 10)`, [a, invA, prodB]),
      /foreign key/,
    );
  });

  it("stores unknown values as NULL, not zero or a default segment", async () => {
    const custA = await customer(a, "C-3");
    const inv = await id(`insert into invoices (company_id, invoice_no, customer_id, invoice_date) values ($1, 'INV-NULL', $2, '2026-09-02') returning id`, [a, custA]);
    const [row] = await q<{ due_date: string | null; segment: string | null; credit_limit: string | null }>(
      `select i.due_date, c.segment, c.credit_limit from invoices i join customers c on c.id = i.customer_id where i.id = $1`,
      [inv],
    );
    expect(row).toEqual({ due_date: null, segment: null, credit_limit: null });
  });

  it("allows unapplied cash and blocks a duplicate allocation row", async () => {
    const custA = await customer(a, "C-4");
    const ins = (alloc: string) =>
      q(`insert into receipts (company_id, receipt_no, allocation_row_id, receipt_date, customer_id, allocated_amount) values ($1, 'R-1', $2, '2026-09-05', $3, 50)`, [a, alloc, custA]);
    await ins("1"); // invoice_id NULL = unapplied cash
    await rejects(ins("1"), /duplicate key/);
    await expect(ins("2")).resolves.toBeTruthy();
  });

  it("keeps one open-invoice row per snapshot date and invoice", async () => {
    const custA = await customer(a, "C-5");
    const inv = await id(`insert into invoices (company_id, invoice_no, customer_id, invoice_date) values ($1, 'INV-S', $2, '2026-08-01') returning id`, [a, custA]);
    const ins = (date: string) => q(`insert into open_invoice_snapshots (company_id, snapshot_date, invoice_id, remaining_amount) values ($1, $2, $3, 100)`, [a, date, inv]);
    await ins("2026-10-01");
    await rejects(ins("2026-10-01"), /duplicate key/);
    await expect(ins("2026-10-08")).resolves.toBeTruthy();
  });

  it("treats a missing batch as the empty string so stock rows stay unique", async () => {
    const p = await product(a, "P-STOCK");
    const ins = () =>
      q(`insert into stock_snapshots (company_id, snapshot_date, product_id, warehouse, quantity) values ($1, '2026-10-01', $2, 'MAIN', 5)`, [a, p]);
    await ins();
    await rejects(ins(), /duplicate key/);
  });

  it("blocks the same file being imported twice, per company and kind", async () => {
    const ins = (company: string, kind: string) =>
      q(
        `insert into import_batches (company_id, kind, file_name, file_sha256, rows_total, rows_accepted, rows_rejected, status) values ($1, $2, 'f.csv', 'abc', 10, 10, 0, 'accepted')`,
        [company, kind],
      );
    await ins(a, "sales");
    await rejects(ins(a, "sales"), /duplicate key/);
    await expect(ins(a, "receipts")).resolves.toBeTruthy();
    await expect(ins(b, "sales")).resolves.toBeTruthy();
  });

  it("keeps stock transaction ids unique per company", async () => {
    const p = await product(a, "P-TX");
    const ins = () =>
      q(
        `insert into stock_transactions (company_id, transaction_id, tx_date, product_id, warehouse, tx_type, quantity) values ($1, 'T-1', '2026-09-01', $2, 'MAIN', 'customer_issue', -3)`,
        [a, p],
      );
    await ins();
    await rejects(ins(), /duplicate key/);
  });
});
