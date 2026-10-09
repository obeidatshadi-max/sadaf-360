import { describe, expect, it } from "vitest";
import { change, weekWindows } from "./weekly";

describe("weekly", () => {
  it("windows are two adjacent 7-day blocks", () => {
    expect(weekWindows("2026-10-09")).toEqual({ thisFrom: "2026-10-03", thisTo: "2026-10-09", prevFrom: "2026-09-26", prevTo: "2026-10-02" });
  });
  it("change is a delta and a relative figure", () => {
    expect(change(150, 100)).toEqual({ now: 150, before: 100, delta: 50, pct: 0.5 });
  });
  it("has no percentage against a zero base", () => {
    expect(change(80, 0).pct).toBe("Data missing");
  });
});
