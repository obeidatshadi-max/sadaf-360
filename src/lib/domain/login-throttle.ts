/** Login rate-limit rules. Pure: the caller supplies the recent failure counts. */

export const THROTTLE_WINDOW_MINUTES = 15;
/** Failed sign-ins for one email address within the window before further attempts are refused. */
export const MAX_FAILURES_PER_EMAIL = 5;
/** Failed sign-ins from one network address within the window (covers one attacker trying many emails). */
export const MAX_FAILURES_PER_IP = 20;

export type ThrottleReason = "email" | "ip";

export function loginThrottle(counts: { emailFailures: number; ipFailures: number | null }): ThrottleReason | null {
  if (counts.emailFailures >= MAX_FAILURES_PER_EMAIL) return "email";
  if (counts.ipFailures !== null && counts.ipFailures >= MAX_FAILURES_PER_IP) return "ip";
  return null;
}
