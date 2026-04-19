import { useState } from "react";
import type { ScenarioDto } from "../types";
import SectionBlock from "./SectionBlock";
import TableComponent from "./TableComponent";
import ChartComponent from "./ChartComponent";
import ChatComponent from "./ChatComponent";
import { api } from "../lib/api";

type Props = {
  scenario: ScenarioDto;
};

export default function ScenarioCard({ scenario }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [summary, setSummary] = useState(scenario.summary);

  const summarize = async () => {
    const response = await api<{ summary: string }>(`/ai/scenarios/${scenario.id}/summarize`, {
      method: "POST"
    });
    setSummary(response.summary);
  };

  return (
    <article className="stack card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3 style={{ margin: 0 }}>{scenario.name}</h3>
        <button onClick={() => setExpanded((value) => !value)}>{expanded ? "Collapse" : "Expand"}</button>
      </div>

      {expanded ? (
        <>
          <SectionBlock title="1. Context / Intent">
            <textarea defaultValue={scenario.content} rows={6} style={{ width: "100%" }} />
          </SectionBlock>
          <SectionBlock title="2. Equation + Variables">
            <p>Equation: {scenario.equation || "Not set"}</p>
          </SectionBlock>
          <SectionBlock title="3. Table">
            <TableComponent table={scenario.table} onChange={() => undefined} />
          </SectionBlock>
          <SectionBlock title="4. Chart">
            <ChartComponent table={scenario.table} config={scenario.chartConfig} />
          </SectionBlock>
          <SectionBlock title="5. Summary + Chat" action={<button onClick={summarize}>Summarize</button>}>
            <div className="stack">
              <div className="card">{summary || "No summary yet."}</div>
              <ChatComponent scenarioId={scenario.id} />
            </div>
          </SectionBlock>
        </>
      ) : null}
    </article>
  );
}
