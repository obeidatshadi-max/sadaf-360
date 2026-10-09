import "server-only";
import bcrypt from "bcryptjs";
import { sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { companies, users } from "@/db/schema";

let ready: Promise<void> | null = null;

/**
 * Hosted deployments: when BOOTSTRAP_OWNER_EMAIL / _NAME / _PASSWORD / _COMPANY_SLUG / _COMPANY_NAME are set
 * and the database has no users at all, create that company and its first owner. Never touches a database
 * that already has users. Remove the variables after the first sign-in.
 * Netlify Database exposes no connection string to copy, so this replaces `npm run user:create` on the hosted site.
 */
export function ensureBootstrapOwner(): Promise<void> {
  const email = process.env.BOOTSTRAP_OWNER_EMAIL?.trim();
  const name = process.env.BOOTSTRAP_OWNER_NAME?.trim();
  const password = process.env.BOOTSTRAP_OWNER_PASSWORD;
  const slug = process.env.BOOTSTRAP_COMPANY_SLUG?.trim();
  const companyName = process.env.BOOTSTRAP_COMPANY_NAME?.trim();
  if (!email || !name || !password || !slug || !companyName) return Promise.resolve();
  ready ??= (async () => {
    if (password.length < 12) throw new Error("BOOTSTRAP_OWNER_PASSWORD must be at least 12 characters");
    const db = getDb();
    const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(users);
    if (count > 0) return;
    const passwordHash = await bcrypt.hash(password, 12);
    await db.transaction(async (tx) => {
      const [company] = await tx
        .insert(companies)
        .values({ slug, name: companyName })
        .onConflictDoUpdate({ target: companies.slug, set: { name: companyName } })
        .returning({ id: companies.id });
      await tx.insert(users).values({ companyId: company!.id, email, passwordHash, fullName: name, role: "owner" }).onConflictDoNothing();
    });
    console.log(`Created the first owner (${email}) from BOOTSTRAP_OWNER_* variables.`);
  })().catch((err) => {
    ready = null;
    console.error("Bootstrap owner could not be created:", err);
  });
  return ready;
}
