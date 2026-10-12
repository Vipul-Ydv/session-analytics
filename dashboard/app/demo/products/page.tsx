import { PRODUCTS, rupees } from "../products";

export default function DemoProducts() {
  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight">All gear</h1>
      <p className="mt-2 text-[#4b5b54]">{PRODUCTS.length} products</p>
      <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {PRODUCTS.map((p) => (
          <article key={p.id} className="flex flex-col rounded-xl border border-[#e3e8e4] p-4">
            <div className="aspect-[4/3] rounded-lg" style={{ background: p.color }} aria-hidden="true" />
            <h2 className="mt-3 font-semibold">{p.name}</h2>
            <p className="text-sm text-[#4b5b54]">{p.note}</p>
            <div className="mt-4 flex items-center justify-between">
              <span className="font-semibold">{rupees(p.price)}</span>
              <a href="/demo/checkout" className="rounded-md bg-[#1f5f46] px-3 py-2 text-sm font-semibold text-white hover:bg-[#184b37]">
                Add to cart
              </a>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
