# Session Analytics

A small full-stack app that tracks how people use a webpage and shows it in a dashboard: page views and clicks are captured by a drop-in script, stored in MongoDB, and explored as sessions, user journeys and a click heatmap.

Built for the CausalFunnel Full Stack Engineer assignment.

- **Dashboard:** `<DASHBOARD_URL>`
- **Demo shop (generates real data as you click):** `<DASHBOARD_URL>/demo`
- **API:** `<API_URL>/api/health`

## What it does

| Requirement | Where |
|---|---|
| Tracking script for `page_view` and `click`, with session id, event type, page URL, timestamp and click x/y | [`api/public/tracker.js`](api/public/tracker.js) |
| Node.js backend: receive and store events, list sessions with counts, events for a session, clicks for a page | [`api/src`](api/src) |
| MongoDB storage in a query-friendly shape | [`api/src/models/event.ts`](api/src/models/event.ts) |
| Dashboard: sessions list → ordered user journey; heatmap with a page picker | [`dashboard/app/(dashboard)`](dashboard/app/(dashboard)) |
| Demo webpage to test tracking | [`dashboard/app/demo`](dashboard/app/demo) |

## Tech stack

- **Tracker:** plain JavaScript, no dependencies (about 4 KB)
- **API:** Node.js 22, Express 5, Mongoose 9, Zod for validation, TypeScript
- **Database:** MongoDB (Atlas in production)
- **Dashboard:** Next.js 16 (App Router), React 19, Tailwind CSS 4, HTML canvas for the heatmap
- **Tests:** Vitest, Supertest, mongodb-memory-server, jsdom
- **Hosting:** Vercel (two projects: `api/` and `dashboard/`)

## How it works

```
Demo page (or any site)                    API (Express on Vercel)                MongoDB
  <script src=".../tracker.js">  ──POST──▶  /api/events  ── validate ──▶  insertMany  ──▶  events
  page_view on load, click on click         /api/sessions        ◀── aggregate ──
  batched, sent with sendBeacon             /api/sessions/:id/events ◀── find, sorted ──
                                            /api/pages, /api/heatmap ◀── find clicks ──
Dashboard (Next.js on Vercel) ──GET──▶ the read endpoints, renders sessions, journeys, heatmap
```

### Tracking script

Add one tag to any page:

```html
<script src="https://YOUR-API/tracker.js" data-endpoint="https://YOUR-API/api/events" defer></script>
```

- **Session id:** `crypto.randomUUID()` kept in `localStorage` with a last-activity time. A new session starts after **30 minutes without activity**, the usual web-analytics rule.
- **Events:** a `page_view` when the script loads and a `click` for every click (captured on `document`, so clicks are recorded even if the page stops them bubbling).
- **Click data:** `x`/`y` are document coordinates (`pageX`/`pageY`), plus the viewport size and the full page size at the time of the click. The heatmap needs the page size to place clicks correctly for different screens.
- **Delivery:** events are queued and sent in batches every 2 seconds, and immediately when the page is hidden or closed (`pagehide`, `visibilitychange`). Batches go out with `navigator.sendBeacon`, which the browser keeps sending even while the page unloads. The body is sent as `text/plain`, a CORS-safelisted type, so no preflight request is needed. If `sendBeacon` is unavailable it falls back to `fetch` with `keepalive`.
- It never throws into the host page, keeps working with storage blocked (in-memory session), installs once even if included twice, and has `cfTracker.destroy()` for single-page apps.

### API

| Method | Path | Returns |
|---|---|---|
| `POST` | `/api/events` | Stores one event or `{ "events": [...] }` (up to 100). `201 { "stored": n }`, or `400` with the validation issues |
| `GET` | `/api/sessions?limit=50&skip=0` | Sessions, newest activity first: total events, page views, clicks, first and last seen, pages visited, plus `total` |
| `GET` | `/api/sessions/:id/events` | That session's events in time order (the user journey). `404` if unknown |
| `GET` | `/api/pages` | Pages that have clicks, with click counts (for the heatmap picker) |
| `GET` | `/api/heatmap?page_url=...` | Click points for one page (up to 5,000) |
| `GET` | `/api/health` | `{ "ok": true }` |

Example event:

