import { createFileRoute } from "@tanstack/react-router";
import { Shell } from "@/components/Shell";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Loader2, Package, Plus } from "lucide-react";
import { toast } from "sonner";
import { RouteGuard } from "@/components/RouteGuard";

export const Route = createFileRoute("/inventory")({
  head: () => ({
    meta: [
      { title: "Inventory — MISE" },
      { name: "description", content: "Live ingredient stock levels." },
    ],
  }),
  component: () => (
    <RouteGuard>
      <InventoryPage />
    </RouteGuard>
  ),
});

type Ingredient = {
  id: string;
  name: string;
  unit: string;
  stock: number;
  low_stock_threshold: number;
};

function InventoryPage() {
  const [items, setItems] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [restockId, setRestockId] = useState<string | null>(null);
  const [restockQty, setRestockQty] = useState<string>("");

  const load = async () => {
    const { data, error } = await supabase.from("ingredients").select("*").order("name");
    if (error) toast.error(error.message);
    setItems((data as Ingredient[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel("inv")
      .on("postgres_changes", { event: "*", schema: "public", table: "ingredients" }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  const restock = async (i: Ingredient) => {
    const add = parseFloat(restockQty);
    if (isNaN(add) || add <= 0) return;
    const { error } = await supabase
      .from("ingredients")
      .update({ stock: Number(i.stock) + add })
      .eq("id", i.id);
    if (error) toast.error(error.message);
    else toast.success(`Restocked ${i.name} +${add}${i.unit}`);
    setRestockId(null);
    setRestockQty("");
  };

  const lowCount = items.filter((i) => i.stock <= i.low_stock_threshold).length;

  return (
    <Shell>
      <div className="p-6 md:p-8 max-w-6xl">
        <div className="flex items-end justify-between mb-6 gap-4 flex-wrap">
          <div>
            <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Walk-in</div>
            <h1 className="text-3xl md:text-4xl font-bold mt-1 flex items-center gap-3">
              <Package className="h-8 w-8 text-primary" /> Inventory
            </h1>
          </div>
          {lowCount > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-destructive/10 border border-destructive/30 text-destructive text-sm">
              <AlertTriangle className="h-4 w-4" />
              {lowCount} low-stock {lowCount === 1 ? "item" : "items"}
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading stock…
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-surface/50 text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="text-left px-5 py-3 font-medium">Ingredient</th>
                  <th className="text-left px-5 py-3 font-medium">Stock</th>
                  <th className="text-left px-5 py-3 font-medium hidden md:table-cell">Threshold</th>
                  <th className="text-left px-5 py-3 font-medium">Status</th>
                  <th className="text-right px-5 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map((i) => {
                  const low = i.stock <= i.low_stock_threshold;
                  const pct = Math.min(
                    100,
                    (Number(i.stock) / (Number(i.low_stock_threshold) * 3)) * 100,
                  );
                  return (
                    <tr key={i.id} className="border-b border-border last:border-0 hover:bg-surface/30">
                      <td className="px-5 py-4 font-medium">{i.name}</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-bold tabular-nums">
                            {Number(i.stock).toFixed(0)}
                            <span className="text-muted-foreground text-xs ml-1">{i.unit}</span>
                          </span>
                          <div className="hidden sm:block w-24 h-1.5 bg-surface-elevated rounded-full overflow-hidden">
                            <div
                              className={`h-full ${low ? "bg-destructive" : "bg-success"}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 font-mono text-sm text-muted-foreground hidden md:table-cell">
                        {i.low_stock_threshold} {i.unit}
                      </td>
                      <td className="px-5 py-4">
                        {low ? (
                          <span className="text-xs font-medium px-2 py-1 rounded-full bg-destructive/15 text-destructive">
                            Low
                          </span>
                        ) : (
                          <span className="text-xs font-medium px-2 py-1 rounded-full bg-success/15 text-success">
                            OK
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right">
                        {restockId === i.id ? (
                          <div className="inline-flex items-center gap-2">
                            <input
                              autoFocus
                              type="number"
                              value={restockQty}
                              placeholder="qty"
                              onChange={(e) => setRestockQty(e.target.value)}
                              onKeyDown={(e) => e.key === "Enter" && restock(i)}
                              className="w-20 bg-input border border-border rounded-md px-2 py-1 text-sm font-mono"
                            />
                            <Button size="sm" onClick={() => restock(i)}>
                              Save
                            </Button>
                          </div>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => setRestockId(i.id)}>
                            <Plus className="h-3.5 w-3.5" /> Restock
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Shell>
  );
}
