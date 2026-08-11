import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import { ArrowRight, Check, GitBranch, LayoutDashboard, LogOut } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { useJourney } from "@/hooks/useJourney";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export function AppShell({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { steps, current } = useJourney();

  const signOut = async () => {
    await supabase.auth.signOut();
    router.navigate({ to: "/auth" });
  };

  const activeIndex = steps.findIndex((s) => s.to === pathname);
  const nextStep =
    activeIndex >= 0 && activeIndex < steps.length - 1 ? steps[activeIndex + 1]! : null;
  const doneCount = steps.filter((s) => s.done).length;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b border-border/70 bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
          <Link to="/dashboard" className="flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-primary" />
            <span className="font-mono text-sm font-semibold tracking-tight">commit_trail</span>
          </Link>
          <Link
            to="/dashboard"
            className="hidden items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground [&.active]:bg-secondary [&.active]:text-foreground sm:flex"
          >
            <LayoutDashboard className="h-4 w-4" />
            Overview
          </Link>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden font-mono text-xs text-muted-foreground sm:block">
              {doneCount}/{steps.length} steps done
            </span>
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </Button>
          </div>
        </div>

        {/* Numbered step rail — the whole product in one line */}
        <nav className="border-t border-border/70">
          <div className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 py-2">
            {steps.map((s) => {
              const active = pathname === s.to;
              return (
                <Link
                  key={s.id}
                  to={s.to}
                  className={cn(
                    "flex shrink-0 items-center gap-2 rounded-md px-3 py-1.5 text-xs transition-colors",
                    active
                      ? "bg-secondary text-foreground"
                      : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-5 w-5 items-center justify-center rounded-full border font-mono text-[10px]",
                      s.done
                        ? "border-primary bg-primary text-primary-foreground"
                        : active
                          ? "border-primary text-primary"
                          : "border-border",
                    )}
                  >
                    {s.done ? <Check className="h-3 w-3" /> : s.step}
                  </span>
                  <span className="whitespace-nowrap">{s.short}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-10">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold md:text-3xl">{title}</h1>
            {description ? (
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>
            ) : null}
          </div>
          {actions}
        </div>
        {children}

        {nextStep ? (
          <div className="mt-10 flex flex-wrap items-center gap-4 rounded-lg border border-dashed border-border p-4">
            <div className="min-w-0 flex-1">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Next · step {nextStep.step}
              </p>
              <p className="text-sm">{nextStep.hint}</p>
            </div>
            <Button asChild variant={current.id === nextStep.id ? "default" : "secondary"}>
              <Link to={nextStep.to}>
                {nextStep.label} <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        ) : null}
      </main>
    </div>
  );
}
