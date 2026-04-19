import "dotenv/config";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import session from "express-session";
import MongoStore from "connect-mongo";
import aiRouter from "./routes/ai.js";
import authRouter from "./routes/auth.js";
import foldersRouter from "./routes/folders.js";
import projectsRouter from "./routes/projects.js";
import scenariosRouter from "./routes/scenarios.js";

const app = express();
const isProduction = process.env.NODE_ENV === "production";
const allowedOrigins = (process.env.FRONTEND_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.set("trust proxy", 1);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error("CORS origin not allowed"));
    },
    credentials: true
  })
);
app.use(express.json({ limit: "12mb" }));
app.use(cookieParser());
app.use(
  session({
    secret: process.env.SESSION_SECRET || "dev-secret",
    store: MongoStore.create({
      mongoUrl: process.env.MONGODB_URI,
      ttl: 60 * 60 * 24 * 7
    }),
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

export default app;
