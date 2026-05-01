import { createFileRoute } from "@tanstack/react-router";
import { Shell } from "@/components/Shell";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ChefHat, Clock, Loader2, Play } from "lucide-react";
import { timeAgo, money } from "@/lib/format";
import { toast } from "sonner";
import { RouteGuard } from "@/components/RouteGuard";

export const Route = createFileRoute("/kitchen")({
  head: () => ({
    meta: [
      { title: "Kitchen Display — MISE" },
      { name: "description", content: "Live kitchen ticket display." },
    ],
  }),
  component: () => (
    <RouteGuard allow={["chef"]}>
      <KitchenPage />
    </RouteGuard>
  ),
});

type Status = "pending" | "in_progress" | "completed" | "cancelled";
type Order = {
  id: string;
  table_number: number;
  status: Status;
  total: number;
  created_at: string;
  items: { name: string; quantity: number }[];
};

const COLS: { key: Status; label: string; tint: string }[] = [
  { key: "pending", label: "New", tint: "border-warning/40 bg-warning/5" },
  { key: "in_progress", label: "On the line", tint: "border-accent/40 bg-accent/5" },
  { key: "completed", label: "Plated", tint: "border-success/40 bg-success/5" },
];

function KitchenPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data, error } = await supabase
      .from("orders")
      .select("id, table_number, status, total, created_at, order_items(quantity, menu_items(name))")
      .in("status", ["pending", "in_progress", "completed"])
      .order("created_at", { ascending: true })
      .limit(100);
    if (error) {
      toast.error(error.message);
      return;
    }
    setOrders(
      (data ?? []).map((o: any) => ({
        id: o.id,
        table_number: o.table_number,
        status: o.status,
        total: Number(o.total),
        created_at: o.created_at,
        items: (o.order_items ?? []).map((it: any) => ({
          name: it.menu_items?.name ?? "Item",
          quantity: it.quantity,
        })),
      })),
    );
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel("kds")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "order_items" }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  const move = async (id: string, status: Status) => {
    const { error } = await supabase.from("orders").update({ status }).eq("id", id);
    if (error) toast.error(error.message);
    else toast.success(`Order ${status === "completed" ? "completed · stock deducted" : status.replace("_", " ")}`);
  };

  return (
    <Shell>
      <div className="p-6 md:p-8">
        <div className="flex items-end justify-between mb-6 gap-4 flex-wrap">
          <div>
            <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground flex items-center gap-2">
              <span className="pulse-dot" /> Live
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mt-1 flex items-center gap-3">
              <ChefHat className="h-8 w-8 text-primary" /> Kitchen display
            </h1>
          </div>
          <div className="flex gap-3 text-xs">
            {COLS.map((c) => (
              <div key={c.key} className="px-3 py-1.5 rounded-full bg-surface border border-border">
                <span className="text-muted-foreground">{c.label}: </span>
                <span className="font-mono font-bold">{orders.filter((o) => o.status === c.key).length}</span>
              </div>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading tickets…
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-4">
            {COLS.map((col) => {
              const colOrders = orders.filter((o) => o.status === col.key);
              return (
                <div key={col.key} className={`rounded-2xl border ${col.tint} p-3`}>
                  <div className="px-2 py-1 mb-3 flex items-center justify-between">
                    <h2 className="font-display font-semibold uppercase tracking-wider text-sm">
                      {col.label}
                    </h2>
                    <span className="text-xs font-mono text-muted-foreground">
                      {colOrders.length}
                    </span>
                  </div>
                  <div className="space-y-3 min-h-32">
                    {colOrders.length === 0 && (
                      <div className="text-center text-xs text-muted-foreground py-8 italic">
                        Nothing here
                      </div>
                    )}
                    {colOrders.map((o) => (
                      <div
                        key={o.id}
                        className="rounded-xl border border-border bg-card p-4 shadow-md hover:border-primary/40 transition-all"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                              Table
                            </div>
                            <div className="font-display text-2xl font-bold leading-none">
                              #{o.table_number}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
                            <Clock className="h-3 w-3" />
                            {timeAgo(o.created_at)}
                          </div>
                        </div>
                        <ul className="space-y-1.5 mb-4">
                          {o.items.map((it, i) => (
                            <li key={i} className="flex justify-between text-sm">
                              <span className="text-foreground">{it.name}</span>
                              <span className="font-mono text-primary font-semibold">×{it.quantity}</span>
                            </li>
                          ))}
                        </ul>
                        <div className="flex items-center justify-between pt-3 border-t border-border">
                          <span className="font-mono text-xs text-muted-foreground">{money(o.total)}</span>
                          {o.status === "pending" && (
                            <Button size="sm" onClick={() => move(o.id, "in_progress")}>
                              <Play className="h-3.5 w-3.5" /> Start
                            </Button>
                          )}
                          {o.status === "in_progress" && (
                            <Button
                              size="sm"
                              className="bg-success text-success-foreground hover:bg-success/90"
                              onClick={() => move(o.id, "completed")}
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" /> Complete
                            </Button>
                          )}
                          {o.status === "completed" && (
                            <span className="text-xs text-success flex items-center gap-1">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Done
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Shell>
  );
}
