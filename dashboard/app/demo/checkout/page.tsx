"use client";
import { useState } from "react";
import { PRODUCTS, rupees } from "../products";

export default function DemoCheckout() {
  const item = PRODUCTS[0];
  const [placed, setPlaced] = useState(false);

  return (
    <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_18rem]">
      <section>
        <h1 className="text-3xl font-bold tracking-tight">Checkout</h1>
        {placed ? (
          <p role="status" className="mt-6 rounded-lg bg-[#eef4f0] p-4 font-medium text-[#1f5f46]">
            Order placed. This is a demo store, so nothing will be shipped.
          </p>
        ) : (
          <form
            className="mt-6 grid gap-4 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              setPlaced(true);
            }}
          >
            {[
              ["name", "Full name", "text"],
              ["phone", "Phone", "tel"],
              ["address", "Address", "text"],
              ["pin", "PIN code", "text"],
            ].map(([id, label, type]) => (
              <label key={id} htmlFor={`co-${id}`} className={`flex flex-col gap-1 text-sm ${id === "address" ? "sm:col-span-2" : ""}`}>
                {label}
                <input id={`co-${id}`} type={type} className="rounded-md border border-[#c9d4ce] px-3 py-2" />
              </label>
            ))}
            <fieldset className="sm:col-span-2">
              <legend className="mb-2 text-sm">Payment</legend>
              <div className="flex flex-wrap gap-3 text-sm">
                {["UPI", "Card", "Cash on delivery"].map((m, i) => (
                  <label key={m} className="flex items-center gap-2 rounded-md border border-[#c9d4ce] px-3 py-2">
                    <input type="radio" name="pay" defaultChecked={i === 0} /> {m}
                  </label>
                ))}
              </div>
            </fieldset>
            <button type="submit" className="rounded-md bg-[#1f5f46] px-5 py-3 font-semibold text-white hover:bg-[#184b37] sm:col-span-2 sm:w-fit">
              Place order
            </button>
          </form>
        )}
      </section>
      <aside className="h-fit rounded-xl border border-[#e3e8e4] p-4">
        <h2 className="font-semibold">Your cart</h2>
        <div className="mt-3 flex gap-3">
          <div className="size-14 shrink-0 rounded-md" style={{ background: item.color }} aria-hidden="true" />
          <div className="text-sm">
            <p className="font-medium">{item.name}</p>
            <p className="text-[#4b5b54]">{rupees(item.price)}</p>
          </div>
        </div>
        <div className="mt-4 flex justify-between border-t border-[#e3e8e4] pt-3 text-sm font-semibold">
          <span>Total</span>
          <span>{rupees(item.price)}</span>
        </div>
        <a href="/demo/products" className="mt-3 block text-sm text-[#1f5f46] underline">
          Keep shopping
        </a>
      </aside>
    </div>
  );
}
