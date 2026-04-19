import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import session from "express-session";
import authRouter from "./routes/auth.js";
import foldersRouter from "./routes/folders.js";
import projectsRouter from "./routes/projects.js";
import scenariosRouter from "./routes/scenarios.js";
import aiRouter from "./routes/ai.js";
import { connectDb } from "./lib/db.js";

const app = express();
const port = Number(process.env.PORT || 4000);
const isProduction = process.env.NODE_ENV === "production";
const frontendOrigin = process.env.FRONTEND_ORIGIN || "http://localhost:5173";

app.set("trust proxy", 1);

app.use(
  cors({
    origin: frontendOrigin,
    credentials: true
  })
);
app.use(express.json({ limit: "12mb" }));
app.use(cookieParser());
app.use(
  session({
    secret: process.env.SESSION_SECRET || "dev-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: isProduction ? "none" : "lax",
      secure: isProduction,
      maxAge: 1000 * 60 * 60 * 24 * 7
    }
  })
);

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/auth", authRouter);
app.use("/folders", foldersRouter);
app.use("/projects", projectsRouter);
app.use("/scenarios", scenariosRouter);
app.use("/ai", aiRouter);

connectDb()
  .then(() => {
    app.listen(port, () => {
      console.log(`API server listening on http://localhost:${port}`);
    });
  })
  .catch((error) => {
    console.error("Failed to connect MongoDB", error);
    process.exit(1);
  });
