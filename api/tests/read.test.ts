import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { EventModel } from "../src/models/event.js";
import { useTestDb } from "./helpers.js";

useTestDb();
const app = createApp();

const HOME = "https://shop.example/";
const PRODUCTS = "https://shop.example/products";
const t = (s: number) => new Date(Date.UTC(2026, 9, 12, 10, 0, s));
const click = (session_id: string, page_url: string, s: number, x: number, y: number) => ({
  session_id, type: "click", page_url, timestamp: t(s), x, y, viewport_w: 1280, viewport_h: 720, page_w: 1280, page_h: 2000,
});

beforeEach(async () => {
  await EventModel.insertMany([
    // Session A: older, 4 events across 2 pages (inserted out of order on purpose)
    click("A", HOME, 20, 100, 200),
    { session_id: "A", type: "page_view", page_url: HOME, timestamp: t(0) },
    { session_id: "A", type: "page_view", page_url: PRODUCTS, timestamp: t(30) },
    click("A", PRODUCTS, 40, 600, 900),
    // Session B: newer, 2 events
    { session_id: "B", type: "page_view", page_url: PRODUCTS, timestamp: t(100) },
    click("B", PRODUCTS, 110, 610, 910),
  ]);
});

describe("GET /api/sessions", () => {
  it("lists sessions newest first with event counts, time range and pages", async () => {
    const res = await request(app).get("/api/sessions");
    expect(res.status).toBe(200);
    expect(res.body.sessions).toEqual([
      {
        session_id: "B", total_events: 2, page_views: 1, clicks: 1,
        first_seen: t(100).toISOString(), last_seen: t(110).toISOString(), pages: [PRODUCTS],
      },
      {
        session_id: "A", total_events: 4, page_views: 2, clicks: 2,
        first_seen: t(0).toISOString(), last_seen: t(40).toISOString(), pages: [HOME, PRODUCTS],
      },
    ]);
    expect(res.body.total).toBe(2);
  });

  it("supports limit and skip for pagination", async () => {
    const res = await request(app).get("/api/sessions?limit=1&skip=1");
    expect(res.body.sessions.map((s: { session_id: string }) => s.session_id)).toEqual(["A"]);
    expect(res.body.total).toBe(2);
  });

  it("returns an empty list when there is no data", async () => {
    await EventModel.deleteMany({});
    const res = await request(app).get("/api/sessions");
    expect(res.body).toEqual({ sessions: [], total: 0 });
  });
});

describe("GET /api/sessions/:id/events", () => {
  it("returns the session's events in time order (the user journey)", async () => {
    const res = await request(app).get("/api/sessions/A/events");
    expect(res.status).toBe(200);
    expect(res.body.events.map((e: { type: string; timestamp: string }) => [e.type, e.timestamp])).toEqual([
      ["page_view", t(0).toISOString()],
      ["click", t(20).toISOString()],
      ["page_view", t(30).toISOString()],
      ["click", t(40).toISOString()],
    ]);
    expect(res.body.events[1]).toMatchObject({ x: 100, y: 200, page_url: HOME });
  });

  it("returns 404 for an unknown session", async () => {
    const res = await request(app).get("/api/sessions/nope/events");
    expect(res.status).toBe(404);
  });
});

describe("GET /api/pages", () => {
  it("lists pages that have clicks, most clicked first", async () => {
    const res = await request(app).get("/api/pages");
    expect(res.body.pages).toEqual([
      { page_url: PRODUCTS, clicks: 2 },
      { page_url: HOME, clicks: 1 },
    ]);
  });
});

describe("GET /api/heatmap", () => {
  it("returns only click points for the requested page", async () => {
    const res = await request(app).get("/api/heatmap").query({ page_url: PRODUCTS });
    expect(res.status).toBe(200);
    expect(res.body.page_url).toBe(PRODUCTS);
    expect(res.body.clicks).toHaveLength(2);
    expect(res.body.clicks[0]).toEqual({ x: 600, y: 900, viewport_w: 1280, viewport_h: 720, page_w: 1280, page_h: 2000 });
  });

  it("matches the page even when the query string includes ?query or #hash", async () => {
    const res = await request(app).get("/api/heatmap").query({ page_url: `${PRODUCTS}?utm=x#top` });
    expect(res.body.clicks).toHaveLength(2);
  });

  it("requires a valid page_url", async () => {
    expect((await request(app).get("/api/heatmap")).status).toBe(400);
    expect((await request(app).get("/api/heatmap").query({ page_url: "nope" })).status).toBe(400);
  });
});
