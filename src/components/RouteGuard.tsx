import { useEffect, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth, type AppRole } from "@/hooks/use-auth";

export function RouteGuard({
  children,
  allow,
}: {
  children: ReactNode;
  allow?: AppRole[];
}) {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    if (allow && role && !allow.includes(role)) {
      navigate({ to: role === "chef" ? "/kitchen" : "/waiter" });
    }
  }, [loading, user, role, allow, navigate]);

  if (loading || !user || (allow && role && !allow.includes(role))) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">
        <span className="pulse-dot mr-2" />
        Authenticating…
      </div>
    );
  }
  return <>{children}</>;
}
