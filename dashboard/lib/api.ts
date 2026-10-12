export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000").replace(/\/$/, "");

export type SessionSummary = {
  session_id: string;
  total_events: number;
  page_views: number;
  clicks: number;
  first_seen: string;
  last_seen: string;
  pages: string[];
};

export type TrackedEvent = {
  session_id: string;
  type: "page_view" | "click";
  page_url: string;
  timestamp: string;
  x?: number;
  y?: number;
  viewport_w?: number;
  viewport_h?: number;
  page_w?: number;
  page_h?: number;
};

export type PageSummary = { page_url: string; clicks: number };
export type HeatmapClick = Required<Pick<TrackedEvent, "x" | "y">> & Pick<TrackedEvent, "viewport_w" | "viewport_h" | "page_w" | "page_h">;

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

async function get<T>(path: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { cache: "no-store" });
  } catch {
    throw new ApiError(`Can't reach the API at ${API_URL}. Check that it's running.`, 0);
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new ApiError(body?.error ?? `The API answered ${res.status}`, res.status);
  }
  return (await res.json()) as T;
}

export const api = {
  sessions: (limit = 50, skip = 0) => get<{ sessions: SessionSummary[]; total: number }>(`/api/sessions?limit=${limit}&skip=${skip}`),
  sessionEvents: (id: string) => get<{ session_id: string; events: TrackedEvent[] }>(`/api/sessions/${encodeURIComponent(id)}/events`),
  pages: () => get<{ pages: PageSummary[] }>("/api/pages"),
  heatmap: (pageUrl: string) => get<{ page_url: string; clicks: HeatmapClick[]; truncated: boolean }>(`/api/heatmap?page_url=${encodeURIComponent(pageUrl)}`),
};
