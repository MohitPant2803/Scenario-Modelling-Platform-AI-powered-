import app from "../src/app.js";
import { connectDb } from "../src/lib/db.js";

const dbReady = connectDb();

export default async function handler(req: any, res: any) {
  await dbReady;
  return app(req, res);
}
