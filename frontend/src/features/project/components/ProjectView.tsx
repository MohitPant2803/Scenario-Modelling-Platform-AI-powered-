import Breadcrumb from "../../../components/common/Breadcrumb";
import FolderView from "../../folder/components/FolderView";
import ScenarioView from "../../scenario/components/ScenarioView";
import type { HierarchyNode, ProjectDto } from "../../../types";

type Props = {
  project: ProjectDto;
  activeFolder: HierarchyNode | null;
  activeScenario: HierarchyNode | null;
  currentChildren: HierarchyNode[];
  breadcrumbs: Array<{ id: string | null; label: string; onClick: () => void }>;
  canEdit: boolean;
  summarizing: boolean;
  onOpenFolder: (nodeId: string) => void;
  onOpenScenario: (nodeId: string) => void;
  onCreateFolder: () => void;
  onCreateScenario: () => void;
  onEditNode: (node: HierarchyNode) => void;
  onDeleteNode: (node: HierarchyNode) => void;
  onRunSummary: () => void;
  onBackFromScenario: () => void;
};

export default function ProjectView({
  project,
  activeFolder,
  activeScenario,
  currentChildren,
  breadcrumbs,
  canEdit,
  summarizing: _summarizing,
  onOpenFolder,
  onOpenScenario,
  onCreateFolder,
  onCreateScenario,
  onEditNode,
  onDeleteNode,
  onRunSummary: _onRunSummary,
  onBackFromScenario
}: Props) {
  const containerTitle = activeFolder?.name ?? project.name;
  const containerDescription = activeFolder?.description ?? project.description;

  return (
    <main className="stack">
      {activeFolder || activeScenario ? <Breadcrumb items={breadcrumbs} /> : null}

      {activeScenario ? (
        <ScenarioView scenario={activeScenario} onBack={onBackFromScenario} />
      ) : (
        <FolderView
          title={containerTitle}
          description={containerDescription}
          nodes={currentChildren}
          canEdit={canEdit}
          onOpenFolder={onOpenFolder}
          onOpenScenario={onOpenScenario}
          onCreateFolder={onCreateFolder}
          onCreateScenario={onCreateScenario}
          onEditNode={onEditNode}
          onDeleteNode={onDeleteNode}
        />
      )}
    </main>
  );
}
