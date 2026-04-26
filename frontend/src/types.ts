export type NodeType = "project" | "folder" | "scenario";

export type ScenarioTable = {
  columns: string[];
  rows: string[][];
};

export type ScenarioVariable = {
  symbol: string;
  meaning: string;
  unit: string;
};

export type ScenarioChartConfig = {
  xAxis: string;
  yAxes: string[];
};

export type ScenarioChartSource = "excel" | "image";
export type UserRole = "super_admin" | "admin" | "creator";
export type ProjectStatus = "draft" | "published";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
};

export type ProjectDto = {
  id: string;
  ownerId: string;
  name: string;
  description: string;
  formulasAndInfo: string;
  tableData: ScenarioTable;
  graphEnabled: boolean;
  graphPngDataUrl: string;
  summary: string;
  status: ProjectStatus;
  ownerName?: string;
};

export type FolderDto = {
  id: string;
  name: string;
  description: string;
  projectId: string;
  parentId: string | null;
  ownerId: string;
};

export type ScenarioDto = {
  id: string;
  projectId: string;
  parentId: string | null;
  ownerId: string;
  name: string;
  content: string;
  equation: string;
  variables: ScenarioVariable[];
  table: ScenarioTable;
  chartConfig: ScenarioChartConfig;
  chartSource: ScenarioChartSource;
  graphPngDataUrl: string;
  summary: string;
};

export type HierarchyNode = {
  id: string;
  name: string;
  type: NodeType;
  parentId: string | null;
  projectId: string;
  ownerId: string;
  content?: string;
  description?: string;
  equation?: string;
  variables?: ScenarioVariable[];
  table?: ScenarioTable;
  chartConfig?: ScenarioChartConfig;
  chartSource?: ScenarioChartSource;
  graphPngDataUrl?: string;
  summary?: string;
};

export type TreeNode = HierarchyNode & {
  children: TreeNode[];
};

type BackendProject = {
  id: string;
  creatorId: string;
  title: string;
  creatorName?: string;
  description?: string;
  formulasAndInfo?: string;
  tableData?: ScenarioTable;
  graphEnabled?: boolean;
  graphPngDataUrl?: string;
  aiSummary?: string;
  status?: ProjectStatus;
  creator?: { name?: string };
};

type BackendFolder = {
  id?: string;
  _id?: string;
  name: string;
  description?: string;
  projectId: string;
  parentFolderId?: string | { toString(): string } | null;
};

type BackendScenario = {
  id?: string;
  _id?: string;
  projectId: string;
  parentFolderId?: string | { toString(): string } | null;
  title: string;
  context?: string;
  equation?: string;
  variables?: ScenarioVariable[];
  tableData?: ScenarioTable;
  chartConfig?: ScenarioChartConfig;
  chartSource?: ScenarioChartSource;
  graphPngDataUrl?: string;
  summary?: string;
};

const getEntityId = (entity: { id?: string; _id?: string | { toString(): string } }) => {
  const rawId = entity.id ?? entity._id;
  return rawId ? rawId.toString() : "";
};

const getOptionalId = (value?: string | { toString(): string } | null) => (value ? value.toString() : null);

export function normalizeProject(project: BackendProject): ProjectDto {
  return {
    id: project.id,
    ownerId: project.creatorId,
    name: project.title,
    description: project.description ?? "",
    formulasAndInfo: project.formulasAndInfo ?? "",
    tableData: project.tableData ?? { columns: [], rows: [] },
    graphEnabled: project.graphEnabled ?? false,
    graphPngDataUrl: project.graphPngDataUrl ?? "",
    summary: project.aiSummary ?? "",
    status: project.status ?? "published",
    ownerName: project.creator?.name ?? project.creatorName
  };
}

export function normalizeFolder(folder: BackendFolder, ownerId: string): FolderDto {
  return {
    id: getEntityId(folder),
    name: folder.name,
    description: folder.description ?? "",
    projectId: folder.projectId,
    parentId: getOptionalId(folder.parentFolderId),
    ownerId
  };
}

export function normalizeScenario(scenario: BackendScenario, ownerId: string): ScenarioDto {
  return {
    id: getEntityId(scenario),
    projectId: scenario.projectId,
    parentId: getOptionalId(scenario.parentFolderId),
    ownerId,
    name: scenario.title,
    content: scenario.context ?? "",
    equation: scenario.equation ?? "",
    variables: scenario.variables ?? [],
    table: scenario.tableData ?? { columns: [], rows: [] },
    chartConfig: scenario.chartConfig ?? { xAxis: "", yAxes: [] },
    chartSource: scenario.chartSource ?? "excel",
    graphPngDataUrl: scenario.graphPngDataUrl ?? "",
    summary: scenario.summary ?? ""
  };
}

export function folderToNode(folder: FolderDto): HierarchyNode {
  return {
    id: folder.id,
    name: folder.name,
    type: "folder",
    parentId: folder.parentId,
    projectId: folder.projectId,
    ownerId: folder.ownerId,
    description: folder.description
  };
}

export function scenarioToNode(scenario: ScenarioDto): HierarchyNode {
  return {
    id: scenario.id,
    name: scenario.name,
    type: "scenario",
    parentId: scenario.parentId,
    projectId: scenario.projectId,
    ownerId: scenario.ownerId,
    content: scenario.content,
    equation: scenario.equation,
    variables: scenario.variables,
    table: scenario.table,
    chartConfig: scenario.chartConfig,
    chartSource: scenario.chartSource,
    graphPngDataUrl: scenario.graphPngDataUrl,
    summary: scenario.summary
  };
}
