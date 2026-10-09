import { HyperFormula } from "hyperformula";
import { readFileSync } from "node:fs";

const sheets = JSON.parse(readFileSync(process.argv[2], "utf8"));
const hf = HyperFormula.buildFromSheets(sheets, { licenseKey: "gpl-v3", nullDate: { year: 1899, month: 12, day: 30 } });
const get = (sheet, addr) => {
  const id = hf.getSheetId(sheet);
  const m = /^([A-Z]+)(\d+)$/.exec(addr);
  const col = [...m[1]].reduce((a, ch) => a * 26 + ch.charCodeAt(0) - 64, 0) - 1;
  return hf.getCellValue({ sheet: id, row: Number(m[2]) - 1, col });
};
const W = "Worked examples";
let bad = 0;
const near = (a, b) => typeof a === "number" && Math.abs(a - b) < 1e-6;
const check = (label, sheet, addr, expected) => {
  const v = get(sheet, addr);
  const ok = typeof expected === "number" ? near(v, expected) : v === expected;
  if (!ok) bad++;
  console.log(ok ? "OK  " : "FAIL", label.padEnd(44), addr.padEnd(5), JSON.stringify(v), ok ? "" : `expected ${JSON.stringify(expected)}`);
};

// errors anywhere?
for (const name of hf.getSheetNames()) {
  const id = hf.getSheetId(name);
  const vals = hf.getSheetValues(id);
  vals.forEach((row, r) => row.forEach((v, c) => { if (v && typeof v === "object" && v.type) { bad++; console.log("ERROR CELL", name, r + 1, c + 1, v.value); } }));
}

// existing worked examples must be unchanged
check("existing: gross margin A", W, "B43", 0.25);
check("existing: days overdue A", W, "B46", 10);
check("existing: purchase gap B", W, "C71", 600);
check("existing: coverage", W, "B84", 0.5);

// account block, Hospital A (tender) and Clinic C (private)
check("segment A", W, "B97", "Tender"); check("segment C", W, "C97", "Private");
check("days in period", W, "B100", 273);
check("gross profit A", W, "B114", 25200); check("gross profit C", W, "C114", 23400);
check("gross margin A", W, "B115", 0.21); check("gross margin C", W, "C115", 0.39);
check("contribution A", W, "B116", 21600); check("contribution C", W, "C116", 21600);
check("sales vs LY A", W, "B117", 0.2); check("sales vs LY C", W, "C117", 60000 / 66000 - 1);
check("GP vs LY A", W, "B118", 25200 / 22000 - 1); check("GP vs LY C", W, "C118", 23400 / 25000 - 1);
check("attainment A", W, "B119", 120000 / 110000); check("attainment C", W, "C119", 60000 / 65000);
check("DSO A", W, "B120", (30000 / 120000) * 273); check("DSO C", W, "C120", (3000 / 60000) * 273);
check("credit use A", W, "B121", 0.75); check("credit use C", W, "C121", 0.3);
check("days since order A", W, "B122", 18); check("days since order C", W, "C122", 49);
check("capture A", W, "B123", 80 / 120);
check("status A", W, "B124", "Watch"); check("status C", W, "C124", "Watch");

// segment block
check("tender accounts", W, "B128", 1); check("private accounts", W, "C128", 1);
check("tender sales", W, "B129", 120000); check("private sales", W, "C129", 60000);
check("tender GP", W, "B130", 25200); check("private GP", W, "C130", 23400);
check("tender margin", W, "B131", 0.21); check("private margin", W, "C131", 0.39);
check("GP shares add to 1", W, "B132", 25200 / 48600); check("private share", W, "C132", 23400 / 48600);
check("tender outstanding", W, "B133", 30000); check("tender overdue", W, "B134", 7200); check("private overdue", W, "C134", 0);
check("tender DSO", W, "B135", 0.25 * 273); check("tender sales vs LY", W, "B136", 0.2);
check("segments add up", W, "B137", "OK");

// tender block
check("backlog A (delivered 100%)", W, "B144", 0);
check("delivered not invoiced A", W, "B146", 0);
check("invoiced not collected A", W, "B148", 7200); check("invoiced not collected B", W, "C148", 9000);
check("agrees with open balance A", W, "B149", "OK"); check("agrees with open balance B", W, "C149", "OK");
check("guarantee days A", W, "B151", 63);
check("win rate", W, "B154", 6 / 11); check("avg won tender", W, "B155", 275000);
check("counts check", W, "B156", "OK");

// accounts sheet check column + start-here counts
check("AM8 check", "Accounts", "H122", "OK");
check("start here count", "Start here", "B29", 7);
console.log(bad === 0 ? "\nALL FORMULAS VERIFIED" : `\n${bad} PROBLEM(S)`);
process.exit(bad === 0 ? 0 : 1);
