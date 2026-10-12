import { PRODUCTS, rupees } from "./products";

export default function DemoHome() {
  const featured = PRODUCTS.slice(0, 3);
  return (
    <div className="flex flex-col gap-12">
      <section className="grid items-center gap-8 md:grid-cols-2">
        <div>
          <h1 className="text-4xl font-bold leading-tight tracking-tight">Gear for the weekend trail</h1>
          <p className="mt-4 max-w-md text-[#4b5b54]">
            Light, tough kit for day hikes in the hills. Free delivery across India on orders over ₹2,000.
          </p>
          <div className="mt-6 flex gap-3">
            <a href="/demo/products" className="rounded-md bg-[#1f5f46] px-5 py-2.5 font-semibold text-white hover:bg-[#184b37]">
              Shop all gear
            </a>
            <a href="#featured" className="rounded-md border border-[#c9d4ce] px-5 py-2.5 font-semibold hover:border-[#1f5f46]">
              See bestsellers
            </a>
          </div>
        </div>
        <div className="aspect-[4/3] rounded-xl bg-[linear-gradient(160deg,#cfe3d6,#7fae93_55%,#2f6f55)]" aria-hidden="true" />
      </section>

      <section id="featured">
        <h2 className="text-2xl font-bold tracking-tight">Bestsellers</h2>
        <div className="mt-5 grid gap-5 sm:grid-cols-3">
          {featured.map((p) => (
            <a key={p.id} href="/demo/products" className="group rounded-xl border border-[#e3e8e4] p-4 hover:border-[#1f5f46]">
              <div className="aspect-square rounded-lg" style={{ background: p.color }} aria-hidden="true" />
              <p className="mt-3 font-semibold group-hover:underline">{p.name}</p>
              <p className="text-sm text-[#4b5b54]">{rupees(p.price)}</p>
            </a>
          ))}
        </div>
      </section>

      <section className="rounded-xl bg-[#eef4f0] p-6">
        <h2 className="text-xl font-bold">Join the trail club</h2>
        <p className="mt-1 text-sm text-[#4b5b54]">Get route ideas and early access to sales.</p>
        <form className="mt-4 flex max-w-md gap-2" action="/demo/products">
          <label htmlFor="demo-email" className="sr-only">
            Email
          </label>
          <input id="demo-email" type="email" placeholder="you@example.com" className="min-w-0 flex-1 rounded-md border border-[#c9d4ce] bg-white px-3 py-2" />
          <button type="submit" className="rounded-md bg-[#1f5f46] px-4 py-2 font-semibold text-white">
            Subscribe
          </button>
        </form>
      </section>
    </div>
  );
}
