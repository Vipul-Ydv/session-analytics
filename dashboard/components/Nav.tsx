"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Sessions", match: (p: string) => p === "/" || p.startsWith("/sessions") },
  { href: "/heatmap", label: "Heatmap", match: (p: string) => p.startsWith("/heatmap") },
];

export function Nav() {
  const path = usePathname();
  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-8 gap-y-2 px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
            <circle cx="11" cy="11" r="10" fill="none" stroke="currentColor" strokeWidth="1.5" opacity=".35" />
            <circle cx="11" cy="11" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.5" opacity=".6" />
            <circle cx="11" cy="11" r="2" className="fill-click" />
          </svg>
          Session Analytics
        </Link>
        <nav className="flex gap-1 text-sm">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={l.match(path) ? "page" : undefined}
              className={`rounded-md px-3 py-1.5 ${l.match(path) ? "bg-accent-soft font-medium text-accent" : "text-muted hover:text-ink"}`}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <a href="/demo" target="_blank" rel="noopener" className="ml-auto text-sm text-accent hover:underline">
          Open the demo shop to create data
        </a>
      </div>
    </header>
  );
}
