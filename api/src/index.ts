import { createApp } from "./create-app.js";
import { connectDb } from "./db.js";

// Vercel's Express integration uses this default export as a single serverless function.
const app = createApp({ beforeRequest: () => connectDb() });

export default app;
