import { Router } from "express";
import { z } from "zod";
import { EventModel } from "../models/event.js";
import { normalizePageUrl } from "../validation.js";

export const readRouter = Router();

const MAX_HEATMAP_POINTS = 5000;

const paging = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  skip: z.coerce.number().int().min(0).default(0),
});

const isClick = { $cond: [{ $eq: ["$type", "click"] }, 1, 0] };
const isPageView = { $cond: [{ $eq: ["$type", "page_view"] }, 1, 0] };

/** Sessions with event counts, newest activity first. */
readRouter.get("/sessions", async (req, res) => {
  const parsed = paging.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: "limit must be 1-200 and skip must be 0 or more" });
  const { limit, skip } = parsed.data;

  const [result] = await EventModel.aggregate([
    {
      $group: {
        _id: "$session_id",
        total_events: { $sum: 1 },
        page_views: { $sum: isPageView },
        clicks: { $sum: isClick },
        first_seen: { $min: "$timestamp" },
        last_seen: { $max: "$timestamp" },
        pages: { $addToSet: "$page_url" },
      },
    },
    { $sort: { last_seen: -1, _id: 1 } },
    {
      $facet: {
        sessions: [
          { $skip: skip },
          { $limit: limit },
          {
            $project: {
              _id: 0,
              session_id: "$_id",
              total_events: 1,
              page_views: 1,
              clicks: 1,
              first_seen: 1,
              last_seen: 1,
              pages: { $sortArray: { input: "$pages", sortBy: 1 } },
            },
          },
        ],
        total: [{ $count: "n" }],
      },
    },
  ]);

  return res.json({ sessions: result?.sessions ?? [], total: result?.total[0]?.n ?? 0 });
});

/** One session's events in order: the user journey. */
readRouter.get("/sessions/:id/events", async (req, res) => {
  const events = await EventModel.find({ session_id: req.params.id }, { _id: 0, created_at: 0 })
    .sort({ timestamp: 1, _id: 1 })
    .limit(10_000)
    .lean();
  if (events.length === 0) return res.status(404).json({ error: "Session not found" });
  return res.json({ session_id: req.params.id, events });
});

/** Pages that have click data, for the heatmap page picker. */
readRouter.get("/pages", async (_req, res) => {
  const pages = await EventModel.aggregate([
    { $match: { type: "click" } },
    { $group: { _id: "$page_url", clicks: { $sum: 1 } } },
    { $sort: { clicks: -1, _id: 1 } },
    { $project: { _id: 0, page_url: "$_id", clicks: 1 } },
  ]);
  return res.json({ pages });
});

/** Click points for one page. */
readRouter.get("/heatmap", async (req, res) => {
  const raw = typeof req.query.page_url === "string" ? req.query.page_url : "";
  let pageUrl: string;
  try {
    pageUrl = normalizePageUrl(raw);
  } catch {
    return res.status(400).json({ error: "page_url query parameter must be an absolute URL" });
  }
  const clicks = await EventModel.find(
    { page_url: pageUrl, type: "click" },
    { _id: 0, x: 1, y: 1, viewport_w: 1, viewport_h: 1, page_w: 1, page_h: 1 },
  )
    .sort({ timestamp: 1 })
    .limit(MAX_HEATMAP_POINTS)
    .lean();
  return res.json({ page_url: pageUrl, clicks, truncated: clicks.length === MAX_HEATMAP_POINTS });
});
