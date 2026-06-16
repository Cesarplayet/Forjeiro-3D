import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type CartItem = {
  id: string;
  name: string;
  price: number;
  image_url?: string | null;
  quantity: number;
  kind?: "product" | "minime";
  meta?: Record<string, unknown>;
};

type CartCtx = {
  items: CartItem[];
  add: (i: Omit<CartItem, "quantity">, qty?: number) => void;
  remove: (id: string) => void;
  setQty: (id: string, qty: number) => void;
  clear: () => void;
  subtotal: number;
  count: number;
};

const Ctx = createContext<CartCtx | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    try { return JSON.parse(localStorage.getItem("cart") || "[]"); } catch { return []; }
  });
  useEffect(() => { localStorage.setItem("cart", JSON.stringify(items)); }, [items]);

  const add: CartCtx["add"] = (i, qty = 1) => {
    setItems((cur) => {
      const ex = cur.find((c) => c.id === i.id);
      if (ex) return cur.map((c) => c.id === i.id ? { ...c, quantity: c.quantity + qty } : c);
      return [...cur, { ...i, quantity: qty }];
    });
  };
  const remove = (id: string) => setItems((c) => c.filter((x) => x.id !== id));
  const setQty = (id: string, qty: number) =>
    setItems((c) => c.map((x) => x.id === id ? { ...x, quantity: Math.max(1, qty) } : x));
  const clear = () => setItems([]);

  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const count = items.reduce((s, i) => s + i.quantity, 0);

  return <Ctx.Provider value={{ items, add, remove, setQty, clear, subtotal, count }}>{children}</Ctx.Provider>;
}

export const useCart = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCart must be used within CartProvider");
  return c;
};