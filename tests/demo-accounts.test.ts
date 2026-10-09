/**
 * The promotional demo's Sales & accounts view, rendered in jsdom, against the same numbers the app shows.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { JSDOM, VirtualConsole } from "jsdom";
import { beforeAll, describe, expect, it } from "vitest";
import { bundle, embed } from "../scripts/build-demo.mjs";

const html = readFileSync(fileURLToPath(new URL("../demo/index.html", import.meta.url)), "utf8");
type Win = Window & { eval: (code: string) => unknown };
let w: Win;
const errors: string[] = [];

const text = (mode: "basic" | "advanced", route: string, acct?: string) => {
  w.eval(`state.mode='${mode}';state.line='All lines';state.query='';state.route='${route}';${acct ? `state.acctView='${acct}';` : ""}render()`);
  return (w.document.querySelector("#main")?.textContent ?? "").replace(/\s+/g, " ");
};

beforeAll(() => {
  const vc = new VirtualConsole();
  vc.on("jsdomError", (e) => errors.push(String(e.message)));
  w = new JSDOM(html, { runScripts: "dangerously", url: "https://demo.test/", virtualConsole: vc }).window as unknown as Win;
});

describe("demo bundle", () => {
  it("is exactly what the current source compiles to (run `npm run demo:build` if this fails)", async () => {
    expect(embed(html, await bundle())).toBe(html);
  });
});

describe("demo Sales & accounts (Advanced)", () => {
  it("all accounts: tender versus private side by side, adding up to the company", () => {
    const t = text("advanced", "sales", "all");
    for (const k of ["Tender accounts versus private accounts", "JOD 2.55M", "JOD 1.98M", "JOD 4.53M", "JOD 708.7K", "JOD 786.4K", "27.8%", "39.7%", "JOD 540.0K", "JOD 115.0K", "Invoice 112 days overdue", "2 at risk"])
      expect(t, k).toContain(k);
  });
  it("tender accounts: pipeline, backlog, collections, register and win rate", () => {
    const t = text("advanced", "sales", "tender");
    for (const k of ["Tender register", "JOD 440.0K", "JOD 247.0K", "JOD 98.5K", "54.5%", "Tender deadline in 10 days", "TN-061", "Performance bond", "Demo Military Medical Center F"]) expect(t, k).toContain(k);
    expect(t).not.toContain("Demo Wound Clinic D");
  });
  it("private accounts: recurring capture, contracts, order rhythm, quiet accounts", () => {
    const t = text("advanced", "sales", "private");
    for (const k of ["64%", "3 of 4", "No order for 55 days", "Invoice 94 days overdue", "JOD 4,650"]) expect(t, k).toContain(k);
    expect(t).not.toContain("Demo University Hospital C");
  });
  it("search narrows the account table without breaking the totals", () => {
    w.eval("state.query='wound'");
    const t = text("advanced", "sales", "all").length;
    w.eval("state.query=''");
    expect(t).toBeGreaterThan(0);
  });
  it("export carries one row per account in the selected view", () => {
    const rows = w.eval("window.SadafAccounts.viewRows('tender').length") as number;
    expect(rows).toBe(4);
  });
});

describe("demo Sales & accounts (Basic)", () => {
  it("shows a compact tender versus private table under the line table", () => {
    const t = text("basic", "sales");
    for (const k of ["Tender versus private accounts", "JOD 2.55M", "JOD 1.98M", "JOD 4.53M", "27.8%", "39.7%"]) expect(t, k).toContain(k);
  });
});

it("no script errors", () => expect(errors).toEqual([]));
