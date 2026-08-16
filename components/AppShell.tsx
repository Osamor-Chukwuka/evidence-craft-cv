"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowRight,
  Bot,
  Check,
  FileSearch,
  FileText,
  FolderGit2,
  GitBranch,
  LayoutDashboard,
  LogOut,
} from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { useJourney } from "@/hooks/useJourney";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const icons = {
  dashboard: LayoutDashboard,
  sources: FolderGit2,
  evidence: Bot,
  review: FileSearch,
  cv: FileText,
};

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
  const pathname = usePathname();
  const { steps, current } = useJourney();

  const signOut = async () => {
    await supabase.auth.signOut();
    router.push("/auth");
  };

  const activeIndex = steps.findIndex((step) => step.to === pathname);
  const nextStep =
    activeIndex >= 0 && activeIndex < steps.length - 1 ? steps[activeIndex + 1]! : null;
  const activeStep = steps[activeIndex] ?? current;
  const recommendedIsReady = nextStep ? current.id === nextStep.id : false;
  const doneCount = steps.filter((step) => step.done).length;

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border bg-surface/95 backdrop-blur-xl">
        <div className="mx-auto flex min-h-16 w-full max-w-7xl flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
          <Link
            href="/dashboard"
            className="flex min-h-11 min-w-0 items-center gap-2 rounded-md pr-2"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <GitBranch className="h-5 w-5" />
            </span>
            <span className="min-w-0 leading-tight">
              <span className="block text-sm font-semibold tracking-tight">Evidence Craft</span>
              <span className="block text-xs text-muted-foreground">CV proof workspace</span>
            </span>
          </Link>

          <nav className="order-3 flex w-full flex-wrap gap-1 sm:order-none sm:w-auto">
            {steps.map((item) => {
              const active = pathname === item.to;
              const Icon = icons[item.icon];
              return (
                <Link
                  key={item.id}
                  href={item.to}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-11 shrink-0 items-center gap-2 rounded-md px-3 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.short}</span>
                  {item.done ? <Check className="h-3.5 w-3.5" /> : null}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex min-w-0 items-center gap-2">
            <span className="hidden rounded-md border border-border bg-card px-2.5 py-1.5 font-mono text-xs text-muted-foreground lg:block">
              {doneCount}/{steps.length} proof loops closed
            </span>
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl min-w-0 px-4 py-8 sm:px-6 md:py-10">
        <div className="mb-7 grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div className="min-w-0 max-w-3xl">
            <p className="mb-2 text-sm font-medium text-primary">{activeStep.label}</p>
            <h1 className="break-anywhere text-2xl font-semibold sm:text-3xl md:text-4xl">
              {title}
            </h1>
            {description ? (
              <p className="break-anywhere mt-2 text-base text-muted-foreground">{description}</p>
            ) : null}
          </div>
          {actions ? <div className="min-w-0 lg:justify-self-end">{actions}</div> : null}
        </div>

        {children}

        {nextStep ? (
          <div
            className={cn(
              "mt-10 flex flex-col gap-4 rounded-lg border bg-card p-4 shadow-sm transition-colors sm:flex-row sm:items-center",
              recommendedIsReady ? "border-primary/45 bg-primary/5" : "border-border",
            )}
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-primary">
                {recommendedIsReady ? "Ready for the next move" : "Recommended next move"}
              </p>
              <p className="text-sm">{nextStep.hint}</p>
            </div>
            <Button
              asChild
              variant={recommendedIsReady ? "default" : "secondary"}
              className="min-h-11 w-full sm:w-auto"
            >
              <Link href={nextStep.to}>
                {nextStep.label} <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        ) : null}
      </main>
    </div>
  );
}
