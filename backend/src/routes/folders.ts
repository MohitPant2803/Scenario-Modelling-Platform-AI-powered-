import { Router } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import { ProjectModel, FolderModel, ScenarioModel } from "../lib/models.js";
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

// Get folder tree for a project
foldersRouter.get("/project/:projectId/tree", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.projectId)) return res.status(400).json({ error: "Invalid project id" });
  
  try {
    // Get all folders and scenarios for this project
    const folders = await FolderModel.find({ projectId: req.params.projectId }).lean();
    const scenarios = await ScenarioModel.find({ projectId: req.params.projectId, parentFolderId: null }).lean();
    
    res.json({ folders, scenarios });
  } catch (e) {
    res.status(500).json({ error: "Failed to fetch folder tree" });
  }
});

// Get children of a folder (both subfolders and scenarios)
foldersRouter.get("/:folderId/contents", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.folderId)) return res.status(400).json({ error: "Invalid folder id" });
  
  try {
    const subfolders = await FolderModel.find({ parentFolderId: req.params.folderId }).lean();
    const scenarios = await ScenarioModel.find({ parentFolderId: req.params.folderId }).lean();
    
    res.json({ folders: subfolders, scenarios });
  } catch (e) {
    res.status(500).json({ error: "Failed to fetch folder contents" });
  }
});

// Create a new folder
foldersRouter.post("/project/:projectId", requireAuth, async (req, res) => {
  const parsed = createFolderSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  if (!mongoose.isValidObjectId(req.params.projectId)) return res.status(400).json({ error: "Invalid project id" });
  
  const project = await ProjectModel.findById(req.params.projectId);
  if (!project) return res.status(404).json({ error: "Project not found" });
  if (project.creatorId.toString() !== req.session.userId) return res.status(403).json({ error: "Forbidden" });

  // Validate parent folder if provided
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
  } catch (e) {
    res.status(500).json({ error: "Failed to create folder" });
  }
});

// Update a folder
foldersRouter.patch("/:id", requireAuth, async (req, res) => {
  const parsed = updateFolderSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: "Invalid folder id" });
  
  const folder = await FolderModel.findById(req.params.id);
  if (!folder) return res.status(404).json({ error: "Folder not found" });

  const project = await ProjectModel.findById(folder.projectId);
  if (!project || project.creatorId.toString() !== req.session.userId) return res.status(403).json({ error: "Forbidden" });

  // Validate new parent folder if provided
  if (parsed.data.parentFolderId && parsed.data.parentFolderId !== null) {
    if (!mongoose.isValidObjectId(parsed.data.parentFolderId)) return res.status(400).json({ error: "Invalid parent folder id" });
    
    // Check for circular reference
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
        ...(parsed.data.name && { name: parsed.data.name }),
        ...(parsed.data.description && { description: parsed.data.description }),
        ...(parsed.data.parentFolderId !== undefined && { parentFolderId: parsed.data.parentFolderId || null })
      },
      { new: true }
    );
    res.json(updated);
  } catch (e) {
    res.status(500).json({ error: "Failed to update folder" });
  }
});

// Delete a folder and all its contents (recursive)
foldersRouter.delete("/:id", requireAuth, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: "Invalid folder id" });
  
  const folder = await FolderModel.findById(req.params.id);
  if (!folder) return res.status(404).json({ error: "Folder not found" });

  const project = await ProjectModel.findById(folder.projectId);
  if (!project || project.creatorId.toString() !== req.session.userId) return res.status(403).json({ error: "Forbidden" });

  try {
    // Recursive delete: remove all subfolders and scenarios
    const deleteFolderRecursive = async (folderId: string) => {
      // Get all subfolders
      const subfolders = await FolderModel.find({ parentFolderId: folderId });
      for (const subfolder of subfolders) {
        await deleteFolderRecursive(subfolder._id.toString());
      }
      // Delete all scenarios in this folder
      await ScenarioModel.deleteMany({ parentFolderId: folderId });
      // Delete the folder itself
      await FolderModel.findByIdAndDelete(folderId);
    };

    await deleteFolderRecursive(req.params.id);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: "Failed to delete folder" });
  }
});

// Move a folder to a different parent
foldersRouter.patch("/:id/move", requireAuth, async (req, res) => {
  const moveSchema = z.object({
    parentFolderId: z.string().nullable()
  });

  const parsed = moveSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: "Invalid folder id" });
  
  const folder = await FolderModel.findById(req.params.id);
  if (!folder) return res.status(404).json({ error: "Folder not found" });

  const project = await ProjectModel.findById(folder.projectId);
  if (!project || project.creatorId.toString() !== req.session.userId) return res.status(403).json({ error: "Forbidden" });

  // Check for circular reference
  if (parsed.data.parentFolderId === folder._id.toString()) {
    return res.status(400).json({ error: "Cannot move folder to itself" });
  }

  // Validate new parent folder if provided
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
  } catch (e) {
    res.status(500).json({ error: "Failed to move folder" });
  }
});

export default foldersRouter;
