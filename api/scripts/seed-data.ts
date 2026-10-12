/**
 * Generates realistic demo-shop visits for the seed script.
 * Click "hotspots" are the real element positions of the demo pages (measured at 1280 px wide),
 * stored as fractions of the page size, so seeded clicks land on actual buttons in the heatmap.
 */

export type SeedEvent = {
  session_id: string;
  type: "page_view" | "click";
  page_url: string;
  timestamp: string;
  x?: number;
  y?: number;
  viewport_w?: number;
  viewport_h?: number;
  page_w?: number;
  page_h?: number;
};

type Spot = { cx: number; cy: number; w: number; h: number; weight: number };
type Page = { path: string; height: number; spots: Spot[] };

const PAGES: Record<"home" | "products" | "checkout", Page> = {
  home: {
    path: "/demo",
    height: 1245,
    spots: [
      { cx: 0.162, cy: 0.279, w: 0.108, h: 0.037, weight: 6 }, // Shop all gear
      { cx: 0.287, cy: 0.279, w: 0.123, h: 0.037, weight: 2 }, // See bestsellers
      { cx: 0.702, cy: 0.226, w: 0.379, h: 0.289, weight: 1 }, // hero image
      { cx: 0.233, cy: 0.578, w: 0.224, h: 0.228, weight: 3 }, // bestseller 1
      { cx: 0.5, cy: 0.578, w: 0.224, h: 0.228, weight: 2 }, // bestseller 2
      { cx: 0.767, cy: 0.578, w: 0.224, h: 0.228, weight: 1 }, // bestseller 3
      { cx: 0.259, cy: 0.88, w: 0.264, h: 0.034, weight: 1 }, // email field
      { cx: 0.439, cy: 0.88, w: 0.084, h: 0.034, weight: 1 }, // Subscribe
    ],
  },
  products: {
    path: "/demo/products",
    height: 1027,
    spots: [
      { cx: 0.305, cy: 0.497, w: 0.076, h: 0.035, weight: 6 }, // Add to cart: daypack
      { cx: 0.573, cy: 0.497, w: 0.076, h: 0.035, weight: 4 }, // Add to cart: bottle
      { cx: 0.841, cy: 0.497, w: 0.076, h: 0.035, weight: 3 }, // Add to cart: headlamp
      { cx: 0.305, cy: 0.864, w: 0.076, h: 0.035, weight: 2 }, // Add to cart: jacket
      { cx: 0.573, cy: 0.864, w: 0.076, h: 0.035, weight: 1 },
      { cx: 0.841, cy: 0.864, w: 0.076, h: 0.035, weight: 1 },
      { cx: 0.232, cy: 0.307, w: 0.222, h: 0.205, weight: 3 }, // product images
      { cx: 0.5, cy: 0.307, w: 0.222, h: 0.205, weight: 2 },
      { cx: 0.768, cy: 0.307, w: 0.222, h: 0.205, weight: 2 },
    ],
  },
  checkout: {
    path: "/demo/checkout",
    height: 900,
    spots: [
      { cx: 0.241, cy: 0.227, w: 0.256, h: 0.042, weight: 3 }, // name
      { cx: 0.509, cy: 0.227, w: 0.256, h: 0.042, weight: 3 }, // phone
      { cx: 0.375, cy: 0.313, w: 0.525, h: 0.042, weight: 3 }, // address
      { cx: 0.241, cy: 0.4, w: 0.256, h: 0.042, weight: 2 }, // PIN
      { cx: 0.128, cy: 0.491, w: 0.03, h: 0.02, weight: 2 }, // UPI
      { cx: 0.192, cy: 0.491, w: 0.03, h: 0.02, weight: 1 }, // Card
      { cx: 0.161, cy: 0.557, w: 0.097, h: 0.053, weight: 5 }, // Place order
      { cx: 0.775, cy: 0.312, w: 0.198, h: 0.022, weight: 1 }, // Keep shopping
    ],
  },
};

const SCREENS = [
  { w: 1280, h: 720, weight: 6 },
  { w: 1280, h: 800, weight: 3 },
  { w: 1440, h: 900, weight: 2 },
];

/** Small seeded random generator, so the same seed always produces the same data. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T extends { weight: number }>(items: T[], rand: () => number): T {
  const total = items.reduce((s, i) => s + i.weight, 0);
  let r = rand() * total;
  for (const item of items) {
    r -= item.weight;
    if (r < 0) return item;
  }
  return items[items.length - 1];
}

function uuid(rand: () => number): string {
  const hex = Array.from({ length: 32 }, () => Math.floor(rand() * 16).toString(16)).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

type Options = { siteUrl: string; now: number; sessions: number; rand: () => number };

export function generateSessions({ siteUrl, now, sessions, rand }: Options): SeedEvent[] {
  const site = siteUrl.replace(/\/$/, "");
  const events: SeedEvent[] = [];
  const windowMs = 3 * 24 * 3600 * 1000 - 30 * 60 * 1000; // last 3 days, leaving room for the visit itself

  for (let s = 0; s < sessions; s++) {
    const id = uuid(rand);
    const screen = pick(SCREENS, rand);
    let t = now - windowMs + Math.floor(rand() * windowMs);

    // Funnel: everyone sees home, ~75% browse products, ~40% reach checkout.
    const journey: Page[] = [PAGES.home];
    if (rand() < 0.75) journey.push(PAGES.products);
    if (journey.length === 2 && rand() < 0.55) journey.push(PAGES.checkout);

    for (const page of journey) {
      const pageW = screen.w;
      const pageH = Math.round((page.height / 1280) * screen.w);
      events.push({ session_id: id, type: "page_view", page_url: `${site}${page.path}`, timestamp: new Date(t).toISOString() });
      const clicks = 1 + Math.floor(rand() * 4);
      for (let c = 0; c < clicks; c++) {
        t += 1500 + Math.floor(rand() * 9000);
        const spot = pick(page.spots, rand);
        const x = Math.round((spot.cx + (rand() - 0.5) * spot.w * 0.8) * pageW);
        const y = Math.round((spot.cy + (rand() - 0.5) * spot.h * 0.8) * pageH);
        events.push({
          session_id: id,
          type: "click",
          page_url: `${site}${page.path}`,
          timestamp: new Date(t).toISOString(),
          x: Math.min(Math.max(x, 0), pageW),
          y: Math.min(Math.max(y, 0), pageH),
          viewport_w: screen.w,
          viewport_h: screen.h,
          page_w: pageW,
          page_h: pageH,
        });
      }
      t += 3000 + Math.floor(rand() * 20000);
    }
  }
  return events;
}
