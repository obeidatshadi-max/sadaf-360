import { describe, expect, it } from "vitest";
import { buildCash } from "./cash";

describe("buildCash", () => {
  const r = buildCash({ ytd: 900, priorYtd: 600, last30: 120.5, unlinkedYtd: 40, byMonth: [{ month: "2026-02", amount: 500 }, { month: "2026-04", amount: 400 }] }, "2026-04-15");
  it("fills every month up to the current one", () => {
    expect(r.months.map((m) => m.month)).toEqual(["2026-01", "2026-02", "2026-03", "2026-04"]);
    expect(r.months.map((m) => m.amount)).toEqual([0, 500, 0, 400]);
  });
  it("works out growth and keeps unlinked cash visible", () => {
    expect(r).toMatchObject({ ytd: 900, growth: 0.5, last30: 120.5, unlinkedYtd: 40 });
  });
  it("has no growth figure without a prior-year base", () => {
    expect(buildCash({ ytd: 10, priorYtd: 0, last30: 0, unlinkedYtd: 0, byMonth: [] }, "2026-01-02").growth).toBe("Data missing");
  });
});
