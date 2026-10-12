import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { EventModel } from "../src/models/event.js";
import { useTestDb } from "./helpers.js";

useTestDb();
const app = createApp();

const pageView = {
  session_id: "s-1",
  type: "page_view",
  page_url: "https://shop.example/products?ref=ad#top",
  timestamp: "2026-10-12T10:00:00.000Z",
};
const click = {
  session_id: "s-1",
  type: "click",
  page_url: "https://shop.example/products",
  timestamp: "2026-10-12T10:00:05.000Z",
  x: 640,
  y: 320,
  viewport_w: 1280,
  viewport_h: 720,
  page_w: 1280,
  page_h: 2400,
};

describe("GET /api/health", () => {
  it("reports ok", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });
});

describe("POST /api/events", () => {
  it("stores a single event and strips query and hash from the page URL", async () => {
    const res = await request(app).post("/api/events").send(pageView);
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ stored: 1 });
    const saved = await EventModel.findOne().lean();
    expect(saved?.page_url).toBe("https://shop.example/products");
    expect(saved?.timestamp.toISOString()).toBe(pageView.timestamp);
  });

  it("stores a batch of events", async () => {
    const res = await request(app).post("/api/events").send({ events: [pageView, click] });
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ stored: 2 });
    expect(await EventModel.countDocuments()).toBe(2);
  });

  it("accepts a text/plain JSON body (sent by navigator.sendBeacon)", async () => {
    const res = await request(app)
      .post("/api/events")
      .set("Content-Type", "text/plain;charset=UTF-8")
      .send(JSON.stringify({ events: [click] }));
    expect(res.status).toBe(201);
    const saved = await EventModel.findOne().lean();
    expect(saved).toMatchObject({ type: "click", x: 640, y: 320, page_h: 2400 });
  });

  it("accepts millisecond timestamps", async () => {
    const res = await request(app).post("/api/events").send({ ...pageView, timestamp: Date.parse(pageView.timestamp) });
    expect(res.status).toBe(201);
  });

  it.each([
    ["unknown event type", { ...pageView, type: "scroll" }],
    ["missing session_id", { ...pageView, session_id: "" }],
    ["invalid page URL", { ...pageView, page_url: "not a url" }],
    ["click without coordinates", { ...click, x: undefined }],
    ["negative coordinates", { ...click, y: -5 }],
    ["bad timestamp", { ...pageView, timestamp: "yesterday" }],
  ])("rejects %s with 400 and stores nothing", async (_label, body) => {
    const res = await request(app).post("/api/events").send(body);
    expect(res.status).toBe(400);
    expect(res.body.error).toBeTruthy();
    expect(await EventModel.countDocuments()).toBe(0);
  });

  it("rejects malformed text/plain bodies", async () => {
    const res = await request(app).post("/api/events").set("Content-Type", "text/plain").send("{not json");
    expect(res.status).toBe(400);
  });

  it("rejects batches over 100 events", async () => {
    const res = await request(app).post("/api/events").send({ events: Array.from({ length: 101 }, () => pageView) });
    expect(res.status).toBe(400);
  });

  it("allows cross-origin requests from any site", async () => {
    const res = await request(app).options("/api/events").set("Origin", "https://any-shop.example").set("Access-Control-Request-Method", "POST");
    expect(res.headers["access-control-allow-origin"]).toBe("*");
  });
});
