import "server-only";
import { getConnectionString } from "@netlify/database";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

export type Database = NodePgDatabase<typeof schema>;

// Reuse one pool across hot reloads in development.
const globalForDb = globalThis as unknown as { __sadafDb?: Database; __sadafPool?: Pool };

/**
 * Lazily creates the database client so that importing this module never
 * requires DATABASE_URL (e.g. during `next build` of static shells).
 */
export function getDb(): Database {
  if (globalForDb.__sadafDb) return globalForDb.__sadafDb;
  const url = connectionString();
  if (!url) {
    throw new Error("DATABASE_URL is not set. Copy .env.example to .env.local and configure PostgreSQL.");
  }
  // Serverless instances each hold their own pool; keep them small on Netlify.
  const pool = new Pool({ connectionString: url, max: process.env.NETLIFY ? 3 : 10 });
  const db = drizzle(pool, { schema });
  globalForDb.__sadafPool = pool;
  globalForDb.__sadafDb = db;
  return db;
}

/** DATABASE_URL when set (local, CI, any Postgres host); otherwise the Netlify Database of this deploy. */
function connectionString(): string | undefined {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  try {
    return getConnectionString();
  } catch {
    return undefined;
  }
}
