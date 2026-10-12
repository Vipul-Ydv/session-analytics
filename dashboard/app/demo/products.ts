export type Product = { id: string; name: string; price: number; note: string; color: string };

export const PRODUCTS: Product[] = [
  { id: "trail-pack", name: "Ridgeline 28 L daypack", price: 3499, note: "Rain cover included", color: "#2f6f55" },
  { id: "bottle", name: "Insulated bottle, 750 ml", price: 1199, note: "Cold for 24 hours", color: "#3b6e8f" },
  { id: "headlamp", name: "Summit 400 headlamp", price: 1899, note: "USB-C rechargeable", color: "#b5651d" },
  { id: "jacket", name: "Packable rain jacket", price: 4299, note: "Folds into its pocket", color: "#4d5b9e" },
  { id: "socks", name: "Merino hiking socks, 2 pairs", price: 899, note: "Cushioned heel", color: "#8a4f6d" },
  { id: "stove", name: "Compact camp stove", price: 2599, note: "Boils 1 L in 4 min", color: "#6b6b2f" },
];

export const rupees = (n: number) => `₹${n.toLocaleString("en-IN")}`;
