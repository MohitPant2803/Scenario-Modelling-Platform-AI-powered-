import { Router } from "express";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { z } from "zod";
import {
  getCurrentUser,
  isAdmin,
  isProtectedSuperAdminUser,
  isSuperAdmin,
  resolveUserRole,
  type UserRole
} from "../lib/access.js";
import { USER_ROLES, UserModel } from "../lib/models.js";
import { requireRole } from "../middleware/requireRole.js";

const authRouter = Router();

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8)
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

const promoteSchema = z.object({
  role: z.enum(["admin", "creator"]).default("admin")
});

function serializeUser(user: { _id: mongoose.Types.ObjectId; name: string; email: string; role?: string | null }) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: resolveUserRole(user.role as UserRole | "writer" | "user" | undefined, user._id.toString())
  };
}

authRouter.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const { name, email, password } = parsed.data;
  const existing = await UserModel.findOne({ email });
  if (existing) {
    return res.status(409).json({ error: "Email already in use" });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await UserModel.create({ name, email, passwordHash, role: "creator" });
  const resolvedRole = resolveUserRole(user.role, user._id.toString());

  req.session.userId = user._id.toString();
  req.session.userRole = resolvedRole;
  return res.status(201).json({ id: user._id.toString(), name: user.name, email: user.email, role: resolvedRole });
});

authRouter.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const user = await UserModel.findOne({ email: parsed.data.email });
  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const isValid = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!isValid) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const resolvedRole = resolveUserRole(user.role, user._id.toString());
  req.session.userId = user._id.toString();
  req.session.userRole = resolvedRole;
  return res.json({ id: user._id.toString(), name: user.name, email: user.email, role: resolvedRole });
});

authRouter.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

authRouter.get("/me", async (req, res) => {
  if (!req.session.userId) {
    return res.json(null);
  }

  const user = await UserModel.findById(req.session.userId).select({ name: 1, email: 1, role: 1 });
  if (!user) return res.json(null);

  return res.json(serializeUser(user));
});

authRouter.get("/users", requireRole("super_admin"), async (_req, res) => {
  const users = await UserModel.find().sort({ createdAt: 1 }).select({ name: 1, email: 1, role: 1 });
  return res.json(users.map(serializeUser));
});

authRouter.get("/creators", requireRole("admin", "super_admin"), async (_req, res) => {
  const users = await UserModel.find().sort({ createdAt: 1 }).select({ name: 1, email: 1, role: 1 });
  return res.json(users.map(serializeUser).filter((user) => user.role === "creator"));
});

authRouter.post("/promote/:id", requireRole("super_admin"), async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ error: "Invalid user id" });
  }

  const parsed = promoteSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const targetUser = await UserModel.findById(req.params.id);
  if (!targetUser) {
    return res.status(404).json({ error: "User not found" });
  }

  if (isProtectedSuperAdminUser(targetUser._id.toString())) {
    return res.status(400).json({ error: "The configured super admin user cannot be changed here." });
  }

  targetUser.role = parsed.data.role;
  await targetUser.save();

  return res.json(serializeUser(targetUser));
});

authRouter.post("/demote/:id", requireRole("super_admin"), async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ error: "Invalid user id" });
  }

  const targetUser = await UserModel.findById(req.params.id);
  if (!targetUser) {
    return res.status(404).json({ error: "User not found" });
  }

  if (isProtectedSuperAdminUser(targetUser._id.toString())) {
    return res.status(400).json({ error: "The configured super admin user cannot be changed here." });
  }

  targetUser.role = "creator";
  await targetUser.save();

  return res.json(serializeUser(targetUser));
});

authRouter.patch("/users/:id/role", requireRole("super_admin"), async (req, res) => {
  const currentUser = await getCurrentUser(req);
  if (!isSuperAdmin(currentUser)) {
    return res.status(403).json({ error: "Forbidden" });
  }

  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ error: "Invalid user id" });
  }

  const parsed = z.object({ role: z.enum(USER_ROLES) }).safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const targetUser = await UserModel.findById(req.params.id);
  if (!targetUser) {
    return res.status(404).json({ error: "User not found" });
  }

  if (isProtectedSuperAdminUser(targetUser._id.toString()) && parsed.data.role !== "super_admin") {
    return res.status(400).json({ error: "The configured super admin user cannot be changed here." });
  }

  targetUser.role = parsed.data.role === "super_admin" ? "creator" : parsed.data.role;
  await targetUser.save();

  return res.json(serializeUser(targetUser));
});

export default authRouter;
