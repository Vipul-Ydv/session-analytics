import { z } from "zod";

export const MAX_BATCH = 100;

/** Origin + path only, so "/products?ref=ad" and "/products" count as the same page. */
export function normalizePageUrl(raw: string): string {
  const url = new URL(raw);
  return `${url.origin}${url.pathname}`;
}

const pageUrl = z
  .string()
  .max(2048)
  .refine((v) => {
    try {
      const u = new URL(v);
      return u.protocol === "http:" || u.protocol === "https:";
    } catch {
      return false;
    }
  }, "page_url must be an absolute http(s) URL")
  .transform(normalizePageUrl);

const EARLIEST = Date.UTC(2020, 0, 1);
const MAX_CLOCK_SKEW_MS = 24 * 3600 * 1000;

const timestamp = z
  .union([z.string(), z.number()])
  .transform((v) => new Date(v))
  .refine((d) => !Number.isNaN(d.getTime()), "timestamp must be an ISO date or epoch milliseconds")
  // Client clocks are trusted only within sane bounds, so one bad clock can't pin a session to the top forever.
  .refine((d) => d.getTime() >= EARLIEST && d.getTime() <= Date.now() + MAX_CLOCK_SKEW_MS, "timestamp is too far in the past or future");

const common = {
  session_id: z.string().trim().min(1).max(128),
  page_url: pageUrl,
  timestamp,
};

const px = z.number().finite().nonnegative().max(100_000);

const pageViewEvent = z.object({ ...common, type: z.literal("page_view") });

const clickEvent = z.object({
  ...common,
  type: z.literal("click"),
  x: px,
  y: px,
  viewport_w: px.optional(),
  viewport_h: px.optional(),
  page_w: px.optional(),
  page_h: px.optional(),
});

export const eventSchema = z.discriminatedUnion("type", [pageViewEvent, clickEvent]);
export type ValidEvent = z.infer<typeof eventSchema>;

/** Accepts one event or `{ events: [...] }`. */
export const eventsPayload = z.union([
  z.object({ events: z.array(eventSchema).min(1).max(MAX_BATCH) }).transform((p) => p.events),
  eventSchema.transform((e) => [e]),
]);
