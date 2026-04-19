export type ScenarioTable = {
  columns: string[];
  rows: string[][];
};

export type ScenarioVariable = {
  symbol: string;
  meaning: string;
  unit: string;
};

export type ScenarioDto = {
  id: string;
  projectId: string;
  title: string;
  context: string;
  equation: string;
  variables: ScenarioVariable[];
  table: ScenarioTable;
  summary: string;
};

export type ProjectDto = {
  id: string;
  title: string;
  description: string;
  creatorName: string;
  scenarios: ScenarioDto[];
};
