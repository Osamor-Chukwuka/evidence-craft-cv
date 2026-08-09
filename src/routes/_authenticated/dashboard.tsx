import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, GitCommitHorizontal, GitPullRequest, Sparkles } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { getGithubStatus } from "@/lib/github.functions";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Commit Trail" },
      {
        name: "description",
        content: "See your synced GitHub activity, generated work items, and CV progress.",
      },
      { property: "og:title", content: "Dashboard — Commit Trail" },
      { property: "og:description", content: "Your synced engineering work at a glance." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const status = useServerFn(getGithubStatus);

  const github = useQuery({ queryKey: ["github-status"], queryFn: () => status({}) });

  const stats = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const [repos, commits, prs, achievements, cvs, recent] = await Promise.all([
        supabase.from("repositories").select("id", { count: "exact", head: true }).eq("selected", true),
        supabase.from("contributions").select("id", { count: "exact", head: true }).eq("kind", "commit"),
        supabase
          .from("contributions")
          .select("id", { count: "exact", head: true })
          .eq("kind", "pull_request"),
        supabase.from("achievements").select("id", { count: "exact", head: true }),
        supabase.from("cvs").select("id", { count: "exact", head: true }),
        supabase
          .from("contributions")
          .select("id, kind, title, url, occurred_at, additions, deletions")
          .order("occurred_at", { ascending: false })
          .limit(8),
      ]);
      return {
        repos: repos.count ?? 0,
        commits: commits.count ?? 0,
        prs: prs.count ?? 0,
        achievements: achievements.count ?? 0,
        cvs: cvs.count ?? 0,
        recent: recent.data ?? [],
      };
    },
  });

  return (
    <AppShell
      title="Dashboard"
      description="Everything below is derived from your real GitHub history — nothing is invented."
      actions={
        <Button asChild>
          <Link to="/repositories">
            Sync work <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      }
    >
      {!github.isLoading && !github.data?.connected ? (
        <Card className="mb-8 border-primary/40 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-lg">Connect GitHub to get started</CardTitle>
            <CardDescription>
              Commit Trail reads your commits and merged pull requests to reconstruct what you
              actually built.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link to="/repositories">Connect GitHub</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { label: "Repositories", value: stats.data?.repos },
          { label: "Commits", value: stats.data?.commits },
          { label: "Merged PRs", value: stats.data?.prs },
          { label: "Work items", value: stats.data?.achievements },
          { label: "CVs", value: stats.data?.cvs },
        ].map((item) => (
          <Card key={item.label}>
            <CardContent className="pt-6">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{item.label}</p>
              {stats.isLoading ? (
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
          {stats.isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : stats.data?.recent.length ? (
            stats.data.recent.map((item) => (
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
              No contributions synced yet.
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6 border-dashed">
        <CardContent className="flex flex-wrap items-center gap-4 pt-6">
          <Sparkles className="h-5 w-5 text-accent" />
          <p className="flex-1 text-sm text-muted-foreground">
            Once your work is synced, generate work items and turn the ones you approve into a CV.
          </p>
          <Button variant="secondary" asChild>
            <Link to="/achievements">Review work items</Link>
          </Button>
        </CardContent>
      </Card>
    </AppShell>
  );
}
