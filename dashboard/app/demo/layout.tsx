import type { Metadata } from "next";
import Link from "next/link";
import { TrackerScript } from "@/components/TrackerScript";

export const metadata: Metadata = { title: "Pinecrest Supply · Demo shop" };

const LINKS = [
  { href: "/demo", label: "Home" },
  { href: "/demo/products", label: "Shop" },
  { href: "/demo/checkout", label: "Cart" },
];

// A fixed light look on purpose: it's a separate "customer" site, not part of the dashboard.
export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-white text-[#1d2a24]" style={{ colorScheme: "light" }}>
      <TrackerScript />
      <header className="border-b border-[#e3e8e4]">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-6 px-4 py-4">
          {/* Plain links (full page loads), like a classic multi-page store, so every page fires a page_view. */}
          <a href="/demo" className="text-lg font-bold tracking-tight text-[#1f5f46]">
            Pinecrest Supply
          </a>
          <nav className="flex gap-4 text-sm">
            {LINKS.map((l) => (
              <a key={l.href} href={l.href} className="hover:text-[#1f5f46] hover:underline">
                {l.label}
              </a>
            ))}
          </nav>
          <span className="ml-auto rounded-full bg-[#eef4f0] px-3 py-1 text-xs text-[#1f5f46]">Demo site · your clicks are tracked</span>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-10">{children}</main>
      <footer className="border-t border-[#e3e8e4] py-6 text-center text-xs text-[#61716a]">
        Pinecrest Supply is a demo store for the Session Analytics assignment.{" "}
        <Link href="/" className="underline">
          Open the dashboard
        </Link>
      </footer>
    </div>
  );
}
