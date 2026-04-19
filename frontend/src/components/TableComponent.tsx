import { useRef, type ChangeEvent, type ClipboardEvent } from "react";
import { tableToCsv } from "../lib/csv";
import { parsePastedTable } from "../lib/clipboardTable";
import { parseExcel } from "../lib/excel";
import type { ScenarioTable } from "../types";
import Button from "./common/Button";

type Props = {
  table: ScenarioTable;
  onChange: (table: ScenarioTable) => void;
  readOnly?: boolean;
};

export default function TableComponent({ table, onChange, readOnly = false }: Props) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const getColumnCharacterWidth = (colIndex: number) => {
    const values = [
      table.columns[colIndex] ?? "",
      ...table.rows.map((row) => row[colIndex] ?? "")
    ];
    const widestValue = values.reduce((max, value) => Math.max(max, value.trim().length), 0);
    return Math.min(50, Math.max(5, widestValue));
  };

  const getColumnWidth = (colIndex: number) => {
    const characterWidth = getColumnCharacterWidth(colIndex);
    return `calc(${characterWidth}ch + 32px)`;
  };

  const updateCell = (rowIndex: number, colIndex: number, value: string) => {
    const rows = table.rows.map((row) => [...row]);
    rows[rowIndex][colIndex] = value;
    onChange({ ...table, rows });
  };

  const onUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const parsed = await parseExcel(file);
      onChange(parsed);
    } catch (error) {
      console.error(error);
    }
    event.target.value = "";
  };

  const onPasteTable = (event: ClipboardEvent) => {
    if (readOnly) return;
    const text = event.clipboardData?.getData("text/plain");
    if (!text || !text.trim()) return;
    event.preventDefault();
    onChange(parsePastedTable(text));
  };

  const downloadCsv = () => {
    const content = tableToCsv(table);
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "scenario-table.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="stack">
      {!readOnly ? (
        <p className="muted-text" style={{ margin: 0, fontSize: 14, lineHeight: 1.7 }}>
          Copy cells in Excel, then click the table below and press <strong>Ctrl+V</strong> to paste.
        </p>
      ) : null}

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <Button type="button" variant="secondary" onClick={downloadCsv}>
          Export CSV
        </Button>

        {!readOnly ? (
          <label className="stack" style={{ gap: 8, fontSize: 14, color: "#314155" }}>
            <span style={{ fontWeight: 600 }}>Import Excel/CSV</span>
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <span style={{ position: "relative", display: "inline-flex" }}>
                <input
                  ref={fileInputRef}
                  className="file-input-hidden"
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={(event) => void onUpload(event)}
                />
                <Button type="button" variant="secondary" onClick={() => fileInputRef.current?.click()}>
                  Choose File
                </Button>
              </span>
              <span className="muted-text">Upload `.xlsx`, `.xls`, or `.csv`</span>
            </div>
          </label>
        ) : null}
      </div>

      {table.columns.length === 0 ? (
        <p className="muted-text" style={{ margin: 0, fontSize: 14 }}>
          Import a file or add data after saving with columns from your sheet.
        </p>
      ) : null}

      <div className="surface-subtle" style={{ overflowX: "auto", padding: 10 }} onPaste={onPasteTable} tabIndex={readOnly ? -1 : 0}>
        <table style={{ width: "max-content", minWidth: "100%", borderCollapse: "collapse" }}>
          <colgroup>
            {table.columns.map((_, index) => (
              <col key={index} style={{ width: getColumnWidth(index), minWidth: "calc(5ch + 32px)", maxWidth: "calc(50ch + 32px)" }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              {table.columns.map((column, index) => (
                <th
                  key={index}
                  style={{
                    textAlign: "left",
                    padding: "10px 8px",
                    borderBottom: "1px solid #e3eaf2",
                    color: "#223043",
                    fontSize: 15,
                    minWidth: "calc(5ch + 32px)",
                    maxWidth: "20ch",
                    whiteSpace: "normal",
                    overflowWrap: "anywhere",
                    verticalAlign: "bottom"
                  }}
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {table.rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((value, colIndex) => (
                  <td key={colIndex} style={{ padding: 4, minWidth: "calc(5ch + 32px)", maxWidth: "calc(50ch + 32px)" }}>
                    <input
                      value={value}
                      readOnly={readOnly}
                      onChange={(event) => updateCell(rowIndex, colIndex, event.target.value)}
                      className="field-input"
                      style={{ minWidth: "calc(5ch + 32px)", maxWidth: "calc(50ch + 32px)" }}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
