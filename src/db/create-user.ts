/**
 * Creates (or resets the password of) one user, creating the company on first use.
 * A real deployment has no demo accounts, so this is how the first owner is made.
 *
 *   COMPANY_SLUG=sadaf COMPANY_NAME="Sadaf Medical" USER_EMAIL=you@x.com USER_NAME="Full Name" \
 *   USER_ROLE=owner USER_PASSWORD=... DATABASE_URL=postgres://... npm run user:create
 *
 * Credentials come from the environment so they stay out of shell history and logs.
 */
import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import { Pool } from "pg";
import bcrypt from "bcryptjs";
import { z } from "zod";
import * as schema from "./schema";
import { loadScriptEnv } from "./env";

const input = z.object({
  COMPANY_SLUG: z.string().regex(/^[a-z0-9-]{2,64}$/),
  COMPANY_NAME: z.string().min(2).optional(),
  USER_EMAIL: z.string().email(),
  USER_NAME: z.string().min(2),
  USER_ROLE: z.enum(schema.userRole.enumValues).default("owner"),
  USER_PASSWORD: z.string().min(12, "Use at least 12 characters"),
});

async function main() {
  const env = input.parse(process.env);
  const pool = new Pool({ connectionString: loadScriptEnv() });
  const db = drizzle(pool, { schema });
  try {
    let [company] = await db.select().from(schema.companies).where(sql`${schema.companies.slug} = ${env.COMPANY_SLUG}`);
    if (!company) {
      if (!env.COMPANY_NAME) throw new Error(`Company "${env.COMPANY_SLUG}" does not exist; set COMPANY_NAME to create it.`);
      [company] = await db.insert(schema.companies).values({ slug: env.COMPANY_SLUG, name: env.COMPANY_NAME }).returning();
      console.log(`Created company ${env.COMPANY_SLUG}`);
    }
    const companyId = company!.id;
    const passwordHash = await bcrypt.hash(env.USER_PASSWORD, 12);
    const email = env.USER_EMAIL.trim();
    const [existing] = await db.select({ id: schema.users.id }).from(schema.users).where(sql`lower(${schema.users.email}) = lower(${email})`);
    if (existing) {
      await db
        .update(schema.users)
        .set({ passwordHash, role: env.USER_ROLE, fullName: env.USER_NAME, active: true, companyId })
        .where(sql`${schema.users.id} = ${existing.id}`);
      console.log(`Updated ${email} (${env.USER_ROLE})`);
    } else {
      await db.insert(schema.users).values({ companyId, email, passwordHash, fullName: env.USER_NAME, role: env.USER_ROLE });
      console.log(`Created ${email} (${env.USER_ROLE})`);
    }
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err instanceof z.ZodError ? z.prettifyError(err) : err);
  process.exit(1);
});
