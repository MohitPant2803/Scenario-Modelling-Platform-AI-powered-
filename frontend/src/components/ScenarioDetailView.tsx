import { useState, type ReactNode } from "react";
import type { ScenarioDto } from "../types";
import { api } from "../lib/api";
import { parseScenarioContent } from "../features/scenario/utils";
import TableComponent from "./TableComponent";
import ChartComponent from "./ChartComponent";
import ChatComponent from "./ChatComponent";
import GraphPngInput from "./GraphPngInput";
import Button from "./common/Button";

type Props = {
  scenario: ScenarioDto;
  onBack?: () => void;
};

type CollapsibleProps = {
  title: string;
  preview?: ReactNode;
  defaultExpanded?: boolean;
  children: ReactNode;
};

function CollapsiblePanel({ title, preview, defaultExpanded = false, children }: CollapsibleProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <section className="card" style={{ display: "grid", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
        <strong style={{ fontSize: 18 }}>{title}</strong>
        <Button type="button" variant="ghost" onClick={() => setExpanded((current) => !current)}>
          {expanded ? "Collapse" : "Expand"}
        </Button>
      </div>

      {expanded ? children : preview ? <div style={{ color: "#64748b", lineHeight: 1.7 }}>{preview}</div> : <div style={{ color: "#94a3b8" }}>Expand to view this section.</div>}
    </section>
  );
}

function excerpt(text: string, maxLength = 180) {
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength).trim()}...`;
}

export default function ScenarioDetailView({ scenario, onBack }: Props) {
  const { description, formulas, assumptions } = parseScenarioContent(scenario.content);
  const hasTableData = scenario.table.rows.some((row) => row.some((cell) => cell.trim() !== ""));
  const showExcelChart = scenario.chartSource === "excel";
  const showImageChart = scenario.chartSource === "image";
  const [summary, setSummary] = useState(scenario.summary);
  const [summarizing, setSummarizing] = useState(false);
  const [moreInsights, setMoreInsights] = useState<string[]>([]);
  const [loadingMoreInsights, setLoadingMoreInsights] = useState(false);
  const [canLoadMoreInsights, setCanLoadMoreInsights] = useState(true);

  const summarizeScenario = async () => {
    setSummarizing(true);
    try {
      const response = await api<{ summary: string }>(`/ai/scenarios/${scenario.id}/summarize`, {
        method: "POST"
      });
      setSummary(response.summary);
      setMoreInsights([]);
      setCanLoadMoreInsights(true);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Failed to summarize scenario");
    } finally {
      setSummarizing(false);
    }
  };

  const loadMoreInsights = async () => {
    if (!summary.trim()) return;
    setLoadingMoreInsights(true);
    try {
      const response = await api<{ summary: string }>(`/ai/scenarios/${scenario.id}/summary-more`, {
        method: "POST",
        body: JSON.stringify({
          currentSummary: [summary, ...moreInsights].join("\n\n"),
          rounds: moreInsights.length
        })
      });
      const nextSummary = response.summary.trim();
      setMoreInsights((current) => [...current, nextSummary]);
      if (nextSummary.includes("The key insights are now covered; you can use Ask AI for specific questions.")) {
        setCanLoadMoreInsights(false);
      }
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Failed to load more insights");
    } finally {
      setLoadingMoreInsights(false);
    }
  };

  return (
    <div className="stack" style={{ gap: 20 }}>
      {onBack ? (
        <div>
          <Button type="button" variant="ghost" onClick={onBack}>
            Back
          </Button>
        </div>
      ) : null}

      <div
        style={{
          background: "linear-gradient(135deg, #dbeafe 0%, #eff6ff 52%, #ffffff 100%)",
          border: "2px solid #93c5fd",
          borderRadius: 18,
          padding: 22
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
          <div>
            <h1 style={{ margin: "0 0 8px 0", color: "#1e40af" }}>📊 {scenario.name}</h1>
            <p style={{ margin: 0, color: "#1e3a8a", fontSize: 14 }}>Scenario workspace</p>
          </div>
          {scenario.equation ? (
            <div
              style={{
                padding: "10px 14px",
                borderRadius: 999,
                background: "#ffffff",
                color: "#1e3a8a",
                border: "1px solid #bfdbfe",
                fontFamily: "monospace",
                fontSize: 13
              }}
            >
              {scenario.equation}
            </div>
          ) : null}
        </div>
      </div>

      <div className="scenario-layout">
        <div className="stack" style={{ gap: 16 }}>
          <CollapsiblePanel title="Information" preview={excerpt(description)} defaultExpanded>
            <p style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: 14, lineHeight: 1.7 }}>{description}</p>
          </CollapsiblePanel>

          {formulas ? (
            <CollapsiblePanel title="Formulas" preview={excerpt(formulas)}>
              <p
                style={{
                  margin: 0,
                  display: "block",
                  width: "100%",
                  whiteSpace: "pre-wrap",
                  overflowWrap: "anywhere",
                  fontSize: 14,
                  lineHeight: 1.7,
                  color: "#334155"
                }}
              >
                {formulas}
              </p>
            </CollapsiblePanel>
          ) : null}

          {assumptions ? (
            <CollapsiblePanel title="Assumptions" preview={excerpt(assumptions)}>
              <p style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: 14, lineHeight: 1.7 }}>{assumptions}</p>
            </CollapsiblePanel>
          ) : null}

          {hasTableData ? (
            <CollapsiblePanel title="Excel / Data File" preview="Scenario table is available. Expand to inspect the imported rows and columns.">
              <TableComponent table={scenario.table} onChange={() => undefined} readOnly />
            </CollapsiblePanel>
          ) : null}

          {showExcelChart && hasTableData && scenario.table.rows.length >= 2 ? (
            <CollapsiblePanel title="Chart" preview="A custom chart is available for this scenario table.">
              <ChartComponent table={scenario.table} config={scenario.chartConfig} />
            </CollapsiblePanel>
          ) : null}

          {showImageChart && scenario.graphPngDataUrl ? (
            <CollapsiblePanel title="Graph Image" preview="A PNG graph image is attached to this scenario.">
              <GraphPngInput value={scenario.graphPngDataUrl} onChange={() => undefined} readOnly />
            </CollapsiblePanel>
          ) : null}
        </div>

        <aside className="scenario-ai-panel">
          <section
            style={{
              borderRadius: 22,
              padding: 18,
              background: "linear-gradient(180deg, #0f172a 0%, #1e293b 100%)",
              color: "#e2e8f0",
              boxShadow: "0 18px 38px rgba(15, 23, 42, 0.18)",
              display: "grid",
              gap: 16
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase", opacity: 0.75 }}>AI workspace</div>
                <h2 style={{ margin: "6px 0 0", fontSize: 22, color: "#f8fafc" }}>Summary & Chat</h2>
              </div>
              <Button type="button" variant="secondary" onClick={() => void summarizeScenario()} disabled={summarizing} style={{ background: "#f8fafc" }}>
                {summarizing ? "Summarizing..." : "Refresh"}
              </Button>
            </div>

            <div
              style={{
                padding: 16,
                borderRadius: 18,
                background: "linear-gradient(180deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.06) 100%)",
                border: "1px solid rgba(255,255,255,0.12)",
                backdropFilter: "blur(6px)"
              }}
            >
              <div style={{ fontSize: 12, opacity: 0.78, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 }}>
                AI Summary
              </div>
              <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.75, fontSize: 14 }}>{summary || "No summary yet. Generate one to get a concise readout of this scenario."}</div>
              {moreInsights.length ? (
                <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
                  {moreInsights.map((insight, index) => (
                    <div
                      key={`${index}-${insight.slice(0, 24)}`}
                      style={{
                        paddingTop: 12,
                        borderTop: "1px solid rgba(255,255,255,0.12)",
                        whiteSpace: "pre-wrap",
                        lineHeight: 1.75,
                        fontSize: 14
                      }}
                    >
                      {insight}
                    </div>
                  ))}
                </div>
              ) : null}
              {summary ? (
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
                  <Button type="button" variant="secondary" onClick={() => void loadMoreInsights()} disabled={loadingMoreInsights || !canLoadMoreInsights}>
                    {loadingMoreInsights ? "Loading..." : canLoadMoreInsights ? "Know More Insights" : "Use Ask AI"}
                  </Button>
                </div>
              ) : null}
            </div>
          </section>
        </aside>
      </div>

      <ChatComponent scenarioId={scenario.id} floating />
    </div>
  );
}
