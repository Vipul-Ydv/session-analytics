/**
 * Fills the database with ~40 realistic demo-shop visits so the dashboard has data to show.
 *   npm run seed                      (uses MONGODB_URI from .env, SITE_URL defaults to http://localhost:3001)
 *   SITE_URL=https://your-dashboard.vercel.app npm run seed
 *   npm run seed -- --reset           (deletes existing events first)
 * SITE_URL must be the dashboard's address, so the heatmap can preview the demo pages.
 */
import mongoose from "mongoose";
import { connectDb } from "../src/db.js";
import { EventModel } from "../src/models/event.js";
import { eventSchema } from "../src/validation.js";
import { generateSessions, mulberry32 } from "./seed-data.js";

const siteUrl = process.env.SITE_URL ?? "http://localhost:3001";
const reset = process.argv.includes("--reset");

await connectDb();
if (reset) {
  const { deletedCount } = await EventModel.deleteMany({});
  console.log(`Deleted ${deletedCount} existing events.`);
}
const raw = generateSessions({ siteUrl, now: Date.now(), sessions: 40, rand: mulberry32(Date.now() % 100000) });
const events = raw.map((e) => eventSchema.parse(e));
await EventModel.insertMany(events);
console.log(`Inserted ${events.length} events in 40 sessions for ${siteUrl}/demo.`);
await mongoose.disconnect();
