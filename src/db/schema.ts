/**
 * Sadaf 360 schema.
 *
 * Multi-tenant from day one: every business table carries company_id and every query must filter by it.
 * Money is JOD numeric(14,3) (the dinar has 1,000 fils). Dates that come from the ERP are `date`, not timestamps.
 */
import { sql } from "drizzle-orm";
import { boolean, index, jsonb, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";

export const userRole = pgEnum("user_role", ["owner", "admin", "viewer"]);

export const companies = pgTable("companies", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: varchar("slug", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 200 }).notNull(),
  currency: varchar("currency", { length: 3 }).notNull().default("JOD"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id),
    email: varchar("email", { length: 255 }).notNull(),
    passwordHash: text("password_hash").notNull(),
    fullName: varchar("full_name", { length: 200 }).notNull(),
    role: userRole("role").notNull().default("viewer"),
    active: boolean("active").notNull().default(true),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  // One account per email address, case-insensitively: login, create-user and bootstrap all look users up by lower(email).
  (t) => [index("users_company_idx").on(t.companyId), uniqueIndex("users_email_lower_uniq").using("btree", sql`lower(${t.email})`)],
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").references(() => companies.id),
    userId: uuid("user_id").references(() => users.id),
    action: varchar("action", { length: 80 }).notNull(),
    entityType: varchar("entity_type", { length: 60 }),
    entityId: varchar("entity_id", { length: 80 }),
    details: jsonb("details").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("audit_action_created_idx").on(t.action, t.createdAt)],
);
