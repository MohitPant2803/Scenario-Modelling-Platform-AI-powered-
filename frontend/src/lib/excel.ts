import * as XLSX from "xlsx";
import type { ScenarioTable } from "../types";

export async function parseExcel(file: File): Promise<ScenarioTable> {
  const bytes = await file.arrayBuffer();
  const workbook = XLSX.read(bytes);
  const firstSheet = workbook.SheetNames[0];
  const raw = XLSX.utils.sheet_to_json<(string | number)[]>(workbook.Sheets[firstSheet], { header: 1 });
  const [headerRow = [], ...dataRows] = raw;

  return {
    columns: headerRow.map((x) => String(x ?? "")),
    rows: dataRows.map((r) => r.map((x) => String(x ?? "")))
  };
}
