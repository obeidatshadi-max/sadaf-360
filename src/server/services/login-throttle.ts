import "server-only";
import { headers } from "next/headers";
import { and, gt, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { auditLogs } from "@/db/schema";
import { THROTTLE_WINDOW_MINUTES, loginThrottle, type ThrottleReason } from "@/lib/domain/login-throttle";

/** Client address as seen by the host. Netlify sets x-nf-client-connection-ip; it is not client-controllable there. */
export async function clientIp(): Promise<string | null> {
  const h = await headers();
  const ip = h.get("x-nf-client-connection-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim();
  return ip ? ip.slice(0, 64) : null;
}

/** Counts failed sign-ins from the audit log, so the limit holds across serverless instances without a separate store. */
export async function checkLoginThrottle(email: string, ip: string | null): Promise<ThrottleReason | null> {
  const since = sql`now() - make_interval(mins => ${THROTTLE_WINDOW_MINUTES})`;
  const [row] = await getDb()
    .select({
      emailFailures: sql<number>`count(*) filter (where ${auditLogs.details}->>'email' = ${email})::int`,
      ipFailures: ip ? sql<number>`count(*) filter (where ${auditLogs.details}->>'ip' = ${ip})::int` : sql<number>`0`,
    })
    .from(auditLogs)
    .where(and(sql`${auditLogs.action} = 'auth.login_failed'`, gt(auditLogs.createdAt, since)));
  return loginThrottle({ emailFailures: row?.emailFailures ?? 0, ipFailures: ip ? (row?.ipFailures ?? 0) : null });
}
