import { afterEach, describe, expect, it, vi } from "vitest";
import { GUEST_COMPANY_ID, isOpenAccess } from "./open-access";

afterEach(() => vi.unstubAllEnvs());

describe("open access", () => {
  it("is off unless OPEN_ACCESS is exactly 'true'", () => {
    expect(isOpenAccess()).toBe(false);
    for (const v of ["", "1", "TRUE", "yes", "false"]) {
      vi.stubEnv("OPEN_ACCESS", v);
      expect(isOpenAccess(), v).toBe(false);
    }
    vi.stubEnv("OPEN_ACCESS", "true");
    expect(isOpenAccess()).toBe(true);
  });
  it("guest company is the nil UUID, which no real company row can have (gen_random_uuid is never nil)", () => {
    expect(GUEST_COMPANY_ID).toBe("00000000-0000-0000-0000-000000000000");
  });
});
