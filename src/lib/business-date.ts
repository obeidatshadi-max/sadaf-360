/**
 * The accountant's day. Invoices dated "tomorrow" in Amman / Baghdad (UTC+3) must not be called future dates just
 * because the server clock is still on the previous UTC day.
 */
export function businessToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Amman", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}
