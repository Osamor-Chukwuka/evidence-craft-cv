"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  CheckCircle2,
  FileSearch,
  GitCommitHorizontal,
  GitPullRequest,
  Sparkles,
} from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useJourney } from "@/hooks/useJourney";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
  const { steps, current, counts, isLoading } = useJourney();

  const recent = useQuery({
    queryKey: ["recent-contributions"],
    queryFn: async () => {
      const { data } = await supabase
        .from("contributions")
        .select("id, kind, title, url, occurred_at, additions, deletions")
        .order("occurred_at", { ascending: false })
        .limit(6);
      return data ?? [];
    },
  });

  const queue = steps.filter((step) => !step.done);
  const nextAction =
    current.to === "/dashboard"
      ? (steps.find((step) => step.id === "sources") ?? current)
      : current;

  return (
    <AppShell
      title="Your evidence command center"
      description="Start wherever the workspace has enough proof to move. Sources, evidence, CV gaps, and final CV versions stay separate so the flow feels honest."
      actions={
        <Button asChild size="lg" className="min-h-11 w-full sm:w-auto">
          <Link href={nextAction.to}>
            Continue: {nextAction.label} <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      }
    >
      <section className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)]">
        <Card className="overflow-hidden">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <CardTitle>Workspace queue</CardTitle>
            </div>
            <CardDescription>
              The next few actions, ordered by what unlocks the product.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {(queue.length ? queue : steps.slice(-2)).map((step, index) => (
              <Link
                key={step.id}
                href={step.to}
                className={cn(
                  "flex items-start gap-3 rounded-lg border border-border bg-surface p-4 transition-colors hover:bg-secondary",
                  index === 0 && "border-primary/50 bg-primary/8",
                )}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-card font-mono text-xs">
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="break-anywhere block font-medium">{step.label}</span>
                  <span className="break-anywhere mt-1 block text-sm text-muted-foreground">
                    {step.hint}
                  </span>
                </span>
                {step.done ? (
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                ) : (
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                )}
              </Link>
            ))}
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          {[
            {
              label: "Synced contributions",
              value: counts?.contributions,
              helper: "raw commits and PRs",
            },
            { label: "Approved evidence", value: counts?.approved, helper: "ready for CV use" },
            { label: "Pending CV gaps", value: counts?.gaps, helper: "needs a decision" },
          ].map((item) => (
            <Card key={item.label}>
              <CardContent className="p-5">
                <p className="text-sm text-muted-foreground">{item.label}</p>
                {isLoading ? (
                  <Skeleton className="mt-3 h-9 w-16" />
                ) : (
                  <p className="mt-2 font-mono text-4xl font-semibold">{item.value ?? 0}</p>
                )}
                <p className="mt-1 text-xs text-muted-foreground">{item.helper}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <Card className="mt-4">
        <CardHeader className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <CardTitle>Recent GitHub evidence</CardTitle>
            <CardDescription>
              The latest activity imported from selected repositories.
            </CardDescription>
          </div>
          <Button asChild variant="secondary" className="w-full sm:w-auto">
            <Link href="/repositories">Manage sources</Link>
          </Button>
        </CardHeader>
        <CardContent className="grid gap-2">
          {recent.isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : recent.data?.length ? (
            recent.data.map((item) => (
              <a
                key={item.id}
                href={item.url ?? "#"}
                target="_blank"
                rel="noreferrer"
                className="flex items-start gap-3 rounded-md border border-border bg-surface p-3 transition-colors hover:bg-secondary"
              >
                {item.kind === "pull_request" ? (
                  <GitPullRequest className="mt-0.5 h-4 w-4 text-primary" />
                ) : (
                  <GitCommitHorizontal className="mt-0.5 h-4 w-4 text-accent" />
                )}
                <span className="min-w-0 flex-1">
                  <span className="break-anywhere block text-sm">{item.title}</span>
                  <span className="break-anywhere font-mono text-xs text-muted-foreground">
                    {item.occurred_at.slice(0, 10)} - +{item.additions}/-{item.deletions}
                  </span>
                </span>
                <Badge variant="secondary" className="shrink-0 font-mono text-[10px]">
                  {item.kind === "pull_request" ? "PR" : "commit"}
                </Badge>
              </a>
            ))
          ) : (
            <div className="rounded-lg border border-dashed border-border p-8 text-center">
              <FileSearch className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-3 text-sm font-medium">No evidence synced yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Connect GitHub and pull a date range to start.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}
