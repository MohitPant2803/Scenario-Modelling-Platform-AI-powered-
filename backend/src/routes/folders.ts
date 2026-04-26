import { Router } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import { canManageProject, canReadProject, getCurrentUser } from "../lib/access.js";
import { FolderModel, ProjectModel, ScenarioModel } from "../lib/models.js";
import { requireAuth } from "../middleware/requireAuth.js";

const foldersRouter = Router();

const createFolderSchema = z.object({
  name: z.string().min(1),
  description: z.string().default(""),
  parentFolderId: z.string().optional().nullable()
});

const updateFolderSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  parentFolderId: z.string().optional().nullable()
});

async function wouldCreateCycle(folderId: string, parentFolderId: string | null) {
  if (!parentFolderId) return false;

  let cursor: string | null = parentFolderId;
  while (cursor) {
    if (cursor === folderId) {
      return true;
    }
    const current: { parentFolderId?: mongoose.Types.ObjectId | null } | null = await FolderModel.findById(cursor)
      .select("parentFolderId")
      .lean();
    cursor = current?.parentFolderId ? current.parentFolderId.toString() : null;
  }

  return false;
}

foldersRouter.get("/project/:projectId/tree", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.projectId)) return res.status(400).json({ error: "Invalid project id" });

  const currentUser = await getCurrentUser(req);
  const project = await ProjectModel.findById(req.params.projectId).select({ creatorId: 1, status: 1 }).lean();
  if (!project) return res.status(404).json({ error: "Project not found" });
  if (!canReadProject(project, currentUser)) return res.status(403).json({ error: "Forbidden" });

  try {
    const folders = await FolderModel.find({ projectId: req.params.projectId }).lean();
    const scenarios = await ScenarioModel.find({ projectId: req.params.projectId, parentFolderId: null }).lean();

    res.json({ folders, scenarios });
  } catch {
    res.status(500).json({ error: "Failed to fetch folder tree" });
  }
});

foldersRouter.get("/:folderId/contents", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.folderId)) return res.status(400).json({ error: "Invalid folder id" });

  const currentUser = await getCurrentUser(req);
  const folder = await FolderModel.findById(req.params.folderId);
  if (!folder) return res.status(404).json({ error: "Folder not found" });

  const project = await ProjectModel.findById(folder.projectId).select({ creatorId: 1, status: 1 }).lean();
  if (!project) return res.status(404).json({ error: "Project not found" });
  if (!canReadProject(project, currentUser)) return res.status(403).json({ error: "Forbidden" });

  try {
    const subfolders = await FolderModel.find({ parentFolderId: req.params.folderId }).lean();
    const scenarios = await ScenarioModel.find({ parentFolderId: req.params.folderId }).lean();

    res.json({ folders: subfolders, scenarios });
  } catch {
    res.status(500).json({ error: "Failed to fetch folder contents" });
  }
});

foldersRouter.post("/project/:projectId", requireAuth, async (req, res) => {
  const parsed = createFolderSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  if (!mongoose.isValidObjectId(req.params.projectId)) return res.status(400).json({ error: "Invalid project id" });

  const currentUser = await getCurrentUser(req);
  if (!currentUser) return res.status(401).json({ error: "Authentication required" });

  const project = await ProjectModel.findById(req.params.projectId);
  if (!project) return res.status(404).json({ error: "Project not found" });
  if (!canManageProject(project, currentUser)) return res.status(403).json({ error: "Forbidden" });

  if (parsed.data.parentFolderId) {
    if (!mongoose.isValidObjectId(parsed.data.parentFolderId)) return res.status(400).json({ error: "Invalid parent folder id" });
    const parentFolder = await FolderModel.findById(parsed.data.parentFolderId);
    if (!parentFolder || parentFolder.projectId.toString() !== req.params.projectId) {
      return res.status(400).json({ error: "Parent folder not found in this project" });
    }
  }

  try {
    const folder = await FolderModel.create({
      projectId: req.params.projectId,
      name: parsed.data.name,
      description: parsed.data.description,
      parentFolderId: parsed.data.parentFolderId || null
    });
    res.status(201).json(folder);
  } catch {
    res.status(500).json({ error: "Failed to create folder" });
  }
});

