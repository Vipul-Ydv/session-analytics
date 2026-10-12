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
