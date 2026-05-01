import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { ChefHat, ClipboardList, LogOut, Package, UtensilsCrossed } from "lucide-react";
import type { ReactNode } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

const allNav = [
  { to: "/", label: "Overview", icon: UtensilsCrossed, roles: ["waiter", "chef"] as const },
  { to: "/waiter", label: "Waiter", icon: ClipboardList, roles: ["waiter"] as const },
  { to: "/kitchen", label: "Kitchen", icon: ChefHat, roles: ["chef"] as const },
  { to: "/inventory", label: "Inventory", icon: Package, roles: ["waiter", "chef"] as const },
];

export function Shell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const { user, role } = useAuth();
  const navigate = useNavigate();

  const nav = allNav.filter((n) => !role || (n.roles as readonly string[]).includes(role));

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate({ to: "/login" });
  }

  return (
    <div className="min-h-screen flex">
      <aside className="hidden md:flex w-64 flex-col border-r border-border bg-surface/50 backdrop-blur-xl">
        <div className="p-6 border-b border-border">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-md">
              <UtensilsCrossed className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <div className="font-display font-bold text-lg leading-none">MISE</div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mt-1">
                POS · v1.0
              </div>
            </div>
          </Link>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {nav.map((n) => {
            const active = pathname === n.to;
            const Icon = n.icon;
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all ${
                  active
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-surface-elevated"
                }`}
              >
                <Icon className="h-4 w-4" />
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-border space-y-3">
          {user ? (
            <>
              <div className="text-xs">
                <div className="text-foreground font-medium truncate">{user.email}</div>
                <div className="text-muted-foreground uppercase tracking-[0.16em] text-[10px] mt-0.5">
                  {role ?? "—"}
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-surface-elevated transition-colors"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign out
              </button>
            </>
          ) : (
            <Link to="/login" className="text-xs text-primary font-medium">
              Sign in →
            </Link>
          )}
          <div className="flex items-center text-xs text-muted-foreground">
            <span className="pulse-dot" />
            Live · synced
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden border-b border-border bg-surface/80 backdrop-blur-xl p-3 flex gap-2 overflow-x-auto items-center">
          {nav.map((n) => {
            const active = pathname === n.to;
            const Icon = n.icon;
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-xs font-medium whitespace-nowrap ${
                  active ? "bg-primary text-primary-foreground" : "bg-surface-elevated text-muted-foreground"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {n.label}
              </Link>
            );
          })}
          {user && (
            <button
              onClick={handleLogout}
              className="ml-auto flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium bg-surface-elevated text-muted-foreground"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          )}
        </header>
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