```json
{
  "session_id": "0f8e2a6c-1b2d-4e3f-9a8b-7c6d5e4f3a2b",
  "type": "click",
  "page_url": "https://shop.example/products",
  "timestamp": "2026-10-12T10:00:05.000Z",
  "x": 640, "y": 320,
  "viewport_w": 1280, "viewport_h": 720,
  "page_w": 1280, "page_h": 2400
}
```

### Data model

One `events` collection, one document per event (fields as above, plus `created_at`). Two indexes match the read paths:

- `{ session_id: 1, timestamp: 1 }`: the journey query (`find` by session, sorted by time) and the sessions aggregation (`$group` by session)
- `{ page_url: 1, type: 1 }`: the heatmap query (clicks for one page)

`page_url` is stored as origin + path, so `/products?utm=ad#top` and `/products` count as the same page.

### Heatmap

The dashboard loads the page itself in a scaled-down iframe and draws clicks on a canvas on top.

- Each click is placed by its **share of the recorded page size** (`x / page_w`, `y / page_h`). That way a click on a button from a phone and from a laptop land in roughly the same place.
- The preview is rendered at the **most common recorded screen width** for that page, so the most typical visitors' clicks land exactly on the elements they hit.
- **Heat** mode stacks soft alpha blobs and recolours them blue → green → yellow → red by density. **Dots** mode shows each click.
- Pages on another domain can't be previewed (the browser blocks reading cross-origin iframes), so their clicks are drawn on a blank page.

## Run it locally

Requires Node.js 20+.

```bash
# 1. API (in-memory MongoDB, no setup needed; data is lost on restart)
cd api
npm install
npm run dev:memory          # http://localhost:4000

# 2. Dashboard (new terminal)
cd dashboard
npm install
cp .env.example .env.local  # NEXT_PUBLIC_API_URL=http://localhost:4000
npm run dev -- --port 3001  # http://localhost:3001
```

Open <http://localhost:3001/demo>, click around, then open <http://localhost:3001>.

To use a real database, put `MONGODB_URI=...` in `api/.env` and run `npm run dev`. To fill it with sample data:

```bash
cd api
SITE_URL=http://localhost:3001 npm run seed     # add -- --reset to clear existing events first
```

### Tests

```bash
cd api && npm test         # API endpoints (real in-memory MongoDB), tracker (jsdom), seed data
cd dashboard && npm test   # heatmap placement and formatting
```

## Deploy (Vercel + MongoDB Atlas)

1. **MongoDB Atlas:** create a free M0 cluster, a database user, and allow access from anywhere (`0.0.0.0/0`, since Vercel has no fixed IPs). Copy the connection string.
2. **API:** in Vercel, import this repo with **Root Directory `api`**. Add the env var `MONGODB_URI`. Vercel detects Express and serves `src/index.ts` as a function and `public/tracker.js` from its CDN.
3. **Dashboard:** import the repo again with **Root Directory `dashboard`**. Add `NEXT_PUBLIC_API_URL=https://<your-api>.vercel.app`.
4. Optional: seed sample data with `SITE_URL=https://<your-dashboard>.vercel.app MONGODB_URI=... npm run seed` from `api/`.

## Assumptions and trade-offs

- **No authentication.** Anyone can send events or read the dashboard. A real product would issue a per-site write key for the tracker and put the dashboard behind login.
- **Open CORS.** The tracker must post from any customer site, so the API allows all origins.
- **Page identity ignores query strings and hashes.** This keeps heatmaps from splitting into many URLs, but it merges pages that differ only by query (for example `?product=1` vs `?product=2`).
- **Heatmap accuracy across screen sizes.** Responsive layouts reflow, so clicks from a width different from the preview width are approximate. Splitting heatmaps by device class (mobile, tablet, desktop) would fix this.
- **Click coordinates, not elements.** Storing a CSS selector for the clicked element would make heatmaps robust to layout changes.
- **Delivery is best-effort.** If the browser is killed before a batch is sent, the last few events can be lost, and there's no de-duplication of retried batches.
- **Single collection, no aggregation cache.** The sessions list is computed on each request. At scale I'd pre-aggregate sessions (or maintain a `sessions` collection updated on insert), add TTL-based retention, and put a queue (for example Kafka or SQS) in front of the database writes.
- **Serverless MongoDB connections.** The API caches one connection per warm function instance. Atlas M0 allows 500 connections, which is plenty here.
- **Limits:** batches up to 100 events, request bodies up to 200 KB, heatmaps up to 5,000 clicks, journeys up to 10,000 events.
