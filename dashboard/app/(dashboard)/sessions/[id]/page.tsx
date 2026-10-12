"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Suspense } from "react";
import { ErrorNote, Loading } from "@/components/States";
import { useApi } from "@/components/useApi";
import { api } from "@/lib/api";
import { formatDateTime, formatDuration, formatOffset, pathOf } from "@/lib/format";

function SessionJourney() {
  const { id } = useParams<{ id: string }>();
  const { data, error, loading, reload } = useApi(() => api.sessionEvents(id), id);
  const events = data?.events ?? [];
  const start = events[0]?.timestamp;
  const end = events[events.length - 1]?.timestamp;
  const errorText = error === "Session not found" ? "This session has no events." : error;

  return (
    <section>
      <Link href="/" className="text-sm text-accent hover:underline">
        Back to sessions
      </Link>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight">User journey</h1>
      <p className="mt-1 break-all font-mono text-sm text-muted">{id}</p>

      {errorText && (
        <div className="mt-6">
          <ErrorNote message={errorText} onRetry={reload} />
        </div>
      )}
      {loading && !data && <Loading what="events" />}

      {start && end && (
        <>
          <p className="mt-4 text-sm">
            {events.length} events over {formatDuration(start, end)}, starting {formatDateTime(start)}.
          </p>
          <ol className="mt-6 border-l-2 border-line">
            {events.map((e, i) => (
              <li key={`${e.timestamp}-${i}`} className="relative pb-5 pl-6 last:pb-0">
                <span
                  aria-hidden="true"
                  className={`absolute -left-[7px] top-1.5 size-3 rounded-full border-2 border-surface ${e.type === "click" ? "bg-click" : "bg-accent"}`}
                />
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="w-14 font-mono text-xs tabular-nums text-muted">{formatOffset(start, e.timestamp)}</span>
                  <span className="font-medium">{e.type === "click" ? "Clicked" : "Viewed page"}</span>
                  <span className="break-all text-muted">{pathOf(e.page_url)}</span>
                  {e.type === "click" && (
                    <span className="font-mono text-xs tabular-nums text-muted">
                      at {e.x}, {e.y}
                      {e.viewport_w ? ` on a ${e.viewport_w}×${e.viewport_h} screen` : ""}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </>
      )}
    </section>
  );
}

export default function SessionJourneyPage() {
  return (
    <Suspense fallback={<Loading what="events" />}>
      <SessionJourney />
    </Suspense>
  );
}
