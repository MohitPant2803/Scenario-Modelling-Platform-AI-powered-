import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { UserModel } from "../lib/models.js";

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
  const user = await UserModel.create({ name, email, passwordHash });

  req.session.userId = user._id.toString();
  return res.status(201).json({ id: user._id.toString(), name: user.name, email: user.email });
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

  req.session.userId = user._id.toString();
  return res.json({ id: user._id.toString(), name: user.name, email: user.email });
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

  const user = await UserModel.findById(req.session.userId).select({ name: 1, email: 1 });
  if (!user) return res.json(null);

  return res.json({ id: user._id.toString(), name: user.name, email: user.email });
});

export default authRouter;
