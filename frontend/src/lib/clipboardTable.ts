import type { ScenarioTable } from "../types";

const MAX_ROWS = 5000;

/** Parse TSV/CSV text pasted from Excel or Sheets into columns + rows. */
export function parsePastedTable(text: string): ScenarioTable {
  const raw = text.replace(/\r\n/g, "\n").trim();
  if (!raw) return { columns: [], rows: [] };

  const lines = raw.split("\n").filter((line) => line.length > 0);
  if (lines.length === 0) return { columns: [], rows: [] };

  const useTab = lines.some((line) => line.includes("\t"));

  const splitLine = (line: string): string[] => {
    if (useTab) return line.split("\t").map((c) => c.trim());
    const out: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === "," && !inQuotes) {
        out.push(cur.trim());
        cur = "";
      } else {
        cur += ch;
      }
    }
    out.push(cur.trim());
    return out;
  };

  const rows = lines.slice(0, MAX_ROWS).map(splitLine);
  const width = Math.max(1, ...rows.map((r) => r.length));
  const pad = (r: string[]) => {
    const copy = [...r];
    while (copy.length < width) copy.push("");
    return copy.slice(0, width);
  };
  const padded = rows.map(pad);

  if (padded.length === 1) {
    const cells = padded[0];
    const columns = cells.map((_, i) => `Column ${i + 1}`);
    return { columns, rows: [cells] };
  }

  const columns = padded[0].map((c, i) => (c || `Column ${i + 1}`));
  const dataRows = padded.slice(1);
  return { columns, rows: dataRows };
}
