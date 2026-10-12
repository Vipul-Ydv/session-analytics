import { Router } from "express";
import { EventModel } from "../models/event.js";
import { eventsPayload } from "../validation.js";

export const eventsRouter = Router();

eventsRouter.post("/", async (req, res) => {
  let body: unknown = req.body;
  // navigator.sendBeacon sends text/plain to avoid a CORS preflight, so parse it here.
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ error: "Body is not valid JSON" });
    }
  }
  const parsed = eventsPayload.safeParse(body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid event payload", issues: parsed.error.issues.slice(0, 5) });
  }
  await EventModel.insertMany(parsed.data, { ordered: false });
  return res.status(201).json({ stored: parsed.data.length });
});
