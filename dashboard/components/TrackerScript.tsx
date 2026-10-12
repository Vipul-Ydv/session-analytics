"use client";
import { useEffect } from "react";
import { API_URL } from "@/lib/api";

/**
 * Adds the tracker exactly like a customer site would: a <script> tag pointing at the API.
 * Skipped inside the dashboard's heatmap preview (an iframe), so previews don't create fake visits.
 */
export function TrackerScript() {
  useEffect(() => {
    if (window.self !== window.top) return;
    if (document.querySelector("script[data-cf-tracker]")) return;
    const s = document.createElement("script");
    s.src = `${API_URL}/tracker.js`;
    s.defer = true;
    s.setAttribute("data-endpoint", `${API_URL}/api/events`);
    s.setAttribute("data-cf-tracker", "");
    document.head.appendChild(s);
    // Leaving the demo shop for the dashboard is a client-side navigation, so stop tracking explicitly.
    return () => {
      (window as unknown as { cfTracker?: { destroy(): void } }).cfTracker?.destroy();
      s.remove();
    };
  }, []);
  return null;
}
