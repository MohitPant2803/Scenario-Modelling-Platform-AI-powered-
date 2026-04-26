import "express-session";

declare module "express-session" {
  interface SessionData {
    userId?: string;
    userRole?: "super_admin" | "admin" | "creator";
  }
}
