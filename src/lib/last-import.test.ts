import { describe, expect, it } from "vitest";
import { formatLastImport } from "./last-import";

const at = new Date("2026-10-09T10:08:00Z"); // 13:08 in Amman

describe("formatLastImport", () => {
  it("says nothing was imported when there is no usable import", () => {
    expect(formatLastImport(undefined)).toBe("Not connected — no imports completed");
    expect(formatLastImport({ kind: "sales", createdAt: at, snapshotDate: null, status: "rejected" })).toBe("Not connected — no imports completed");
  });

  it("names the file type and the Jordan-time date of the import", () => {
    expect(formatLastImport({ kind: "sales", createdAt: at, snapshotDate: null, status: "accepted" })).toBe(
      "09 Oct 2026, 13:08 Jordan time · Sales and returns (E03)",
    );
  });

  it("adds the as-of date for snapshot files and flags a partial load", () => {
    expect(formatLastImport({ kind: "open_invoices", createdAt: at, snapshotDate: "2026-10-08", status: "partial" })).toBe(
      "09 Oct 2026, 13:08 Jordan time · Unpaid invoices (E05) · as of 2026-10-08 · some rows rejected",
    );
  });
});
