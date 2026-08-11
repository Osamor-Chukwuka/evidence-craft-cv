import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Check, GitCommitHorizontal, GitPullRequest } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useJourney } from "@/hooks/useJourney";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Overview — Commit Trail" },
      {
        name: "description",
        content:
          "Follow four guided steps: sync GitHub, review work items, compare your CV, generate an evidence-backed CV.",
      },
      { property: "og:title", content: "Overview — Commit Trail" },
      { property: "og:description", content: "Your guided path from commits to a credible CV." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
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

  return (
    <AppShell
      title="Turn your commits into a credible CV"
      description="Four steps. Everything you see comes from your real GitHub history — nothing is invented."
      actions={
        <Button asChild size="lg">
          <Link to={current.to}>
            Continue: {current.label} <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      }
    >
      <div className="grid gap-4 md:grid-cols-2">
        {steps.map((s) => {
          const isCurrent = s.id === current.id;
          return (
            <Card
              key={s.id}
              className={cn(
                "transition-colors",
                isCurrent && "border-primary/60 bg-primary/5",
                s.done && !isCurrent && "opacity-80",
              )}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                  <span
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border font-mono text-xs",
                      s.done
                        ? "border-primary bg-primary text-primary-foreground"
                        : isCurrent
                          ? "border-primary text-primary"
                          : "border-border text-muted-foreground",
                    )}
                  >
                    {s.done ? <Check className="h-4 w-4" /> : s.step}
                  </span>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base">{s.label}</CardTitle>
                    <CardDescription className="mt-1">{s.hint}</CardDescription>
                  </div>
                  {isLoading ? null : (
                    <Badge variant="secondary" className="shrink-0 font-mono text-[10px]">
                      {s.count}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <Button asChild variant={isCurrent ? "default" : "secondary"} size="sm">
                  <Link to={s.to}>{s.done ? "Open" : "Start"}</Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Repositories synced", value: counts?.repos },
          { label: "Contributions", value: counts?.contributions },
          { label: "Approved work items", value: counts?.approved },
          { label: "CVs generated", value: counts?.cvs },
        ].map((item) => (
          <Card key={item.label}>
            <CardContent className="pt-6">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{item.label}</p>
              {isLoading ? (
                <Skeleton className="mt-2 h-8 w-14" />
              ) : (
                <p className="mt-1 font-mono text-3xl font-semibold">{item.value ?? 0}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="text-lg">Recent activity</CardTitle>
          <CardDescription>The latest contributions pulled from your selected repos.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {recent.isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : recent.data?.length ? (
            recent.data.map((item) => (
              <a
                key={item.id}
                href={item.url ?? "#"}
                target="_blank"
                rel="noreferrer"
                className="flex items-start gap-3 rounded-md border border-border/60 p-3 transition-colors hover:bg-secondary/60"
              >
                {item.kind === "pull_request" ? (
                  <GitPullRequest className="mt-0.5 h-4 w-4 text-accent" />
                ) : (
                  <GitCommitHorizontal className="mt-0.5 h-4 w-4 text-primary" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{item.title}</p>
                  <p className="font-mono text-xs text-muted-foreground">
                    {item.occurred_at.slice(0, 10)} · +{item.additions}/-{item.deletions}
                  </p>
                </div>
                <Badge variant="secondary" className="shrink-0 font-mono text-[10px]">
                  {item.kind === "pull_request" ? "PR" : "commit"}
                </Badge>
              </a>
            ))
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Nothing synced yet — start with step 1.
            </p>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}
