/**
 * Minimal CSV reader for ERP exports. Handles a UTF-8 BOM, quoted fields with embedded delimiters, quotes and
 * line breaks, CRLF, and comma / semicolon / tab delimiters (Excel in Arabic locales writes semicolons).
 *
 * Every record is kept, blank ones included, so record N is spreadsheet row N and a rejection message can
 * point the accountant at the right line. Only the empty record caused by a final newline is dropped.
 */

export type Delimiter = "," | ";" | "\t";

export class CsvError extends Error {}

const CANDIDATES: Delimiter[] = [",", ";", "\t"];

/** Picks the delimiter that appears most in the header line. A tie, or no delimiter at all, means comma. */
export function detectDelimiter(text: string): Delimiter {
  const header = text.replace(/^﻿/, "").split(/\r\n|\n|\r/, 1)[0] ?? "";
  let best: Delimiter = ",";
  let bestCount = 0;
  for (const d of CANDIDATES) {
    const count = header.split(d).length - 1;
    if (count > bestCount) {
      best = d;
      bestCount = count;
    }
  }
  return best;
}

export function parseCsv(text: string, delimiter: Delimiter = detectDelimiter(text)): { delimiter: Delimiter; records: string[][] } {
  const src = text.replace(/^﻿/, "");
  const records: string[][] = [];
  let field = "";
  let record: string[] = [];
  let inQuotes = false;
  let i = 0;

  const endField = () => {
    record.push(field);
    field = "";
  };
  const endRecord = () => {
    endField();
    records.push(record);
    record = [];
  };

  while (i < src.length) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
      } else {
        field += ch;
      }
      i++;
      continue;
    }
    if (ch === '"' && field === "") {
      inQuotes = true;
    } else if (ch === delimiter) {
      endField();
    } else if (ch === "\r") {
      if (src[i + 1] === "\n") i++;
      endRecord();
    } else if (ch === "\n") {
      endRecord();
    } else {
      field += ch;
    }
    i++;
  }
  if (inQuotes) throw new CsvError("A quoted field is never closed: the file is cut off or has a stray quote mark.");
  if (field !== "" || record.length > 0) endRecord();
  return { delimiter, records };
}
