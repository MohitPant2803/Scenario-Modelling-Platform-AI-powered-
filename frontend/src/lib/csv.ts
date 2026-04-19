import type { ScenarioTable } from "../types";

export function tableToCsv(table: ScenarioTable): string {
  const encode = (v: string) => `"${v.replaceAll("\"", "\"\"")}"`;
  const header = table.columns.map(encode).join(",");
  const rows = table.rows.map((row) => row.map((cell) => encode(cell ?? "")).join(","));
  return [header, ...rows].join("\n");
}
