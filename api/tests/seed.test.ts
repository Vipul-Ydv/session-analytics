import { describe, expect, it } from "vitest";
import { generateSessions, mulberry32 } from "../scripts/seed-data.js";
import { eventSchema } from "../src/validation.js";

const SITE = "https://dashboard.example";
const NOW = Date.parse("2026-10-12T12:00:00Z");

describe("seed data", () => {
  const events = generateSessions({ siteUrl: SITE, now: NOW, sessions: 40, rand: mulberry32(7) });

  it("creates the requested number of sessions, each starting with a page view", () => {
    const bySession = new Map<string, typeof events>();
    for (const e of events) bySession.set(e.session_id, [...(bySession.get(e.session_id) ?? []), e]);
    expect(bySession.size).toBe(40);
    for (const evs of bySession.values()) {
      expect(evs[0].type).toBe("page_view");
      const times = evs.map((e) => Date.parse(e.timestamp));
      expect(times).toEqual([...times].sort((a, b) => a - b));
    }
  });

  it("only produces events the API would accept, on the demo shop pages, within the last 3 days", () => {
    for (const e of events) {
      expect(eventSchema.safeParse(e).success).toBe(true);
      expect(e.page_url.startsWith(`${SITE}/demo`)).toBe(true);
      const t = Date.parse(e.timestamp);
      expect(t).toBeLessThanOrEqual(NOW);
      expect(t).toBeGreaterThan(NOW - 3 * 24 * 3600 * 1000);
    }
  });

  it("is deterministic for the same random seed", () => {
    const again = generateSessions({ siteUrl: SITE, now: NOW, sessions: 40, rand: mulberry32(7) });
    expect(again).toEqual(events);
  });

  it("keeps clicks inside the recorded page", () => {
    for (const e of events.filter((ev) => ev.type === "click")) {
      expect(e.x).toBeLessThanOrEqual(e.page_w!);
      expect(e.y).toBeLessThanOrEqual(e.page_h!);
    }
  });
});
