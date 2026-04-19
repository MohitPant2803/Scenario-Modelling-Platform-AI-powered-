import mongoose from "mongoose";

const mongoUri = process.env.MONGODB_URI;

if (!mongoUri) {
  throw new Error("MONGODB_URI is required in environment variables");
}

export async function connectDb() {
  if (mongoose.connection.readyState === 1) return;
  await mongoose.connect(mongoUri as string);
}
