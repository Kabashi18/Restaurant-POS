import { createFileRoute } from "@tanstack/react-router";
import { Shell } from "@/components/Shell";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, Minus, Send, Trash2, Loader2, ShoppingCart, X } from "lucide-react";
import { money } from "@/lib/format";
import { toast } from "sonner";
import { RouteGuard } from "@/components/RouteGuard";

export const Route = createFileRoute("/waiter")({
  head: () => ({
    meta: [
      { title: "Waiter Dashboard — MISE" },
      { name: "description", content: "Build and send orders to the kitchen." },
    ],
  }),
  component: () => (
    <RouteGuard allow={["waiter"]}>
      <WaiterPage />
    </RouteGuard>
  ),
});

type MenuItem = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: string;
  available: boolean;
};

type CartLine = { item: MenuItem; qty: number };

function WaiterPage() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<Record<string, CartLine>>({});
  const [tableNumber, setTableNumber] = useState<number>(1);
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [submitting, setSubmitting] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);

  useEffect(() => {
    supabase
      .from("menu_items")
      .select("*")
      .eq("available", true)
      .order("category")
      .then(({ data, error }) => {
        if (error) toast.error(error.message);
        setItems((data as MenuItem[]) ?? []);
        setLoading(false);
      });
  }, []);

  const categories = useMemo(
    () => ["All", ...Array.from(new Set(items.map((i) => i.category)))],
    [items],
  );
  const filtered = useMemo(
    () => (activeCategory === "All" ? items : items.filter((i) => i.category === activeCategory)),
    [items, activeCategory],
  );

  const lines = Object.values(cart);
  const total = lines.reduce((s, l) => s + l.item.price * l.qty, 0);
  const itemCount = lines.reduce((s, l) => s + l.qty, 0);

  const add = (item: MenuItem) =>
    setCart((c) => ({ ...c, [item.id]: { item, qty: (c[item.id]?.qty ?? 0) + 1 } }));
  const remove = (item: MenuItem) =>
    setCart((c) => {
      const cur = c[item.id]?.qty ?? 0;
      if (cur <= 1) {
        const { [item.id]: _, ...rest } = c;
        return rest;
      }
      return { ...c, [item.id]: { item, qty: cur - 1 } };
    });

  const sendOrder = async () => {
    if (!lines.length) return;
    setSubmitting(true);
    const { data: order, error } = await supabase
      .from("orders")
      .insert({ table_number: tableNumber, total, status: "pending" })
      .select()
      .single();
    if (error || !order) {
      toast.error(error?.message ?? "Failed to create order");
      setSubmitting(false);
      return;
    }
    const { error: itemsErr } = await supabase.from("order_items").insert(
      lines.map((l) => ({
        order_id: order.id,
        menu_item_id: l.item.id,
        quantity: l.qty,
        unit_price: l.item.price,
      })),
    );
    setSubmitting(false);
    if (itemsErr) {
      toast.error(itemsErr.message);
      return;
    }
    toast.success(`Order sent · Table ${tableNumber}`);
    setCart({});
    setCartOpen(false);
  };

  return (
    <Shell>
      <div className="flex h-full">
        <section className="flex-1 p-6 md:p-8 overflow-auto">
          <div className="flex items-end justify-between mb-6 gap-4 flex-wrap">
            <div>
              <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Floor</div>
              <h1 className="text-3xl md:text-4xl font-bold mt-1">Build an order</h1>
            </div>
            <div className="flex gap-2 flex-wrap">
              {categories.map((c) => (
                <button
                  key={c}
                  onClick={() => setActiveCategory(c)}
                  className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                    activeCategory === c
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-surface border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading menu…
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map((item) => {
                const inCart = cart[item.id]?.qty ?? 0;
                return (
                  <div
                    key={item.id}
                    className="group relative p-5 rounded-2xl border border-border bg-card hover:border-primary/40 transition-all"
                  >
                    <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                      {item.category}
                    </div>
                    <div className="font-display text-lg font-semibold mt-1">{item.name}</div>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2 min-h-10">
                      {item.description}
                    </p>
                    <div className="mt-4 flex items-center justify-between">
                      <div className="font-mono text-lg font-bold text-primary">
                        {money(item.price)}
                      </div>
                      {inCart === 0 ? (
                        <Button size="sm" onClick={() => add(item)}>
                          <Plus className="h-4 w-4" /> Add
                        </Button>
                      ) : (
                        <div className="flex items-center gap-2 bg-surface-elevated rounded-full p-1 border border-border">
                          <button
                            onClick={() => remove(item)}
                            className="h-7 w-7 rounded-full bg-surface flex items-center justify-center hover:bg-destructive/20"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="font-mono text-sm w-5 text-center">{inCart}</span>
                          <button
                            onClick={() => add(item)}
                            className="h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Mobile floating cart button */}
        {itemCount > 0 && !cartOpen && (
          <button
            onClick={() => setCartOpen(true)}
            className="lg:hidden fixed bottom-6 right-6 z-40 h-16 px-5 rounded-full bg-primary text-primary-foreground shadow-2xl glow-amber flex items-center gap-3 font-semibold"
          >
            <ShoppingCart className="h-5 w-5" />
            <span className="font-mono">{itemCount}</span>
            <span className="font-mono">{money(total)}</span>
          </button>
        )}

        {/* Mobile backdrop */}
        {cartOpen && (
          <div
            onClick={() => setCartOpen(false)}
            className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          />
        )}

        <aside
          className={`${
            cartOpen ? "translate-x-0" : "translate-x-full"
          } lg:translate-x-0 fixed lg:static top-0 right-0 z-50 h-full w-full sm:w-96 lg:w-96 flex flex-col border-l border-border bg-surface/95 lg:bg-surface/40 backdrop-blur-xl transition-transform duration-300`}
        >
          <div className="p-6 border-b border-border flex items-start justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Ticket</div>
              <div className="mt-2 flex items-center gap-3">
                <label className="text-sm text-muted-foreground">Table</label>
                <input
                  type="number"
                  min={1}
                  value={tableNumber}
                  onChange={(e) => setTableNumber(parseInt(e.target.value) || 1)}
                  className="w-20 bg-input border border-border rounded-md px-3 py-1.5 font-mono text-lg font-bold"
                />
              </div>
            </div>
            <button
              onClick={() => setCartOpen(false)}
              className="lg:hidden h-9 w-9 rounded-full bg-surface border border-border flex items-center justify-center"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-1 overflow-auto p-4 space-y-2">
            {lines.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground py-12">
                No items yet. Tap to add.
              </div>
            ) : (
              lines.map((l) => (
                <div
                  key={l.item.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-card border border-border"
                >
                  <div className="min-w-0">
                    <div className="font-medium text-sm truncate">{l.item.name}</div>
                    <div className="text-xs text-muted-foreground font-mono">
                      {l.qty} × {money(l.item.price)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-semibold">
                      {money(l.qty * l.item.price)}
                    </span>
                    <button
                      onClick={() => setCart((c) => { const { [l.item.id]: _, ...rest } = c; return rest; })}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="p-6 border-t border-border space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{itemCount} items</span>
              <span className="font-mono text-2xl font-bold text-gradient">{money(total)}</span>
            </div>
            <Button
              className="w-full glow-amber"
              size="lg"
              disabled={!lines.length || submitting}
              onClick={sendOrder}
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Fire to kitchen
            </Button>
          </div>
        </aside>
      </div>
    </Shell>
  );
}
