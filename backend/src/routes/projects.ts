import { Router } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import {
  canManageProject,
  canPublishProject,
  canReadProject,
  getCurrentUser,
  publishedProjectFilter,
  resolveProjectStatus,
  workspaceProjectFilter
} from "../lib/access.js";
import { ChatMessageModel, FolderModel, ProjectModel, PROJECT_STATUSES, ScenarioModel } from "../lib/models.js";
import { requireAuth } from "../middleware/requireAuth.js";

const projectsRouter = Router();

const tableDataSchema = z.object({
  columns: z.array(z.string()),
  rows: z.array(z.array(z.string()))
});

const projectSchema = z.object({
  title: z.string().min(1),
  description: z.string().default(""),
  formulasAndInfo: z.string().default(""),
  tableData: tableDataSchema.default({ columns: [], rows: [] }),
  graphEnabled: z.boolean().default(false),
  graphPngDataUrl: z.string().max(6_000_000).optional().default(""),
  status: z.enum(PROJECT_STATUSES).optional()
});

function creatorIdString(project: { creatorId: unknown }): string {
  const creator = project.creatorId as unknown;
  return creator && typeof creator === "object" && "_id" in creator
    ? String((creator as { _id: mongoose.Types.ObjectId })._id)
    : String(creator);
}

function serializeProjectFull(project: mongoose.Document) {
  const plain = project.toObject() as {
    _id: mongoose.Types.ObjectId;
    creatorId: unknown;
    title: string;
    description: string;
    formulasAndInfo?: string;
    tableData?: { columns: string[]; rows: string[][] };
    graphEnabled?: boolean;
    graphPngDataUrl?: string;
    aiSummary?: string;
    status?: "draft" | "published";
  };
  const creator = plain.creatorId as unknown;
  return {
    id: plain._id.toString(),
    creatorId: creatorIdString(plain),
    title: plain.title,
    description: plain.description,
    formulasAndInfo: plain.formulasAndInfo ?? "",
    tableData: plain.tableData ?? { columns: [], rows: [] },
    graphEnabled: plain.graphEnabled ?? false,
    graphPngDataUrl: plain.graphPngDataUrl ?? "",
    aiSummary: plain.aiSummary ?? "",
    status: plain.status ?? "published",
    creator:
      creator && typeof creator === "object" && "name" in creator ? creator : { name: "Unknown" }
  };
}

projectsRouter.get("/mine", requireAuth, async (req, res) => {
  const currentUser = await getCurrentUser(req);
  if (!currentUser) return res.status(401).json({ error: "Authentication required" });

  const projects = await ProjectModel.find(workspaceProjectFilter(currentUser))
    .sort({ createdAt: -1 })
    .populate("creatorId", "name email role");
  res.json(projects.map((project) => serializeProjectFull(project)));
});

projectsRouter.get("/user/:userId", requireAuth, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.userId)) return res.status(400).json({ error: "Invalid user id" });

  const currentUser = await getCurrentUser(req);
  if (!currentUser) return res.status(401).json({ error: "Authentication required" });
  if (currentUser.role !== "super_admin" && currentUser.role !== "admin" && currentUser._id.toString() !== req.params.userId) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const projects = await ProjectModel.find({ creatorId: req.params.userId })
    .sort({ createdAt: -1 })
    .populate("creatorId", "name email role");

  res.json(projects.map((project) => serializeProjectFull(project)));
});

projectsRouter.get("/", async (_req, res) => {
  const projects = await ProjectModel.find(publishedProjectFilter())
    .sort({ createdAt: -1 })
    .select("title description status")
    .populate("creatorId", "name");

  res.json(
    projects.map((project) => {
      const creator = project.creatorId as { name?: string } | null;
      return {
        id: project._id.toString(),
        title: project.title,
        description: project.description ?? "",
        creatorName: creator?.name ?? "Unknown",
        status: project.status ?? "published"
      };
    })
  );
});

