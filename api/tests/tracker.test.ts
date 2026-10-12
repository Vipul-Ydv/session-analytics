// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const SOURCE = readFileSync(resolve(process.cwd(), "public/tracker.js"), "utf8");
const ENDPOINT = "https://api.example/api/events";

type Sent = { url: string; events: Record<string, unknown>[] };

function install(attrs: Record<string, string> = { "data-endpoint": ENDPOINT }) {
  const s = document.createElement("script");
  s.setAttribute("src", "https://api.example/tracker.js");
  for (const [k, v] of Object.entries(attrs)) s.setAttribute(k, v);
  document.head.appendChild(s);
  // Run the tracker source as if the browser had loaded it.
  window.eval(SOURCE);
}

let beacons: Sent[];

async function readBody(body: unknown): Promise<string> {
  if (typeof body === "string") return body;
  return await (body as Blob).text();
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setInterval", "clearInterval", "setTimeout", "clearTimeout", "Date"] });
  vi.setSystemTime(new Date("2026-10-12T10:00:00Z"));
  localStorage.clear();
  document.head.innerHTML = "";
  delete (window as unknown as { cfTracker?: unknown }).cfTracker;
  beacons = [];
  const pending: Promise<void>[] = [];
  Object.defineProperty(navigator, "sendBeacon", {
    configurable: true,
    value: vi.fn((url: string, body: Blob) => {
      pending.push(readBody(body).then((text) => void beacons.push({ url, events: JSON.parse(text).events })));
      expect(body.type).toBe("text/plain;charset=utf-8");
      return true;
    }),
  });
  (globalThis as unknown as { __pending: Promise<void>[] }).__pending = pending;
});

afterEach(() => {
  uninstall();
  vi.useRealTimers();
});

async function settle() {
  await Promise.all((globalThis as unknown as { __pending: Promise<void>[] }).__pending);
}

type Tracker = { flush(): void; sessionId(): string; destroy(): void };
const tracker = () => (window as unknown as { cfTracker: Tracker }).cfTracker;
const uninstall = () => {
  (window as unknown as { cfTracker?: Tracker }).cfTracker?.destroy();
  delete (window as unknown as { cfTracker?: unknown }).cfTracker;
};

describe("tracker.js", () => {
  it("sends a page_view on load with a session id, URL and timestamp", async () => {
    install();
    vi.advanceTimersByTime(2000);
    await settle();
    expect(beacons).toHaveLength(1);
    expect(beacons[0].url).toBe(ENDPOINT);
    const [ev] = beacons[0].events;
    expect(ev).toMatchObject({ type: "page_view", page_url: location.href, timestamp: "2026-10-12T10:00:00.000Z" });
    expect(ev.session_id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("records clicks with page coordinates, viewport and page size", async () => {
    install();
    document.body.dispatchEvent(new MouseEvent("click", { bubbles: true, clientX: 120, clientY: 340 }));
    tracker().flush();
    await settle();
    const clickEv = beacons[0].events.find((e) => e.type === "click");
    expect(clickEv).toMatchObject({ type: "click", x: 120, y: 340, viewport_w: window.innerWidth, viewport_h: window.innerHeight });
    expect(typeof clickEv?.page_w).toBe("number");
    expect(typeof clickEv?.page_h).toBe("number");
  });

  it("keeps the same session across page loads within 30 minutes", () => {
    install();
    const first = tracker().sessionId();
    uninstall();
    vi.setSystemTime(new Date("2026-10-12T10:20:00Z"));
    install();
    expect(tracker().sessionId()).toBe(first);
  });

  it("starts a new session after 30 minutes of inactivity", () => {
    install();
    const first = tracker().sessionId();
    vi.setSystemTime(new Date("2026-10-12T10:31:00Z"));
    document.body.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(tracker().sessionId()).not.toBe(first);
  });

  it("flushes queued events when the page is hidden", async () => {
    install();
    window.dispatchEvent(new Event("pagehide"));
    await settle();
    expect(beacons).toHaveLength(1);
  });

  it("does not send an empty batch", async () => {
    install();
    tracker().flush();
    tracker().flush();
    await settle();
    expect(beacons).toHaveLength(1);
  });

  it("falls back to fetch with keepalive when sendBeacon is unavailable", async () => {
    Object.defineProperty(navigator, "sendBeacon", { configurable: true, value: undefined });
    const fetchMock = vi.fn(async () => new Response(null, { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);
    install();
    tracker().flush();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(ENDPOINT);
    expect(init).toMatchObject({ method: "POST", keepalive: true });
    expect(JSON.parse(init.body as string).events[0].type).toBe("page_view");
    vi.unstubAllGlobals();
  });

  it("derives the endpoint from the script URL when data-endpoint is missing", async () => {
    install({});
    tracker().flush();
    await settle();
    expect(beacons[0].url).toBe("https://api.example/api/events");
  });

  it("stops tracking after destroy()", async () => {
    install();
    tracker().destroy();
    document.body.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    window.dispatchEvent(new Event("pagehide"));
    vi.advanceTimersByTime(10_000);
    await settle();
    expect(beacons).toHaveLength(1);
    expect(beacons[0].events.map((e) => e.type)).toEqual(["page_view"]);
  });

  it("only installs once if the script is included twice", async () => {
    install();
    window.eval(SOURCE);
    tracker().flush();
    await settle();
    expect(beacons[0].events.filter((e) => e.type === "page_view")).toHaveLength(1);
  });
});
