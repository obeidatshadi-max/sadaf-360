import { describe, expect, it } from "vitest";
import { MAX_FAILURES_PER_EMAIL, MAX_FAILURES_PER_IP, loginThrottle } from "./login-throttle";

describe("loginThrottle", () => {
  it("allows attempts below both limits", () => {
    expect(loginThrottle({ emailFailures: MAX_FAILURES_PER_EMAIL - 1, ipFailures: MAX_FAILURES_PER_IP - 1 })).toBeNull();
  });
  it("blocks an email at the limit", () => {
    expect(loginThrottle({ emailFailures: MAX_FAILURES_PER_EMAIL, ipFailures: 0 })).toBe("email");
  });
  it("blocks a network address at the limit even when each email is under its own", () => {
    expect(loginThrottle({ emailFailures: 1, ipFailures: MAX_FAILURES_PER_IP })).toBe("ip");
  });
  it("ignores the address check when no address is known", () => {
    expect(loginThrottle({ emailFailures: 0, ipFailures: null })).toBeNull();
  });
});
