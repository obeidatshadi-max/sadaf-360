import "server-only";

/**
 * Transactional email through the Brevo HTTP API. Configure with BREVO_API_KEY and MAIL_SENDER (an address verified in Brevo).
 * When not configured, mailConfigured() is false and the password-reset screens say so instead of pretending to send.
 */
export const mailConfigured = (): boolean => Boolean(process.env.BREVO_API_KEY && process.env.MAIL_SENDER);

/** Public base URL used in emailed links. Never taken from request headers (Host-header poisoning). */
export function appUrl(): string | null {
  const raw = process.env.APP_URL ?? process.env.URL;
  if (!raw) return null;
  return raw.replace(/\/+$/, "");
}

export async function sendMail(to: string, subject: string, text: string, html: string): Promise<boolean> {
  if (!mailConfigured()) return false;
  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": process.env.BREVO_API_KEY!, "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        sender: { name: process.env.MAIL_SENDER_NAME ?? "MedSupply360", email: process.env.MAIL_SENDER },
        to: [{ email: to }],
        subject,
        textContent: text,
        htmlContent: html,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) console.error(`Brevo rejected the email (${res.status}).`);
    return res.ok;
  } catch (err) {
    console.error("Email could not be sent:", err instanceof Error ? err.message : err);
    return false;
  }
}