projectsRouter.get("/:id", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: "Invalid project id" });

  const currentUser = await getCurrentUser(req);
  const accessProject = await ProjectModel.findById(req.params.id).select({ creatorId: 1, status: 1 }).lean();
  if (!accessProject) return res.status(404).json({ error: "Project not found" });
  if (!canReadProject(accessProject, currentUser)) return res.status(403).json({ error: "Forbidden" });

  const project = await ProjectModel.findById(req.params.id).populate("creatorId", "name email role");
  if (!project) return res.status(404).json({ error: "Project not found" });

  const scenarios = await ScenarioModel.find({ projectId: project._id }).sort({ createdAt: 1 });
  const creator = project.creatorId as unknown;
  const creatorIdStr =
    creator && typeof creator === "object" && "_id" in creator
      ? String((creator as { _id: mongoose.Types.ObjectId })._id)
      : String(creator);

  res.json({
    id: project._id.toString(),
    creatorId: creatorIdStr,
    title: project.title,
    description: project.description,
    formulasAndInfo: project.formulasAndInfo ?? "",
    tableData: project.tableData ?? { columns: [], rows: [] },
    graphEnabled: project.graphEnabled ?? false,
    graphPngDataUrl: project.graphPngDataUrl ?? "",
    aiSummary: project.aiSummary ?? "",
    status: project.status ?? "published",
    creator: project.creatorId,
    scenarios: scenarios.map((scenario) => ({
      id: scenario._id.toString(),
      projectId: scenario.projectId.toString(),
      parentFolderId: scenario.parentFolderId ? scenario.parentFolderId.toString() : null,
      title: scenario.title,
      context: scenario.context,
      equation: scenario.equation,
      variables: scenario.variables,
      tableData: scenario.tableData,
      chartConfig: scenario.chartConfig ?? { xAxis: "", yAxes: [] },
      chartSource: scenario.chartSource ?? "excel",
      graphPngDataUrl: scenario.graphPngDataUrl ?? "",
      summary: scenario.summary
    }))
  });
});

projectsRouter.post("/", requireAuth, async (req, res) => {
  const parsed = projectSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const currentUser = await getCurrentUser(req);
  if (!currentUser) return res.status(401).json({ error: "Authentication required" });

  const created = await ProjectModel.create({
    ...parsed.data,
    status: resolveProjectStatus(parsed.data.status, currentUser, { creatorId: currentUser._id, status: "draft" }),
    creatorId: req.session.userId!
  });
  const populated = await ProjectModel.findById(created._id).populate("creatorId", "name email role");
  if (!populated) return res.status(500).json({ error: "Failed to load project" });
  res.status(201).json(serializeProjectFull(populated));
});

projectsRouter.patch("/:id", requireAuth, async (req, res) => {
  const parsed = projectSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: "Invalid project id" });

  const currentUser = await getCurrentUser(req);
  if (!currentUser) return res.status(401).json({ error: "Authentication required" });

  const existing = await ProjectModel.findById(req.params.id);
  if (!existing) return res.status(404).json({ error: "Project not found" });
  if (!canManageProject(existing, currentUser)) return res.status(403).json({ error: "Forbidden" });
  if (parsed.data.status && !canPublishProject(existing, currentUser)) {
    return res.status(403).json({ error: "Only the owner, an admin, or the super admin can change publish status" });
  }

  const updated = await ProjectModel.findByIdAndUpdate(
    req.params.id,
    {
      ...parsed.data,
      ...(parsed.data.status ? { status: resolveProjectStatus(parsed.data.status, currentUser, existing) } : {})
    },
    { new: true }
  ).populate("creatorId", "name email role");
  if (!updated) return res.status(404).json({ error: "Project not found" });
  res.json(serializeProjectFull(updated));
});

projectsRouter.delete("/:id", requireAuth, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: "Invalid project id" });

  const currentUser = await getCurrentUser(req);
  if (!currentUser) return res.status(401).json({ error: "Authentication required" });

  const existing = await ProjectModel.findById(req.params.id);
  if (!existing) return res.status(404).json({ error: "Project not found" });
  if (!canManageProject(existing, currentUser)) return res.status(403).json({ error: "Forbidden" });

  const scenarios = await ScenarioModel.find({ projectId: req.params.id }).select("_id");
  const scenarioIds = scenarios.map((scenario) => scenario._id);
  if (scenarioIds.length) {
    await ChatMessageModel.deleteMany({ scenarioId: { $in: scenarioIds } });
  }
  await FolderModel.deleteMany({ projectId: req.params.id });
  await ScenarioModel.deleteMany({ projectId: req.params.id });
  await ProjectModel.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

export default projectsRouter;
