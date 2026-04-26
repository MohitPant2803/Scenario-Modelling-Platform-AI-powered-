import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import CreateFolderDialog from "../components/CreateFolderDialog";
import EnhancedScenarioForm from "../components/EnhancedScenarioForm";
import Button from "../components/common/Button";
import ProjectView from "../features/project/components/ProjectView";
import { useProjectHierarchy } from "../hooks/useProjectHierarchy";
import { api } from "../lib/api";
import {
  type AuthUser,
  type FolderDto,
  type HierarchyNode,
  type ScenarioDto
} from "../types";

export default function ProjectPage() {
  const { projectId = "" } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [me, setMe] = useState<AuthUser | null>(null);
  const [summarizing, setSummarizing] = useState(false);
  const [folderModal, setFolderModal] = useState<{ mode: "create" | "edit"; folder?: FolderDto | null } | null>(null);
  const [scenarioModal, setScenarioModal] = useState<{ mode: "create" | "edit"; scenario?: ScenarioDto | null } | null>(null);
  const [showStarterPrompt, setShowStarterPrompt] = useState(false);
  const { project, currentChildren, activeFolder, activeScenario, loading, error, breadcrumbs, openFolder, openScenario, setProject, upsertNode, removeNode, reloadHierarchy } =
    useProjectHierarchy(projectId);

  useEffect(() => {
    api<AuthUser | null>("/auth/me").then(setMe).catch(() => setMe(null));
  }, []);

  useEffect(() => {
    const locationState = location.state as { startHierarchyFlow?: boolean } | null;
    if (locationState?.startHierarchyFlow) {
      setShowStarterPrompt(true);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.pathname, location.state, navigate]);

  const canEdit = Boolean(me && project && (me.role === "super_admin" || me.role === "admin" || me.id === project.ownerId));

  const requireOwner = () => {
    if (!canEdit) {
      window.alert("Only the project owner, an admin, or the super admin can modify this hierarchy.");
      return false;
    }
    return true;
  };

  const handleNodeEdit = (node: HierarchyNode) => {
    if (!requireOwner()) {
      return;
    }

    if (node.type === "folder") {
      setFolderModal({
        mode: "edit",
        folder: {
          id: node.id,
          name: node.name,
          description: node.description ?? "",
          projectId: node.projectId,
          parentId: node.parentId,
          ownerId: node.ownerId
        }
      });
      return;
    }

    setScenarioModal({
      mode: "edit",
      scenario: {
        id: node.id,
        projectId: node.projectId,
        parentId: node.parentId,
        ownerId: node.ownerId,
        name: node.name,
        content: node.content ?? "",
        equation: node.equation ?? "",
        variables: node.variables ?? [],
        table: node.table ?? { columns: [], rows: [] },
        chartConfig: node.chartConfig ?? { xAxis: "", yAxes: [] },
        chartSource: node.chartSource ?? "excel",
        graphPngDataUrl: node.graphPngDataUrl ?? "",
        summary: node.summary ?? ""
      }
    });
  };

  const handleNodeDelete = async (node: HierarchyNode) => {
    if (!requireOwner()) {
      return;
    }
    const confirmed = window.confirm(
      node.type === "folder"
        ? `Delete folder "${node.name}" and all nested content?`
        : `Delete scenario "${node.name}"?`
    );
    if (!confirmed) {
      return;
    }

    try {
      await api(node.type === "folder" ? `/folders/${node.id}` : `/scenarios/${node.id}`, { method: "DELETE" });
      removeNode(node.id);
      await reloadHierarchy();
    } catch (deleteError) {
      window.alert(deleteError instanceof Error ? deleteError.message : "Delete failed");
    }
  };

  const handleProjectSummary = async () => {
    if (!requireOwner()) {
      return;
    }
    setSummarizing(true);
    try {
      const response = await api<{ summary: string }>(`/ai/projects/${projectId}/summarize`, { method: "POST" });
      setProject((current) => (current ? { ...current, summary: response.summary } : current));
    } catch (summaryError) {
      window.alert(summaryError instanceof Error ? summaryError.message : "Summary failed");
    } finally {
      setSummarizing(false);
    }
  };

  if (loading) {
    return <main className="stack"><div className="card">Loading project...</div></main>;
  }

  if (error || !project) {
    return <main className="stack"><div className="card">{error || "Project not found."}</div></main>;
  }

  const breadcrumbItems = breadcrumbs.map((item, index) => ({
    ...item,
    onClick: () => {
      const target = breadcrumbs[index];
      openFolder(target.id);
    }
  }));

  if (activeScenario) {
    breadcrumbItems.push({
      id: activeScenario.id,
      label: activeScenario.name,
      onClick: () => undefined
    });
  }

  const currentParentId = activeFolder?.id ?? null;

  return (
    <>
      <ProjectView
        project={project}
        activeFolder={activeFolder}
        activeScenario={activeScenario}
        currentChildren={currentChildren}
        breadcrumbs={breadcrumbItems}
        canEdit={canEdit}
        summarizing={summarizing}
        onOpenFolder={openFolder}
        onOpenScenario={openScenario}
        onCreateFolder={() => requireOwner() && setFolderModal({ mode: "create" })}
        onCreateScenario={() => requireOwner() && setScenarioModal({ mode: "create" })}
        onEditNode={handleNodeEdit}
        onDeleteNode={handleNodeDelete}
        onRunSummary={handleProjectSummary}
        onBackFromScenario={() => window.history.back()}
      />

      {activeScenario ? (
        <div style={{ position: "fixed", right: 16, bottom: 16 }}>
          <Button type="button" variant="secondary" onClick={() => window.history.back()}>
            Close Scenario
          </Button>
        </div>
      ) : null}

      {folderModal ? (
        <CreateFolderDialog
          projectId={project.id}
          parentFolderId={folderModal.folder?.parentId ?? currentParentId}
          folder={folderModal.folder ?? null}
          ownerId={project.ownerId}
          onCreated={(folder) =>
            upsertNode({
              id: folder.id,
              name: folder.name,
              type: "folder",
              parentId: folder.parentId,
              projectId: folder.projectId,
              ownerId: folder.ownerId,
              description: folder.description
            })
          }
          onClose={() => setFolderModal(null)}
        />
      ) : null}

      {scenarioModal ? (
        <EnhancedScenarioForm
          projectId={project.id}
          parentFolderId={scenarioModal.scenario?.parentId ?? currentParentId}
          scenario={scenarioModal.scenario ?? null}
          ownerId={project.ownerId}
          onCreated={(scenario) =>
            upsertNode({
              id: scenario.id,
              name: scenario.name,
              type: "scenario",
              parentId: scenario.parentId,
              projectId: scenario.projectId,
              ownerId: project.ownerId,
              content: scenario.content,
              equation: scenario.equation,
              variables: scenario.variables,
              table: scenario.table,
              chartConfig: scenario.chartConfig,
              chartSource: scenario.chartSource,
              graphPngDataUrl: scenario.graphPngDataUrl,
              summary: scenario.summary
            })
          }
          onCancel={() => setScenarioModal(null)}
        />
      ) : null}

      {showStarterPrompt && canEdit ? (
        <div
          className="modal-overlay"
          onClick={() => setShowStarterPrompt(false)}
        >
          <div
            className="card modal-card modal-card-compact"
            onClick={(event) => event.stopPropagation()}
            style={{ padding: 24, display: "grid", gap: 16 }}
          >
            <div>
              <h2 style={{ margin: 0 }}>Project Created</h2>
              <p style={{ margin: "8px 0 0", color: "#64748b" }}>
                What would you like to add first?
              </p>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Button
                type="button"
                variant="primary"
                onClick={() => {
                  setShowStarterPrompt(false);
                  setFolderModal({ mode: "create" });
                }}
              >
                Create Folder
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setShowStarterPrompt(false);
                  setScenarioModal({ mode: "create" });
                }}
              >
                Create Scenario
              </Button>
              <Button type="button" variant="ghost" onClick={() => setShowStarterPrompt(false)}>
                Later
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
