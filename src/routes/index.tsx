import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Shell } from "@/components/Shell";
import { ChefHat, ClipboardList, Package, ArrowRight, LogIn } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MISE — Restaurant POS" },
      { name: "description", content: "High-end restaurant point-of-sale, kitchen display, and live inventory." },
      { property: "og:title", content: "MISE — Restaurant POS" },
      { property: "og:description", content: "High-end restaurant point-of-sale, kitchen display, and live inventory." },
    ],
  }),
  component: Index,
});

const tiles = [
  {
    to: "/waiter" as const,
    title: "Waiter Dashboard",
    desc: "Build orders from the live menu and send them straight to the pass.",
    icon: ClipboardList,
  },
  {
    to: "/kitchen" as const,
    title: "Kitchen Display",
    desc: "Real-time tickets. Bump from pending to in-progress to completed.",
    icon: ChefHat,
  },
  {
    to: "/inventory" as const,
    title: "Inventory",
    desc: "Stock levels deduct automatically when tickets are completed.",
    icon: Package,
  },
];

function Index() {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user && role) {
      navigate({ to: role === "chef" ? "/kitchen" : "/waiter" });
    }
  }, [user, role, loading, navigate]);

  return (
    <Shell>
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 grid-bg opacity-40 pointer-events-none" />
        <div className="relative px-6 md:px-12 py-16 md:py-24 max-w-6xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-surface/60 text-xs uppercase tracking-[0.18em] text-muted-foreground">
            <span className="pulse-dot" />
            Service in progress
          </div>
          <h1 className="mt-6 text-5xl md:text-7xl font-bold tracking-tighter">
            The pass,<br />
            <span className="text-gradient">redesigned.</span>
          </h1>
          <p className="mt-5 max-w-xl text-lg text-muted-foreground">
            One unified system for the floor, the line, and the walk-in. Every
            ticket synced live. Every gram accounted for.
          </p>
          {!user && !loading && (
            <Link
              to="/login"
              className="mt-8 inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors"
            >
              <LogIn className="h-4 w-4" />
              Sign in to your station
            </Link>
          )}

          <div className="mt-12 grid md:grid-cols-3 gap-4">
            {tiles.map((t) => {
              const Icon = t.icon;
              return (
                <Link
                  key={t.to}
                  to={t.to}
                  className="group relative p-6 rounded-2xl border border-border bg-card hover:bg-surface-elevated transition-all hover:border-primary/40 hover:-translate-y-0.5"
                >
                  <div className="h-11 w-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="font-display text-xl font-semibold">{t.title}</div>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{t.desc}</p>
                  <div className="mt-5 flex items-center gap-2 text-sm font-medium text-primary">
                    Open
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </Shell>
  );
}
