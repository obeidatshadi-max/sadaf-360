import { describe, expect, it } from "vitest";
import { LIMITS, hashToken, newResetToken, normalizeEmail, passwordProblem, resetState, slugify, withSuffix } from "./account";

describe("passwordProblem", () => {
  it("accepts a reasonable password", () => {
    expect(passwordProblem("blue-Table-92!", "a@b.com")).toBeNull();
  });
  it("rejects short, long, common, repeated and email-equal passwords", () => {
    expect(passwordProblem("short1")).toBe("short");
    expect(passwordProblem("x".repeat(129))).toBe("long");
    expect(passwordProblem("Password1")).toBe("short");
    expect(passwordProblem("qwertyuiop")).toBe("tooCommon");
    expect(passwordProblem("aaaaaaaaaaaa")).toBe("tooCommon");
    expect(passwordProblem("Owner@Sadaf.com", "owner@sadaf.com")).toBe("sameAsEmail");
  });
});

describe("slugify", () => {
  it("produces url-safe slugs", () => {
    expect(slugify("Sadaf Medical Supplies")).toBe("sadaf-medical-supplies");
    expect(slugify("  Café & Co.  ")).toBe("cafe-co");
    expect(slugify("---")).toBe("company");
    expect(slugify("شركة")).toBe("company");
    expect(slugify("x".repeat(80)).length).toBeLessThanOrEqual(48);
  });
  it("suffix keeps the limit and never doubles hyphens", () => {
    const s = withSuffix("a".repeat(48), "k3j9");
    expect(s.length).toBeLessThanOrEqual(48);
    expect(s.endsWith("-k3j9")).toBe(true);
    expect(withSuffix("sadaf-", "ab12")).not.toContain("--");
  });
});

describe("reset tokens", () => {
  it("token is random, url-safe, and only its hash is derivable", () => {
    const a = newResetToken();
    const b = newResetToken();
    expect(a.token).not.toBe(b.token);
    expect(a.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(a.tokenHash).toBe(hashToken(a.token));
    expect(a.tokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(a.tokenHash).not.toContain(a.token);
  });
  it("state: valid, expired, used, unknown", () => {
    const now = new Date("2026-10-09T10:00:00Z");
    const later = new Date("2026-10-09T10:30:00Z");
    expect(resetState({ expiresAt: later, usedAt: null }, now)).toBe("valid");
    expect(resetState({ expiresAt: now, usedAt: null }, now)).toBe("expired");
    expect(resetState({ expiresAt: later, usedAt: now }, now)).toBe("used");
    expect(resetState(undefined, now)).toBe("unknown");
  });
});

describe("misc", () => {
  it("normalizes emails and exposes sane limits", () => {
    expect(normalizeEmail("  Shadi@Example.COM ")).toBe("shadi@example.com");
    expect(LIMITS.resetPerEmail).toBeLessThan(LIMITS.resetPerIp);
  });
});
