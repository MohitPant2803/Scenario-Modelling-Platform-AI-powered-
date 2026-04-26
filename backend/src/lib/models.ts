import mongoose from "mongoose";

export const USER_ROLES = ["super_admin", "admin", "creator"] as const;
export const PROJECT_STATUSES = ["draft", "published"] as const;

const variableSchema = new mongoose.Schema(
  {
    symbol: { type: String, default: "" },
    meaning: { type: String, default: "" },
    unit: { type: String, default: "" }
  },
  { _id: false }
);

const tableSchema = new mongoose.Schema(
  {
    columns: { type: [String], default: [] },
    rows: { type: [[String]], default: [] }
  },
  { _id: false }
);

const chartConfigSchema = new mongoose.Schema(
  {
    xAxis: { type: String, default: "" },
    yAxes: { type: [String], default: [] }
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: USER_ROLES, default: "creator", index: true }
  },
  { timestamps: true }
);

const projectSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, default: "" },
    formulasAndInfo: { type: String, default: "" },
    tableData: { type: tableSchema, default: { columns: [], rows: [] } },
    graphEnabled: { type: Boolean, default: false },
    graphPngDataUrl: { type: String, default: "" },
    aiSummary: { type: String, default: "" },
    status: { type: String, enum: PROJECT_STATUSES, default: "draft", index: true },
    creatorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
  },
  { timestamps: true }
);

const folderSchema = new mongoose.Schema(
  {
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    name: { type: String, required: true },
    description: { type: String, default: "" },
    parentFolderId: { type: mongoose.Schema.Types.ObjectId, ref: "Folder", default: null, index: true }
  },
  { timestamps: true }
);

const scenarioSchema = new mongoose.Schema(
  {
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    parentFolderId: { type: mongoose.Schema.Types.ObjectId, ref: "Folder", default: null, index: true },
    title: { type: String, required: true },
    context: { type: String, default: "" },
    equation: { type: String, default: "" },
    variables: { type: [variableSchema], default: [] },
    tableData: { type: tableSchema, default: { columns: [], rows: [] } },
    chartConfig: { type: chartConfigSchema, default: { xAxis: "", yAxes: [] } },
    chartSource: { type: String, enum: ["excel", "image"], default: "excel" },
    graphPngDataUrl: { type: String, default: "" },
    summary: { type: String, default: "" }
  },
  { timestamps: true }
);

const chatMessageSchema = new mongoose.Schema(
  {
    scenarioId: { type: mongoose.Schema.Types.ObjectId, ref: "Scenario", required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false },
    role: { type: String, required: true },
    content: { type: String, required: true }
  },
  { timestamps: true }
);

export const UserModel = mongoose.model("User", userSchema);
export const ProjectModel = mongoose.model("Project", projectSchema);
export const FolderModel = mongoose.model("Folder", folderSchema);
export const ScenarioModel = mongoose.model("Scenario", scenarioSchema);
export const ChatMessageModel = mongoose.model("ChatMessage", chatMessageSchema);
