import { useState } from "react";
import { api } from "../lib/api";
import type { ScenarioChartConfig, ScenarioChartSource, ScenarioDto, ScenarioTable } from "../types";
import { composeScenarioContent, parseScenarioContent } from "../features/scenario/utils";
import SectionBlock from "./SectionBlock";
import TableComponent from "./TableComponent";
import ChartComponent from "./ChartComponent";
import GraphPngInput from "./GraphPngInput";
import Button from "./common/Button";

type Props = {
  projectId: string;
  parentFolderId: string | null;
  onCreated: (scenario: ScenarioDto) => void;
  onCancel: () => void;
  scenario?: ScenarioDto | null;
  ownerId: string;
};

const emptyTable = (): ScenarioTable => ({
  columns: ["Column 1", "Column 2", "Column 3", "Column 4", "Column 5"],
  rows: Array.from({ length: 7 }, () => Array.from({ length: 5 }, () => ""))
});

export default function EnhancedScenarioForm({ projectId, parentFolderId, onCreated, onCancel, scenario, ownerId }: Props) {
  const initial = parseScenarioContent(scenario?.content ?? "");
  const [title, setTitle] = useState(scenario?.name ?? "");
  const [description, setDescription] = useState(initial.description);
  const [formulas, setFormulas] = useState(initial.formulas);
  const [assumptions, setAssumptions] = useState(initial.assumptions);
  const [equation, setEquation] = useState(scenario?.equation ?? "");
  const [table, setTable] = useState<ScenarioTable>(scenario?.table ?? emptyTable());
  const [chartConfig, setChartConfig] = useState<ScenarioChartConfig>(scenario?.chartConfig ?? { xAxis: "", yAxes: [] });
  const [chartSource, setChartSource] = useState<ScenarioChartSource>(scenario?.chartSource ?? "excel");
  const [graphPngDataUrl, setGraphPngDataUrl] = useState(scenario?.graphPngDataUrl ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isEditing = Boolean(scenario);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim()) {
      setError("Scenario name is required");
      return;
    }
    if (!description.trim()) {
      setError("Description is required");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await api<{
        id?: string;
        _id?: string;
        projectId: string;
        parentFolderId?: string | null;
        title: string;
        context?: string;
        equation?: string;
        variables?: ScenarioDto["variables"];
        tableData?: ScenarioTable;
        chartConfig?: ScenarioChartConfig;
        chartSource?: ScenarioChartSource;
        graphPngDataUrl?: string;
        summary?: string;
      }>(isEditing ? `/scenarios/${scenario?.id}` : `/scenarios/project/${projectId}`, {
        method: isEditing ? "PATCH" : "POST",
        body: JSON.stringify({
          title: title.trim(),
          context: composeScenarioContent(description, formulas, assumptions),
          equation: equation.trim(),
          tableData: table,
          chartConfig,
          chartSource,
          graphPngDataUrl,
          parentFolderId: parentFolderId ?? null,
          summary: scenario?.summary ?? ""
        })
      });

      onCreated({
        id: response.id ?? response._id ?? "",
        projectId: response.projectId,
        parentId: response.parentFolderId ?? null,
        ownerId,
        name: response.title,
        content: response.context ?? "",
        equation: response.equation ?? "",
        variables: response.variables ?? [],
        table: response.tableData ?? { columns: [], rows: [] },
        chartConfig: response.chartConfig ?? { xAxis: "", yAxes: [] },
        chartSource: response.chartSource ?? "excel",
        graphPngDataUrl: response.graphPngDataUrl ?? "",
        summary: response.summary ?? ""
      });
      onCancel();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : `Failed to ${isEditing ? "save" : "create"} scenario`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="modal-overlay"
      onClick={onCancel}
    >
      <div
        className="card modal-card"
        onClick={(event) => event.stopPropagation()}
        style={{ padding: 24 }}
      >
        <h2 style={{ marginTop: 0, marginBottom: 24 }}>{isEditing ? "Edit Scenario" : "Create Scenario"}</h2>

        <form onSubmit={handleSubmit} className="stack" style={{ gap: 16 }}>
          <label className="stack" style={{ gap: 6 }}>
            <strong>Scenario Name *</strong>
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="E.g. Base Case"
              style={{ padding: 10, borderRadius: 8, border: "1px solid #d1d5db" }}
              autoFocus
            />
          </label>

          <label className="stack" style={{ gap: 6 }}>
            <strong>Description *</strong>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={4}
              placeholder="Describe this scenario"
              style={{ padding: 10, borderRadius: 8, border: "1px solid #d1d5db" }}
            />
          </label>

          <label className="stack" style={{ gap: 6 }}>
            <strong>Formulas</strong>
            <textarea
              value={formulas}
              onChange={(event) => setFormulas(event.target.value)}
              rows={3}
              placeholder="Optional formulas"
              style={{ padding: 10, borderRadius: 8, border: "1px solid #d1d5db" }}
            />
          </label>

          <label className="stack" style={{ gap: 6 }}>
            <strong>Assumptions</strong>
            <textarea
              value={assumptions}
              onChange={(event) => setAssumptions(event.target.value)}
              rows={3}
              placeholder="Optional assumptions"
              style={{ padding: 10, borderRadius: 8, border: "1px solid #d1d5db" }}
            />
          </label>

          <label className="stack" style={{ gap: 6 }}>
            <strong>Equation</strong>
            <input
              type="text"
              value={equation}
              onChange={(event) => setEquation(event.target.value)}
              placeholder="E.g. y = 2x + 3"
              style={{ padding: 10, borderRadius: 8, border: "1px solid #d1d5db" }}
            />
          </label>

          <SectionBlock title="Scenario Table">
            <TableComponent table={table} onChange={setTable} />
          </SectionBlock>

          <SectionBlock title="Chart Source">
            <div className="stack" style={{ gap: 12 }}>
              <p className="muted-text" style={{ margin: 0, fontSize: 14, lineHeight: 1.7 }}>
                Choose whether this scenario should use the Excel-built chart or an uploaded chart image. Only the selected chart will be shown.
              </p>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <Button type="button" variant={chartSource === "excel" ? "primary" : "secondary"} onClick={() => setChartSource("excel")}>
                  Use Excel Chart
                </Button>
                <Button type="button" variant={chartSource === "image" ? "primary" : "secondary"} onClick={() => setChartSource("image")}>
                  Use Uploaded Image
                </Button>
              </div>
            </div>
          </SectionBlock>

          {chartSource === "excel" ? (
            <SectionBlock title="Chart Builder">
              <ChartComponent table={table} config={chartConfig} onConfigChange={setChartConfig} editable />
            </SectionBlock>
          ) : (
            <SectionBlock title="Scenario Graph Image (PNG)">
              <GraphPngInput value={graphPngDataUrl} onChange={setGraphPngDataUrl} />
            </SectionBlock>
          )}

          {error ? (
            <p style={{ color: "#b91c1c", margin: 0, fontSize: 14, padding: 12, background: "#fee2e2", borderRadius: 8 }}>
              {error}
            </p>
          ) : null}

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Button type="button" variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={saving || !title.trim() || !description.trim()}>
              {saving ? (isEditing ? "Saving..." : "Creating...") : isEditing ? "Save Scenario" : "Create Scenario"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
