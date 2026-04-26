import "dotenv/config";
import mongoose from "mongoose";
import { connectDb } from "../lib/db.js";
import { UserModel } from "../lib/models.js";

function normalizeUsernamePart(value: string) {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

  return normalized || "user";
}

function baseUsernameForUser(user: { name?: string; email: string }) {
  const nameBase = normalizeUsernamePart(user.name || "");
  if (nameBase && nameBase !== "user") {
    return nameBase;
  }

  const emailBase = normalizeUsernamePart(user.email.split("@")[0] || "");
  return emailBase || "user";
}

async function uniqueUsername(base: string, taken: Set<string>) {
  let candidate = base;
  let suffix = 1;

  while (taken.has(candidate) || (await UserModel.exists({ username: candidate }))) {
    candidate = `${base}_${suffix}`;
    suffix += 1;
  }

  taken.add(candidate);
  return candidate;
}

async function run() {
  await connectDb();

  const users = await UserModel.find().sort({ createdAt: 1 }).select({ name: 1, email: 1, username: 1 });
  const seen = new Set<string>();
  let updatedCount = 0;

  for (const user of users) {
    const currentUsername = typeof user.username === "string" ? user.username.trim().toLowerCase() : "";

    if (currentUsername && !seen.has(currentUsername)) {
      seen.add(currentUsername);
      continue;
    }

    const nextUsername = await uniqueUsername(baseUsernameForUser(user), seen);
    user.username = nextUsername;
    await user.save();
    updatedCount += 1;
    console.log(`Updated ${user.email} -> ${nextUsername}`);
  }

  console.log(`Backfill complete. Updated ${updatedCount} user(s).`);
}

run()
  .catch((error) => {
    console.error("Username backfill failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
