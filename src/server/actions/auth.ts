"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db/client";
import { users } from "@/db/schema";
import { writeAudit } from "@/lib/audit";
import { createSession, destroySession } from "@/lib/auth/session";
import { getCurrentUser } from "@/lib/auth/current-user";
import { checkLoginThrottle, clientIp } from "../services/login-throttle";

export type LoginState = { error?: "invalid" | "invalidInput" | "locked"; email?: string };

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(255),
  password: z.string().min(1).max(200),
});

// Compared against when the email does not exist, so response timing does not reveal valid accounts.
let dummyHash: Promise<string> | undefined;
const getDummyHash = () => (dummyHash ??= bcrypt.hash("not-a-real-password", 10));

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { error: "invalidInput", email: String(formData.get("email") ?? "") };

  const ip = await clientIp();
  const blocked = await checkLoginThrottle(parsed.data.email, ip);
  if (blocked) {
    await writeAudit({ userId: null, action: "auth.login_blocked", details: { email: parsed.data.email, ip, reason: blocked } });
    return { error: "locked", email: parsed.data.email };
  }
  const db = getDb();
  const [user] = await db
    .select({ id: users.id, companyId: users.companyId, passwordHash: users.passwordHash, active: users.active })
    .from(users)
    .where(sql`lower(${users.email}) = ${parsed.data.email}`)
    .limit(1);
  const ok = await bcrypt.compare(parsed.data.password, user?.passwordHash ?? (await getDummyHash()));
  if (!user || !user.active || !ok) {
    await writeAudit({ companyId: user?.companyId, userId: user?.id ?? null, action: "auth.login_failed", details: { email: parsed.data.email, ip } });
    return { error: "invalid", email: parsed.data.email };
  }
  await createSession(user.id);
  await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));
  await writeAudit({ companyId: user.companyId, userId: user.id, action: "auth.login" });
  redirect("/dashboard");
}

export async function logoutAction(): Promise<void> {
  const user = await getCurrentUser();
  if (user) await writeAudit({ companyId: user.companyId, userId: user.id, action: "auth.logout" });
  await destroySession();
  redirect("/login");
}