foldersRouter.patch("/:id", requireAuth, async (req, res) => {
  const parsed = updateFolderSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: "Invalid folder id" });

  const currentUser = await getCurrentUser(req);
  if (!currentUser) return res.status(401).json({ error: "Authentication required" });

  const folder = await FolderModel.findById(req.params.id);
  if (!folder) return res.status(404).json({ error: "Folder not found" });

  const project = await ProjectModel.findById(folder.projectId);
  if (!project || !canManageProject(project, currentUser)) return res.status(403).json({ error: "Forbidden" });

  if (parsed.data.parentFolderId && parsed.data.parentFolderId !== null) {
    if (!mongoose.isValidObjectId(parsed.data.parentFolderId)) return res.status(400).json({ error: "Invalid parent folder id" });
    if (parsed.data.parentFolderId === folder._id.toString()) {
      return res.status(400).json({ error: "Cannot move folder to itself" });
    }

    const parentFolder = await FolderModel.findById(parsed.data.parentFolderId);
    if (!parentFolder || parentFolder.projectId.toString() !== folder.projectId.toString()) {
      return res.status(400).json({ error: "Parent folder not found in this project" });
    }

    if (await wouldCreateCycle(folder._id.toString(), parsed.data.parentFolderId)) {
      return res.status(400).json({ error: "Cannot move folder into its own subtree" });
    }
  }

  try {
    const updated = await FolderModel.findByIdAndUpdate(
      req.params.id,
      {
        ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
        ...(parsed.data.description !== undefined ? { description: parsed.data.description } : {}),
        ...(parsed.data.parentFolderId !== undefined ? { parentFolderId: parsed.data.parentFolderId || null } : {})
      },
      { new: true }
    );
    res.json(updated);
  } catch {
    res.status(500).json({ error: "Failed to update folder" });
  }
});

foldersRouter.delete("/:id", requireAuth, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: "Invalid folder id" });

  const currentUser = await getCurrentUser(req);
  if (!currentUser) return res.status(401).json({ error: "Authentication required" });

  const folder = await FolderModel.findById(req.params.id);
  if (!folder) return res.status(404).json({ error: "Folder not found" });

  const project = await ProjectModel.findById(folder.projectId);
  if (!project || !canManageProject(project, currentUser)) return res.status(403).json({ error: "Forbidden" });

  try {
    const deleteFolderRecursive = async (folderId: string) => {
      const subfolders = await FolderModel.find({ parentFolderId: folderId });
      for (const subfolder of subfolders) {
        await deleteFolderRecursive(subfolder._id.toString());
      }
      await ScenarioModel.deleteMany({ parentFolderId: folderId });
      await FolderModel.findByIdAndDelete(folderId);
    };

    await deleteFolderRecursive(req.params.id);
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Failed to delete folder" });
  }
});

foldersRouter.patch("/:id/move", requireAuth, async (req, res) => {
  const moveSchema = z.object({
    parentFolderId: z.string().nullable()
  });

  const parsed = moveSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: "Invalid folder id" });

  const currentUser = await getCurrentUser(req);
  if (!currentUser) return res.status(401).json({ error: "Authentication required" });

  const folder = await FolderModel.findById(req.params.id);
  if (!folder) return res.status(404).json({ error: "Folder not found" });

  const project = await ProjectModel.findById(folder.projectId);
  if (!project || !canManageProject(project, currentUser)) return res.status(403).json({ error: "Forbidden" });

  if (parsed.data.parentFolderId === folder._id.toString()) {
    return res.status(400).json({ error: "Cannot move folder to itself" });
  }

  if (parsed.data.parentFolderId) {
    if (!mongoose.isValidObjectId(parsed.data.parentFolderId)) return res.status(400).json({ error: "Invalid parent folder id" });
    const parentFolder = await FolderModel.findById(parsed.data.parentFolderId);
    if (!parentFolder || parentFolder.projectId.toString() !== folder.projectId.toString()) {
      return res.status(400).json({ error: "Parent folder not found in this project" });
    }

    if (await wouldCreateCycle(folder._id.toString(), parsed.data.parentFolderId)) {
      return res.status(400).json({ error: "Cannot move folder into its own subtree" });
    }
  }

  try {
    const updated = await FolderModel.findByIdAndUpdate(
      req.params.id,
      { parentFolderId: parsed.data.parentFolderId || null },
      { new: true }
    );
    res.json(updated);
  } catch {
    res.status(500).json({ error: "Failed to move folder" });
  }
});

export default foldersRouter;
