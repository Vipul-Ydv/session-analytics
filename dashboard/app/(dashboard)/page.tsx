"use client";
import Link from "next/link";
import { useState } from "react";
import { ErrorNote, Loading } from "@/components/States";
import { useApi } from "@/components/useApi";
import { api } from "@/lib/api";
import { formatDateTime, formatDuration, pathOf, shortId } from "@/lib/format";

const PAGE_SIZE = 25;

export default function SessionsPage() {
  const [page, setPage] = useState(0);
  const { data, error, loading, reload } = useApi(() => api.sessions(PAGE_SIZE, page * PAGE_SIZE), `page-${page}`);
  const pages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;
  const summary = data
    ? `${data.total} ${data.total === 1 ? "session" : "sessions"}, newest activity first.`
    : "Every visit to a tracked page, grouped by visitor session.";

  return (
    <section>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Sessions</h1>
          <p className="mt-1 text-muted">{summary}</p>
        </div>
        <button type="button" onClick={reload} className="rounded-md border border-line bg-surface px-3 py-1.5 text-sm hover:border-ink">
          Refresh
        </button>
      </div>

      {error && <ErrorNote message={error} onRetry={reload} />}
      {loading && !data && <Loading what="sessions" />}

      {data && data.sessions.length === 0 && (
        <div className="rounded-lg border border-dashed border-line bg-surface p-8">
          <p className="font-medium">No sessions yet.</p>
          <p className="mt-1 text-muted">
            Open the{" "}
            <a href="/demo" target="_blank" rel="noopener" className="text-accent underline">
              demo shop
            </a>
            , click around, then refresh this page.
          </p>
        </div>
      )}

      {data && data.sessions.length > 0 && (
        <>
          <div className="overflow-x-auto rounded-lg border border-line bg-surface">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-line text-muted">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">Session</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">Events</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">Page views</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">Clicks</th>
                  <th scope="col" className="px-4 py-3 font-medium">Pages</th>
                  <th scope="col" className="px-4 py-3 font-medium">Last active</th>
                  <th scope="col" className="px-4 py-3 font-medium">Duration</th>
                </tr>
              </thead>
              <tbody>
                {data.sessions.map((s) => (
                  <tr key={s.session_id} className="border-b border-line last:border-0 hover:bg-accent-soft/50">
                    <td className="px-4 py-3">
                      <Link
                        href={`/sessions/${encodeURIComponent(s.session_id)}`}
                        className="font-mono text-accent underline-offset-2 hover:underline"
                        title={s.session_id}
                      >
                        {shortId(s.session_id)}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums">{s.total_events}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{s.page_views}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{s.clicks}</td>
                    <td className="max-w-64 px-4 py-3">
                      <span className="block truncate" title={s.pages.join("\n")}>
                        {s.pages.map(pathOf).join(", ")}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-muted">{formatDateTime(s.last_seen)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted">{formatDuration(s.first_seen, s.last_seen)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {pages > 1 && (
            <div className="mt-4 flex items-center gap-3 text-sm">
              <button
                type="button"
                disabled={page === 0}
                onClick={() => setPage(page - 1)}
                className="rounded-md border border-line bg-surface px-3 py-1.5 disabled:opacity-40"
              >
                Newer
              </button>
              <span className="tabular-nums text-muted">
                Page {page + 1} of {pages}
              </span>
              <button
                type="button"
                disabled={page + 1 >= pages}
                onClick={() => setPage(page + 1)}
                className="rounded-md border border-line bg-surface px-3 py-1.5 disabled:opacity-40"
              >
                Older
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
