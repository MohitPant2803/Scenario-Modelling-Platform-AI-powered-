import ScenarioDetailView from "../../../components/ScenarioDetailView";
import type { HierarchyNode } from "../../../types";

type Props = {
  scenario: HierarchyNode;
  onBack: () => void;
};

export default function ScenarioView({ scenario, onBack }: Props) {
  return (
    <ScenarioDetailView
      scenario={{
        id: scenario.id,
        projectId: scenario.projectId,
        parentId: scenario.parentId,
        ownerId: scenario.ownerId,
        name: scenario.name,
        content: scenario.content ?? "",
        equation: scenario.equation ?? "",
        variables: scenario.variables ?? [],
        table: scenario.table ?? { columns: [], rows: [] },
        chartConfig: scenario.chartConfig ?? { xAxis: "", yAxes: [] },
        chartSource: scenario.chartSource ?? "excel",
        graphPngDataUrl: scenario.graphPngDataUrl ?? "",
        summary: scenario.summary ?? ""
      }}
      onBack={onBack}
    />
  );
}
