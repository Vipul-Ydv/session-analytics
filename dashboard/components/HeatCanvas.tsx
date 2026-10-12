"use client";
import { useEffect, useRef } from "react";
import type { HeatmapClick } from "@/lib/api";
import { toHeatPoint } from "@/lib/heatmap";

type Props = { clicks: HeatmapClick[]; width: number; height: number; mode: "heat" | "dots" };

const RADIUS = 26;

/** 256-entry colour ramp: transparent blue → green → yellow → red as clicks pile up. */
function buildPalette(): Uint8ClampedArray {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 1;
  const ctx = c.getContext("2d")!;
  const g = ctx.createLinearGradient(0, 0, 256, 0);
  g.addColorStop(0.0, "rgba(0, 90, 255, 0)");
  g.addColorStop(0.25, "rgb(0, 170, 255)");
  g.addColorStop(0.5, "rgb(40, 220, 90)");
  g.addColorStop(0.75, "rgb(255, 220, 0)");
  g.addColorStop(1.0, "rgb(235, 40, 20)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 1);
  return ctx.getImageData(0, 0, 256, 1).data;
}

export function HeatCanvas({ clicks, width, height, mode }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || width <= 0 || height <= 0) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    const ctx = canvas.getContext("2d")!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    const points = clicks.map((c) => toHeatPoint(c, { width, height }));

    if (mode === "dots") {
      for (const p of points) {
        ctx.beginPath();
        ctx.arc(p.left, p.top, 5, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(217, 72, 15, 0.75)";
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
        ctx.stroke();
      }
      return;
    }

    // Heat: stack soft alpha blobs, then recolour each pixel by how much alpha piled up there.
    const alphaPerClick = Math.max(0.08, Math.min(0.5, 6 / Math.sqrt(points.length + 1)));
    for (const p of points) {
      const g = ctx.createRadialGradient(p.left, p.top, 0, p.left, p.top, RADIUS);
      g.addColorStop(0, `rgba(0,0,0,${alphaPerClick})`);
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.fillRect(p.left - RADIUS, p.top - RADIUS, RADIUS * 2, RADIUS * 2);
    }
    const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const px = image.data;
    const palette = buildPalette();
    for (let i = 0; i < px.length; i += 4) {
      const a = px[i + 3];
      if (a === 0) continue;
      const o = a * 4;
      px[i] = palette[o];
      px[i + 1] = palette[o + 1];
      px[i + 2] = palette[o + 2];
      px[i + 3] = Math.min(230, a * 1.6);
    }
    ctx.putImageData(image, 0, 0);
  }, [clicks, width, height, mode]);

  return <canvas ref={ref} aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ width, height }} />;
}
