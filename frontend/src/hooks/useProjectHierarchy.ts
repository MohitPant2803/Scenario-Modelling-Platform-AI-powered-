import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import {
  folderToNode,
  normalizeFolder,
  normalizeProject,
  normalizeScenario,
  scenarioToNode,
  type HierarchyNode,
  type ProjectDto
} from "../types";
import { addNode, buildTree, deleteNode, getChildren } from "../utils/nodeTree";

const HISTORY_KEY = "projectHierarchy";

type FolderResponse = {
  folders: Array<{
    id?: string;
    _id?: string;
    name: string;
    description?: string;
    projectId: string;
    parentFolderId?: string | null;
  }>;
};

type ScenarioResponse = Array<{
  id?: string;
  _id?: string;
  projectId: string;
  parentFolderId?: string | null;
  title: string;
  context?: string;
  equation?: string;
  variables?: Array<{ symbol: string; meaning: string; unit: string }>;
  tableData?: { columns: string[]; rows: string[][] };
  chartConfig?: { xAxis: string; yAxes: string[] };
  chartSource?: "excel" | "image";
  summary?: string;
}>;

type ProjectResponse = {
  id: string;
  creatorId: string;
  title: string;
  description?: string;
  formulasAndInfo?: string;
  tableData?: { columns: string[]; rows: string[][] };
  graphEnabled?: boolean;
  graphPngDataUrl?: string;
  aiSummary?: string;
  status?: "draft" | "published";
  creator?: { name?: string };
};

export function useProjectHierarchy(projectId: string) {
  const [project, setProject] = useState<ProjectDto | null>(null);
  const [nodes, setNodes] = useState<HierarchyNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(null);

  const loadHierarchy = async (cancelled = false) => {
    setLoading(true);
    setError(null);

    try {
      const [projectResponse, folderResponse, scenarioResponse] = await Promise.all([
        api<ProjectResponse>(`/projects/${projectId}`),
        api<FolderResponse>(`/folders/project/${projectId}/tree`),
        api<ScenarioResponse>(`/scenarios/project/${projectId}`)
      ]);

      if (cancelled) {
        return;
      }

      const normalizedProject = normalizeProject(projectResponse);
      const folderNodes = folderResponse.folders.map((folder) => folderToNode(normalizeFolder(folder, normalizedProject.ownerId)));
      const scenarioNodes = scenarioResponse.map((scenario) => scenarioToNode(normalizeScenario(scenario, normalizedProject.ownerId)));
      const nextNodes = [...folderNodes, ...scenarioNodes];
      const nextNodeIds = new Set(nextNodes.map((node) => node.id));
      const historyState = (window.history.state as { [HISTORY_KEY]?: { projectId?: string; folderId?: string | null; scenarioId?: string | null } } | null)?.[
        HISTORY_KEY
      ];
      const requestedFolderId = historyState?.projectId === projectId ? historyState.folderId ?? null : null;
      const requestedScenarioId = historyState?.projectId === projectId ? historyState.scenarioId ?? null : null;
      const restoredFolderId = requestedFolderId && nextNodeIds.has(requestedFolderId) ? requestedFolderId : null;
      const restoredScenarioId = requestedScenarioId && nextNodeIds.has(requestedScenarioId) ? requestedScenarioId : null;

      setProject(normalizedProject);
      setNodes(nextNodes);
      setActiveFolderId(restoredFolderId);
      setActiveScenarioId(restoredScenarioId);

      window.history.replaceState(
        {
          ...(window.history.state ?? {}),
          [HISTORY_KEY]: {
            projectId,
            folderId: restoredFolderId,
            scenarioId: restoredScenarioId
          }
        },
        ""
      );
    } catch (loadError) {
      if (!cancelled) {
        setError(loadError instanceof Error ? loadError.message : "Failed to load project hierarchy.");
      }
    } finally {
      if (!cancelled) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    let cancelled = false;

    async function load() {
      await loadHierarchy(cancelled);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  useEffect(() => {
    const onPopState = (event: PopStateEvent) => {
      const historyState = (event.state as { [HISTORY_KEY]?: { projectId?: string; folderId?: string | null; scenarioId?: string | null } } | null)?.[
        HISTORY_KEY
      ];

      if (historyState?.projectId === projectId) {
        setActiveFolderId(historyState.folderId ?? null);
        setActiveScenarioId(historyState.scenarioId ?? null);
      }
    };

    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("popstate", onPopState);
    };
  }, [projectId]);

  const nodeMap = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);
  const tree = useMemo(() => buildTree(nodes), [nodes]);
  const activeFolder = activeFolderId ? nodeMap.get(activeFolderId) ?? null : null;
  const activeScenario = activeScenarioId ? nodeMap.get(activeScenarioId) ?? null : null;
  const currentChildren = useMemo(() => getChildren(nodes, activeFolderId), [nodes, activeFolderId]);

  const breadcrumbs = useMemo(() => {
    if (!project) {
      return [];
    }

    const path = [{ id: null as string | null, label: project.name }];
    let cursor = activeFolder;

    while (cursor) {
      path.push({ id: cursor.id, label: cursor.name });
      cursor = cursor.parentId ? nodeMap.get(cursor.parentId) ?? null : null;
    }

    return path;
  }, [activeFolder, nodeMap, project]);

  const syncHistory = (folderId: string | null, scenarioId: string | null, mode: "push" | "replace" = "push") => {
    const nextState = {
      ...(window.history.state ?? {}),
      [HISTORY_KEY]: {
        projectId,
        folderId,
        scenarioId
      }
    };

    if (mode === "replace") {
      window.history.replaceState(nextState, "");
      return;
    }

    window.history.pushState(nextState, "");
  };

  const openFolder = (folderId: string | null) => {
    setActiveScenarioId(null);
    setActiveFolderId(folderId);
    syncHistory(folderId, null);
  };

  const openScenario = (scenarioId: string | null) => {
    setActiveScenarioId(scenarioId);
    syncHistory(activeFolderId, scenarioId);
  };

  const upsertNode = (node: HierarchyNode) => {
    setNodes((current) => addNode(current, node));
  };

  const removeNode = (nodeId: string) => {
    setNodes((current) => deleteNode(current, nodeId));
    if (activeFolderId === nodeId) {
      setActiveFolderId(null);
      syncHistory(null, activeScenarioId, "replace");
    }
    if (activeScenarioId === nodeId) {
      setActiveScenarioId(null);
      syncHistory(activeFolderId, null, "replace");
    }
  };

  return {
    project,
    nodes,
    tree,
    currentChildren,
    activeFolder,
    activeScenario,
    activeFolderId,
    loading,
    error,
    breadcrumbs,
    openFolder,
    openScenario,
    setProject,
    upsertNode,
    removeNode,
    reloadHierarchy: () => loadHierarchy(false)
  };
}
