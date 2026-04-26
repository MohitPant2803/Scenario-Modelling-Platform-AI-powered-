import type { Request } from "express";
import type mongoose from "mongoose";
import { UserModel } from "./models.js";

export type UserRole = "super_admin" | "admin" | "creator";
export type ProjectStatus = "draft" | "published";

export type CurrentUser = {
  _id: mongoose.Types.ObjectId;
  name: string;
  username: string;
  email: string;
  role: UserRole;
};

type LegacyUserRole = "admin" | "writer" | "user" | "super_admin" | "creator" | undefined | null;

type ProjectAccessShape = {
  creatorId: mongoose.Types.ObjectId | string | { _id?: mongoose.Types.ObjectId | string };
  status?: ProjectStatus;
};

export function superAdminUserId() {
  return String(process.env.SUPER_ADMIN_USER_ID || "").trim();
}

function isSuperAdminId(userId: string) {
  const configuredId = superAdminUserId();
  return Boolean(configuredId) && configuredId === userId;
}

function normalizeStoredRole(role: LegacyUserRole): UserRole {
  if (role === "super_admin" || role === "admin" || role === "creator") {
    return role;
  }

  if (role === "writer" || role === "user" || !role) {
    return "creator";
  }

  return "creator";
}

function creatorIdToString(creatorId: ProjectAccessShape["creatorId"]) {
  if (creatorId && typeof creatorId === "object" && "_id" in creatorId) {
    return String(creatorId._id);
  }

  return String(creatorId);
}

export function resolveUserRole(role: LegacyUserRole, userId: string) {
  if (isSuperAdminId(userId)) {
    return "super_admin" as const;
  }

  return normalizeStoredRole(role);
}

export async function getCurrentUser(req: Request) {
  if (!req.session.userId) {
    return null;
  }

  const user = await UserModel.findById(req.session.userId).select({ name: 1, email: 1, role: 1 }).lean<{
    _id: mongoose.Types.ObjectId;
    name: string;
    username: string;
    email: string;
    role?: LegacyUserRole;
  } | null>();

  return user
    ? {
        ...user,
        role: resolveUserRole(user.role, user._id.toString())
      }
    : null;
}

export function isSuperAdmin(user: CurrentUser | null) {
  return user?.role === "super_admin";
}

export function isAdmin(user: CurrentUser | null) {
  return user?.role === "admin" || user?.role === "super_admin";
}

export function isCreator(user: CurrentUser | null) {
  return user?.role === "creator";
}

export function ownsProject(project: ProjectAccessShape, user: CurrentUser | null) {
  return Boolean(user) && creatorIdToString(project.creatorId) === user!._id.toString();
}

export function canManageProject(project: ProjectAccessShape, user: CurrentUser | null) {
  return Boolean(user) && (isAdmin(user) || ownsProject(project, user));
}

export function canPublishProject(project: ProjectAccessShape, user: CurrentUser | null) {
  return canManageProject(project, user);
}

export function canReadProject(project: ProjectAccessShape, user: CurrentUser | null) {
  return (project.status ?? "published") === "published" || canManageProject(project, user);
}

export function workspaceProjectFilter(user: CurrentUser) {
  return { creatorId: user._id };
}

export function publishedProjectFilter() {
  return { $or: [{ status: "published" }, { status: { $exists: false } }] };
}

export function resolveProjectStatus(
  requestedStatus: ProjectStatus | undefined,
  user: CurrentUser,
  project: ProjectAccessShape
): ProjectStatus {
  if (!requestedStatus) {
    return project.status ?? "draft";
  }

  if (!canPublishProject(project, user)) {
    return project.status ?? "draft";
  }

  return requestedStatus;
}

export function isProtectedSuperAdminUser(userId: string) {
  return isSuperAdminId(userId);
}
