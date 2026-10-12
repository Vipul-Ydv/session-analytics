import express from "express";
import { createApp } from "./create-app.js";
import { connectDb } from "./db.js";

// Vercel's Express integration looks for a file that imports express and default-exports the app.
const app = express();
app.use(createApp({ beforeRequest: () => connectDb() }));

export default app;
