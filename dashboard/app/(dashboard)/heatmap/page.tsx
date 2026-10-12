"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { HeatCanvas } from "@/components/HeatCanvas";
import { ErrorNote, Loading } from "@/components/States";
import { useApi } from "@/components/useApi";
import { api, type HeatmapClick } from "@/lib/api";
import { pathOf } from "@/lib/format";
import { typicalWidth } from "@/lib/heatmap";


function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return { ref, width };
}

/** Typical recorded page height (median), used when the page can't be previewed live. */
function medianPageHeight(clicks: HeatmapClick[], renderWidth: number): number {
  const hs = clicks
    .map((c) => (c.page_h && c.page_w ? (c.page_h / c.page_w) * renderWidth : 0))
    .filter((h) => h > 0)
    .sort((a, b) => a - b);
  return hs.length ? hs[Math.floor(hs.length / 2)] : renderWidth * 0.75;
}

function Preview({ pageUrl, clicks, mode }: { pageUrl: string; clicks: HeatmapClick[]; mode: "heat" | "dots" }) {
  const { ref, width } = useWidth<HTMLDivElement>();
  const [docHeight, setDocHeight] = useState<number | null>(null);
  const sameOrigin = typeof window !== "undefined" && new URL(pageUrl).origin === window.location.origin;
  // Render the page at the width most visitors had, then scale it down to fit the panel.
  const renderWidth = typicalWidth(clicks);
  const scale = width / renderWidth;
  const fullHeight = docHeight ?? medianPageHeight(clicks, renderWidth);
  const height = Math.round(fullHeight * scale);

  return (
    <div ref={ref} className="w-full">
      {width > 0 && (
        <div className="relative overflow-hidden rounded-lg border border-line bg-surface" style={{ height }}>
          {sameOrigin ? (
            <iframe
              key={`${pageUrl}@${renderWidth}`}
              src={pageUrl}
              title={`Preview of ${pathOf(pageUrl)}`}
              tabIndex={-1}
              className="pointer-events-none absolute left-0 top-0 origin-top-left border-0"
              style={{ width: renderWidth, height: fullHeight, transform: `scale(${scale})` }}
              onLoad={(e) => {
                const doc = e.currentTarget.contentDocument;
                if (doc) setDocHeight(Math.max(doc.documentElement.scrollHeight, 400));
              }}
            />
          ) : (
            <div className="absolute inset-0 grid place-items-center text-sm text-muted">
              Live preview is only available for pages on this site. Clicks are shown on a blank page.
            </div>
          )}
          <HeatCanvas clicks={clicks} width={width} height={height} mode={mode} />
        </div>
      )}
    </div>
  );
}

function HeatmapView() {
  const router = useRouter();
  const params = useSearchParams();
  const [mode, setMode] = useState<"heat" | "dots">("heat");
  const pages = useApi(() => api.pages(), "pages");
  const selected = params.get("page") ?? pages.data?.pages[0]?.page_url ?? null;
  const heat = useApi(() => (selected ? api.heatmap(selected) : Promise.resolve(null)), selected ?? "");

  return (
    <section>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Click heatmap</h1>
        <p className="mt-1 max-w-2xl text-muted">
          Where visitors clicked on a page. Clicks from every screen size are placed by their position relative to the page, so the
          same button lines up on phones and laptops.
        </p>
      </div>

      {pages.error && <ErrorNote message={pages.error} onRetry={pages.reload} />}
      {pages.loading && !pages.data && <Loading what="pages" />}

      {pages.data && pages.data.pages.length === 0 && (
        <div className="rounded-lg border border-dashed border-line bg-surface p-8">
          <p className="font-medium">No clicks recorded yet.</p>
          <p className="mt-1 text-muted">
            Click around the{" "}
            <a href="/demo" target="_blank" rel="noopener" className="text-accent underline">
              demo shop
            </a>
            , then come back here.
          </p>
        </div>
      )}

      {pages.data && pages.data.pages.length > 0 && selected && (
        <div className="grid gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
          <div className="flex flex-col gap-4">
            <label htmlFor="page-picker" className="flex flex-col gap-1.5 text-sm font-medium">
              Page
              <select
                id="page-picker"
                value={selected}
                onChange={(e) => router.replace(`/heatmap?page=${encodeURIComponent(e.target.value)}`)}
                className="rounded-md border border-line bg-surface px-2 py-2 font-normal"
              >
                {pages.data.pages.map((p) => (
                  <option key={p.page_url} value={p.page_url}>
                    {pathOf(p.page_url)} ({p.clicks} {p.clicks === 1 ? "click" : "clicks"})
                  </option>
                ))}
              </select>
            </label>
            <fieldset className="flex flex-col gap-1.5 text-sm">
              <legend className="mb-1.5 font-medium">Show clicks as</legend>
              <div className="inline-flex w-fit rounded-md border border-line bg-surface p-0.5">
                {(["heat", "dots"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    aria-pressed={mode === m}
                    onClick={() => setMode(m)}
                    className={`rounded px-3 py-1 ${mode === m ? "bg-ink text-ground" : "text-muted hover:text-ink"}`}
                  >
                    {m === "heat" ? "Heat" : "Dots"}
                  </button>
                ))}
              </div>
            </fieldset>
            {heat.data && (
              <p className="text-sm text-muted">
                {heat.data.clicks.length} clicks on <span className="break-all text-ink">{pathOf(heat.data.page_url)}</span>
                {heat.data.truncated ? ". Showing the first 5,000." : "."} Previewed at {typicalWidth(heat.data.clicks)} px wide, the
                most common screen width for this page.
              </p>
            )}
            {mode === "heat" && (
              <div className="text-xs text-muted">
                <div className="h-2 rounded bg-[linear-gradient(90deg,rgba(0,170,255,.6),rgb(40,220,90),rgb(255,220,0),rgb(235,40,20))]" />
                <div className="mt-1 flex justify-between">
                  <span>Few clicks</span>
                  <span>Many clicks</span>
                </div>
              </div>
            )}
          </div>
          <div className="min-w-0">
            {heat.error && <ErrorNote message={heat.error} onRetry={heat.reload} />}
            {heat.loading && !heat.data && <Loading what="clicks" />}
            {heat.data && <Preview key={heat.data.page_url} pageUrl={heat.data.page_url} clicks={heat.data.clicks} mode={mode} />}
          </div>
        </div>
      )}
    </section>
  );
}

export default function HeatmapPage() {
  return (
    <Suspense fallback={<Loading what="heatmap" />}>
      <HeatmapView />
    </Suspense>
  );
}
