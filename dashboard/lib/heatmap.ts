export type ClickPoint = {
  x: number;
  y: number;
  page_w?: number;
  page_h?: number;
  viewport_w?: number;
  viewport_h?: number;
};

export type Size = { width: number; height: number };

const clamp = (v: number, max: number) => Math.min(Math.max(v, 0), max);

/**
 * Maps a recorded click onto a preview of the page.
 * Clicks are stored in document pixels for whatever screen the visitor had, so we place them by
 * their share of the recorded page size. That keeps a phone click and a laptop click on the same
 * element at the same spot in the preview.
 */
export function toHeatPoint(click: ClickPoint, preview: Size): { left: number; top: number } {
  const w = click.page_w || click.viewport_w;
  const h = click.page_h || click.viewport_h;
  const left = w ? (click.x / w) * preview.width : click.x;
  const top = h ? (click.y / h) * preview.height : click.y;
  return { left: Math.round(clamp(left, preview.width)), top: Math.round(clamp(top, preview.height)) };
}

const DEFAULT_WIDTH = 1280;

/**
 * The page width most clicks were recorded at. The preview renders the page at this width, so the
 * most common visitors' clicks land exactly on the elements they hit; other widths are scaled.
 */
export function typicalWidth(clicks: ClickPoint[]): number {
  const counts = new Map<number, number>();
  for (const c of clicks) {
    const w = Math.round(c.page_w || c.viewport_w || 0);
    if (w > 0) counts.set(w, (counts.get(w) ?? 0) + 1);
  }
  let best = DEFAULT_WIDTH;
  let bestCount = 0;
  for (const [w, n] of counts) {
    if (n > bestCount) {
      best = w;
      bestCount = n;
    }
  }
  return Math.min(1920, Math.max(320, best));
}
