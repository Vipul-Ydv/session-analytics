# CausalFunnel Analytics: design and build plan

Approved in chat on 2026-10-12. Deadline: submit by 2026-10-15 09:30 IST.

## Goal
A small full-stack app that tracks `page_view` and `click` events on a webpage and shows them in a dashboard (sessions, user journeys, click heatmap), per the CausalFunnel Full Stack Engineer assignment.

## Structure (one public repo, two Vercel projects)
| Folder | What | Tech | Hosting |
|---|---|---|---|
| `api/` | REST API + `public/tracker.js` | Node 22, Express 5, Mongoose 9, Zod, TypeScript | Vercel project 1 (Express zero-config, `src/index.ts` default export) |
| `dashboard/` | Sessions view, journey view, heatmap view, demo shop pages | Next.js 16, React, Tailwind | Vercel project 2 |

## Data model: `events` collection
`session_id` (string), `type` ("page_view" or "click"), `page_url` (origin + path, query/hash stripped), `timestamp` (Date), and for clicks: `x`, `y` (pageX/pageY px), `viewport_w`, `viewport_h`, `page_w`, `page_h` (document scroll size at click time), `created_at`.
Indexes: `{session_id: 1, timestamp: 1}` (journey + sessions grouping) and `{page_url: 1, type: 1}` (heatmap).

## API
| Method | Path | Purpose |
|---|---|---|
| GET | `/api/health` | Liveness |
| POST | `/api/events` | Store one event or a batch `{events: [...]}` (max 100). Accepts `application/json` and `text/plain` (sendBeacon). 400 on invalid input. |
| GET | `/api/sessions` | Sessions with total events, page views, clicks, first/last seen, pages; newest first |
| GET | `/api/sessions/:id/events` | Ordered events for one session (the journey) |
| GET | `/api/pages` | Page URLs that have clicks, with click counts (heatmap picker) |
| GET | `/api/heatmap?page_url=` | Click points for one page |

## Tracker (`api/public/tracker.js`)
- `<script src=".../tracker.js" data-endpoint="https://api/..." defer>`
- Session id: `crypto.randomUUID()` in localStorage with last-activity time; new session after 30 min idle.
- `page_view` on load; `click` (capture phase) with pageX/pageY + viewport and page size.
- Batches events; flushes every 2 s and on `pagehide` / `visibilitychange: hidden` using `navigator.sendBeacon` with a `text/plain` body (a CORS-safelisted type, so no preflight), falling back to `fetch(..., {keepalive: true})`.

## Dashboard
- `/`: sessions table (id, events, page views, clicks, pages, first/last seen) → row links to `/sessions/[id]`.
- `/sessions/[id]`: ordered timeline of events with time offsets.
- `/heatmap`: page picker; iframe of that demo page (same origin) at 1280 px, scaled to fit, with dots at `x/page_w` × `y/page_h` of the rendered document.
- `/demo`, `/demo/products`, `/demo/checkout`: a tiny shop that loads the tracker.

## Tests
- API: Vitest + Supertest against `mongodb-memory-server` (validation, batch, text/plain, sessions aggregation, journey order, heatmap filtering, pages list).
- Tracker: Vitest + jsdom (page_view on load, click payload, session reuse, 30-min rotation, flush via sendBeacon).
- Dashboard: unit test for heatmap point mapping.

## Tasks
1. API scaffold, Event model, POST /api/events with validation (TDD)
2. Read endpoints: sessions, journey, pages, heatmap (TDD)
3. tracker.js (TDD with jsdom)
4. Dashboard: sessions + journey views
5. Dashboard: heatmap view + demo shop pages
6. Seed script, README (setup, tech stack, trade-offs), WALKTHROUGH.md
7. Deploy (Vipul: MongoDB Atlas + 2 Vercel projects), end-to-end check, push to public GitHub

## Trade-offs to state in README
No auth (demo); open CORS on the collection endpoint (trackers run on any site); page_url normalised without query string; heatmap y uses page-height ratio (layouts reflow at other widths); Vercel serverless keeps a cached Mongo connection; free Atlas M0 limits; no event dedupe; batching can drop the last events if the browser kills the page before sendBeacon.
