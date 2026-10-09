import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { companies, users } from "@/db/schema";
import { GUEST_COMPANY_ID, isOpenAccess } from "./open-access";
import { readSession } from "./session";

export type Role = "owner" | "admin" | "viewer";

export type CurrentUser = {
  id: string;
  companyId: string;
  companyName: string;
  currency: string;
  fullName: string;
  email: string;
  role: Role;
  /** True for the read-only visitor created by OPEN_ACCESS; has no company data and no database row. */
  guest: boolean;
};

const guestUser = (): CurrentUser => ({
  id: "guest",
  companyId: GUEST_COMPANY_ID,
  companyName: "Sadaf 360 (open access)",
  currency: "JOD",
  fullName: "Guest",
  email: "",
  role: "viewer",
  guest: true,
});

/**
 * Data Access Layer entry point: verifies the session and re-reads the user on every request,
 * so deactivating a user or changing a role takes effect immediately. Deduplicated per request.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await readSession();
  if (!session) return isOpenAccess() ? guestUser() : null;
  const userId = session.userId;
  const [row] = await getDb()
    .select({
      id: users.id,
      companyId: users.companyId,
      companyName: companies.name,
      currency: companies.currency,
      fullName: users.fullName,
      email: users.email,
      role: users.role,
      active: users.active,
      passwordChangedAt: users.passwordChangedAt,
    })
    .from(users)
    .innerJoin(companies, eq(companies.id, users.companyId))
    .where(eq(users.id, userId))
    .limit(1);
  // A password reset invalidates every session issued before it.
  // JWT iat has one-second resolution, so compare whole seconds: a session issued in the same second as the reset is the new one.
  const revoked = row?.passwordChangedAt ? session.issuedAt < Math.floor(row.passwordChangedAt.getTime() / 1000) * 1000 : false;
  if (!row || !row.active || revoked) return isOpenAccess() ? guestUser() : null;
  const { active: _active, passwordChangedAt: _changed, ...user } = row;
  void _active;
  void _changed;
  return { ...user, guest: false };
});

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
