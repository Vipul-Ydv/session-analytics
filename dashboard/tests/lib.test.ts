import { describe, expect, it } from "vitest";
import { toHeatPoint, typicalWidth } from "@/lib/heatmap";
import { formatOffset, formatDuration, shortId } from "@/lib/format";

describe("toHeatPoint", () => {
  it("places a click by its share of the recorded page size", () => {
    const p = toHeatPoint({ x: 640, y: 1000, page_w: 1280, page_h: 2000, viewport_w: 1280, viewport_h: 720 }, { width: 800, height: 1500 });
    expect(p).toEqual({ left: 400, top: 750 });
  });

  it("lines up clicks from different screen widths at the same relative spot", () => {
    const phone = toHeatPoint({ x: 195, y: 500, page_w: 390, page_h: 1000 }, { width: 1000, height: 3000 });
    const laptop = toHeatPoint({ x: 720, y: 1500, page_w: 1440, page_h: 3000 }, { width: 1000, height: 3000 });
    expect(phone).toEqual(laptop);
  });

  it("falls back to viewport size when page size is missing", () => {
    expect(toHeatPoint({ x: 100, y: 50, viewport_w: 200, viewport_h: 100 }, { width: 400, height: 200 })).toEqual({ left: 200, top: 100 });
  });

  it("uses raw coordinates when no size was recorded, and clamps inside the preview", () => {
    expect(toHeatPoint({ x: 50, y: 60 }, { width: 400, height: 300 })).toEqual({ left: 50, top: 60 });
    expect(toHeatPoint({ x: 5000, y: 9000, page_w: 1000, page_h: 1000 }, { width: 400, height: 300 })).toEqual({ left: 400, top: 300 });
  });
});

describe("format helpers", () => {
  it("formats the time since the first event", () => {
    expect(formatOffset("2026-10-12T10:00:00Z", "2026-10-12T10:00:00Z")).toBe("+0:00");
    expect(formatOffset("2026-10-12T10:00:00Z", "2026-10-12T10:01:05Z")).toBe("+1:05");
    expect(formatOffset("2026-10-12T10:00:00Z", "2026-10-12T11:02:03Z")).toBe("+62:03");
  });

  it("formats a session duration in plain words", () => {
    expect(formatDuration("2026-10-12T10:00:00Z", "2026-10-12T10:00:00Z")).toBe("under 1 s");
    expect(formatDuration("2026-10-12T10:00:00Z", "2026-10-12T10:00:42Z")).toBe("42 s");
    expect(formatDuration("2026-10-12T10:00:00Z", "2026-10-12T10:03:10Z")).toBe("3 min 10 s");
  });

  it("shortens session ids for display", () => {
    expect(shortId("0f8e2a6c-1b2d-4e3f-9a8b-7c6d5e4f3a2b")).toBe("0f8e2a6c");
    expect(shortId("short")).toBe("short");
  });
});

describe("typicalWidth", () => {
  it("picks the page width most clicks were recorded at", () => {
    const at = (page_w: number) => ({ x: 1, y: 1, page_w });
    expect(typicalWidth([at(1024), at(1440), at(1024), at(390)])).toBe(1024);
  });
  it("falls back to viewport width, then to 1280, and stays within 320-1920", () => {
    expect(typicalWidth([{ x: 1, y: 1, viewport_w: 800 }])).toBe(800);
    expect(typicalWidth([{ x: 1, y: 1 }])).toBe(1280);
    expect(typicalWidth([])).toBe(1280);
    expect(typicalWidth([{ x: 1, y: 1, page_w: 4000 }])).toBe(1920);
    expect(typicalWidth([{ x: 1, y: 1, page_w: 200 }])).toBe(320);
  });
});
