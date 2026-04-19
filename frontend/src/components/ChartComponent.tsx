import { useMemo } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import type { ScenarioChartConfig, ScenarioTable } from "../types";

type Props = {
  table: ScenarioTable;
  config?: ScenarioChartConfig;
  onConfigChange?: (config: ScenarioChartConfig) => void;
  editable?: boolean;
};

const SERIES_COLORS = ["#1d4ed8", "#0f766e", "#b45309", "#be185d", "#7c3aed", "#0f172a"];

function toNumber(value: string) {
  const normalized = value.replace(/,/g, "").trim();
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export default function ChartComponent({ table, config, onConfigChange, editable = false }: Props) {
  const columns = table.columns.filter((column) => column.trim() !== "");
  const fallbackXAxis = columns[0] ?? "";
  const fallbackYAxes = columns.slice(1, 2);
  const selectedXAxis = config?.xAxis && columns.includes(config.xAxis) ? config.xAxis : fallbackXAxis;
  const selectedYAxes = (config?.yAxes ?? []).filter((column) => columns.includes(column) && column !== selectedXAxis);
  const activeYAxes = selectedYAxes.length ? selectedYAxes : fallbackYAxes.filter((column) => column !== selectedXAxis);

  const chartData = useMemo(() => {
    const xIndex = table.columns.findIndex((column) => column === selectedXAxis);
    if (xIndex === -1 || !activeYAxes.length) return [];

    const yIndexes = activeYAxes.map((column) => ({
      column,
      index: table.columns.findIndex((candidate) => candidate === column)
    }));

    return table.rows
      .map((row) => {
        const point: Record<string, string | number | null> = {
          x: row[xIndex] ?? ""
        };

        let hasNumericValue = false;
        for (const yAxis of yIndexes) {
          const numericValue = toNumber(row[yAxis.index] ?? "");
          point[yAxis.column] = numericValue;
          hasNumericValue = hasNumericValue || numericValue !== null;
        }

        return hasNumericValue ? point : null;
      })
      .filter((point): point is Record<string, string | number | null> => point !== null);
  }, [activeYAxes, selectedXAxis, table.columns, table.rows]);

  const updateXAxis = (xAxis: string) => {
    if (!onConfigChange) return;
    const nextYAxes = activeYAxes.filter((column) => column !== xAxis);
    onConfigChange({ xAxis, yAxes: nextYAxes });
  };

  const toggleYAxis = (column: string) => {
    if (!onConfigChange) return;
    const exists = activeYAxes.includes(column);
    onConfigChange({
      xAxis: selectedXAxis,
      yAxes: exists ? activeYAxes.filter((item) => item !== column) : [...activeYAxes, column]
    });
  };

  if (columns.length < 2) {
    return <p className="muted-text" style={{ margin: 0 }}>Add at least two table columns to build a chart.</p>;
  }

  return (
    <div className="stack" style={{ gap: 14 }}>
      {editable ? (
        <div className="surface-subtle" style={{ padding: 14, display: "grid", gap: 14 }}>
          <div className="stack" style={{ gap: 8 }}>
            <label style={{ fontWeight: 700, color: "#223043" }}>X axis</label>
            <select className="field-input" value={selectedXAxis} onChange={(event) => updateXAxis(event.target.value)}>
              {columns.map((column) => (
                <option key={column} value={column}>
                  {column}
                </option>
              ))}
            </select>
          </div>

          <div className="stack" style={{ gap: 8 }}>
            <div style={{ fontWeight: 700, color: "#223043" }}>Y axis series</div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {columns
                .filter((column) => column !== selectedXAxis)
                .map((column) => (
                  <label
                    key={column}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "8px 12px",
                      borderRadius: 999,
                      border: "1px solid #d7e1ec",
                      background: activeYAxes.includes(column) ? "#eaf3ff" : "#ffffff",
                      color: "#314155"
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={activeYAxes.includes(column)}
                      onChange={() => toggleYAxis(column)}
                      style={{ width: 16, height: 16 }}
                    />
                    <span>{column}</span>
                  </label>
                ))}
            </div>
          </div>
        </div>
      ) : null}

      {!activeYAxes.length ? (
        <p className="muted-text" style={{ margin: 0 }}>Choose at least one Y-axis series to display the chart.</p>
      ) : chartData.length === 0 ? (
        <p className="muted-text" style={{ margin: 0 }}>
          The selected Y-axis columns need numeric values in the table before the chart can be drawn.
        </p>
      ) : (
        <div className="surface-subtle" style={{ width: "100%", height: 360, padding: 14 }}>
          <ResponsiveContainer>
            <LineChart data={chartData} margin={{ top: 12, right: 18, left: 4, bottom: 8 }}>
              <CartesianGrid stroke="#dbe6f2" strokeDasharray="3 3" />
              <XAxis dataKey="x" tick={{ fill: "#516173", fontSize: 12 }} />
              <YAxis tick={{ fill: "#516173", fontSize: 12 }} />
              <Tooltip />
              <Legend />
              {activeYAxes.map((column, index) => (
                <Line
                  key={column}
                  type="monotone"
                  dataKey={column}
                  stroke={SERIES_COLORS[index % SERIES_COLORS.length]}
                  strokeWidth={2.5}
                  dot={false}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
