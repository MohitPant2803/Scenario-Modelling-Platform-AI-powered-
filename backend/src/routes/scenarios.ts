import { Router } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import { canManageProject, canReadProject, getCurrentUser } from "../lib/access.js";
import { ProjectModel, ScenarioModel } from "../lib/models.js";
import { requireAuth } from "../middleware/requireAuth.js";

const scenariosRouter = Router();

const chartConfigSchema = z.object({
  xAxis: z.string().default(""),
  yAxes: z.array(z.string()).default([])
});

const scenarioSchema = z.object({
  title: z.string().min(1),
  context: z.string().default(""),
  equation: z.string().default(""),
  variables: z.array(z.object({ symbol: z.string(), meaning: z.string(), unit: z.string() })).default([]),
  tableData: z.object({ columns: z.array(z.string()), rows: z.array(z.array(z.string())) }).default({ columns: [], rows: [] }),
  chartConfig: chartConfigSchema.default({ xAxis: "", yAxes: [] }),
  chartSource: z.enum(["excel", "image"]).default("excel"),
  graphPngDataUrl: z.string().max(6_000_000).optional().default(""),
  summary: z.string().default(""),
  parentFolderId: z.string().nullable().optional()
});

scenariosRouter.get("/project/:projectId", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.projectId)) return res.status(400).json({ error: "Invalid project id" });

  const currentUser = await getCurrentUser(req);
  const project = await ProjectModel.findById(req.params.projectId).select({ creatorId: 1, status: 1 }).lean();
  if (!project) return res.status(404).json({ error: "Project not found" });
  if (!canReadProject(project, currentUser)) return res.status(403).json({ error: "Forbidden" });

  const scenarios = await ScenarioModel.find({ projectId: req.params.projectId }).sort({ createdAt: 1 });
  res.json(scenarios);
});

scenariosRouter.post("/project/:projectId", requireAuth, async (req, res) => {
  const parsed = scenarioSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  if (!mongoose.isValidObjectId(req.params.projectId)) return res.status(400).json({ error: "Invalid project id" });

  const currentUser = await getCurrentUser(req);
  if (!currentUser) return res.status(401).json({ error: "Authentication required" });

  const project = await ProjectModel.findById(req.params.projectId);
  if (!project) return res.status(404).json({ error: "Project not found" });
  if (!canManageProject(project, currentUser)) return res.status(403).json({ error: "Forbidden" });

  if (parsed.data.parentFolderId && !mongoose.isValidObjectId(parsed.data.parentFolderId)) {
    return res.status(400).json({ error: "Invalid parent folder id" });
  }

  const scenario = await ScenarioModel.create({
    projectId: req.params.projectId,
    ...parsed.data,
    parentFolderId: parsed.data.parentFolderId ?? null
  });
  res.status(201).json(scenario);
});

scenariosRouter.patch("/:id", requireAuth, async (req, res) => {
  const parsed = scenarioSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: "Invalid scenario id" });

  const currentUser = await getCurrentUser(req);
  if (!currentUser) return res.status(401).json({ error: "Authentication required" });

  const scenario = await ScenarioModel.findById(req.params.id);
  if (!scenario) return res.status(404).json({ error: "Scenario not found" });
  const project = await ProjectModel.findById(scenario.projectId);
  if (!project || !canManageProject(project, currentUser)) return res.status(403).json({ error: "Forbidden" });

  if (parsed.data.parentFolderId !== undefined && parsed.data.parentFolderId !== null && !mongoose.isValidObjectId(parsed.data.parentFolderId)) {
    return res.status(400).json({ error: "Invalid parent folder id" });
  }

  const updated = await ScenarioModel.findByIdAndUpdate(req.params.id, parsed.data, { new: true });
  res.json(updated);
});

scenariosRouter.delete("/:id", requireAuth, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: "Invalid scenario id" });

  const currentUser = await getCurrentUser(req);
  if (!currentUser) return res.status(401).json({ error: "Authentication required" });

  const scenario = await ScenarioModel.findById(req.params.id);
  if (!scenario) return res.status(404).json({ error: "Scenario not found" });
  const project = await ProjectModel.findById(scenario.projectId);
  if (!project || !canManageProject(project, currentUser)) return res.status(403).json({ error: "Forbidden" });

  await ScenarioModel.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

export default scenariosRouter;
