import mongoose from "mongoose";
import { EventModel } from "./models/event.js";

let connecting: Promise<typeof mongoose> | null = null;

/**
 * Opens one shared MongoDB connection and reuses it across requests.
 * On Vercel the function instance stays warm between requests, so this runs once per instance.
 */
export function connectDb(uri = process.env.MONGODB_URI): Promise<typeof mongoose> {
  if (mongoose.connection.readyState === 1) return Promise.resolve(mongoose);
  if (!uri) return Promise.reject(new Error("MONGODB_URI is not set"));
  if (!connecting) {
    connecting = mongoose
      .connect(uri, { serverSelectionTimeoutMS: 8000, maxPoolSize: 5 })
      .then(async (m) => {
        // Creates missing indexes only (never drops any); a no-op once they exist.
        await EventModel.createIndexes();
        return m;
      })
      .catch((err) => {
        connecting = null; // let the next request retry
        throw err;
      });
  }
  return connecting;
}
