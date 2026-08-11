import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Github, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import {
  connectGithubToken,
  disconnectGithub,
  getGithubStatus,
  importRepos,
  startGithubOAuth,
  syncContributions,
} from "@/lib/github.functions";

export const Route = createFileRoute("/_authenticated/repositories")({
  head: () => ({
    meta: [
      { title: "Repositories — Commit Trail" },
      {
        name: "description",
        content: "Connect GitHub, pick the repositories that matter, and sync your contributions.",
      },
      { property: "og:title", content: "Repositories — Commit Trail" },
      { property: "og:description", content: "Choose which repositories feed your CV evidence." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RepositoriesPage,
});

function isoDaysAgo(days: number) {
  return new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
}

function RepositoriesPage() {
  const qc = useQueryClient();
  const statusFn = useServerFn(getGithubStatus);
  const connectFn = useServerFn(connectGithubToken);
  const disconnectFn = useServerFn(disconnectGithub);
  const importFn = useServerFn(importRepos);
  const syncFn = useServerFn(syncContributions);

  const [token, setToken] = useState("");
  const [from, setFrom] = useState(isoDaysAgo(365));
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("github") === "connected") toast.success("GitHub connected.");
    if (params.get("github") === "error") toast.error("GitHub connection failed.");
  }, []);

  const status = useQuery({ queryKey: ["github-status"], queryFn: () => statusFn({}) });

  const repos = useQuery({
    queryKey: ["repositories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("repositories")
        .select("id, full_name, description, primary_language, is_private, stars, selected, pushed_at, last_synced_at")
        .order("pushed_at", { ascending: false, nullsFirst: false });
      if (error) throw new Error(error.message);
      return data;
    },
  });

  const connect = useMutation({
    mutationFn: () => connectFn({ data: { token } }),
    onSuccess: () => {
      setToken("");
      toast.success("GitHub connected.");
      qc.invalidateQueries({ queryKey: ["github-status"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const oauth = useMutation({
    mutationFn: () => startGithubOAuth({ data: { origin: window.location.origin } }),
    onSuccess: ({ url }) => {
      window.location.href = url;
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const disconnect = useMutation({
    mutationFn: () => disconnectFn({}),
    onSuccess: () => {
      toast.success("GitHub disconnected.");
      qc.invalidateQueries({ queryKey: ["github-status"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const importRepositories = useMutation({
    mutationFn: () => importFn({}),
    onSuccess: (r) => {
      toast.success(`Imported ${r.imported} repositories.`);
      qc.invalidateQueries({ queryKey: ["repositories"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const sync = useMutation({
    mutationFn: () => syncFn({ data: { from, to } }),
    onSuccess: (r) => {
      const skipped = (r as { skipped?: string[] }).skipped ?? [];
      toast.success(`Synced ${r.commits} commits and ${r.pullRequests} merged PRs.`, {
        description: skipped.length
          ? `Skipped ${skipped.length} repo(s) with no activity or access: ${skipped.slice(0, 3).join(", ")}${skipped.length > 3 ? "…" : ""}`
          : undefined,
      });
      qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggle = async (id: string, selected: boolean) => {
    const { error } = await supabase.from("repositories").update({ selected }).eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    qc.invalidateQueries({ queryKey: ["repositories"] });
  };

  const connected = status.data?.connected;

  return (
    <AppShell
      title="Step 1 · Connect GitHub & sync"
      description="Connect your account, tick the repositories worth mining, then pull your commits and merged pull requests. Empty or inaccessible repos are skipped automatically."
    >
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Github className="h-5 w-5" /> 1a · Connect your account
          </CardTitle>
          <CardDescription>
            {connected
              ? `Connected as ${status.data?.login}. Private repositories are included when your token allows it.`
              : "Connect with OAuth, or paste a personal access token with the repo and read:user scopes."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {connected ? (
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => importRepositories.mutate()} disabled={importRepositories.isPending}>
                {importRepositories.isPending ? "Importing…" : "Import repositories"}
              </Button>
              <Button variant="ghost" onClick={() => disconnect.mutate()}>
                Disconnect
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {status.data?.oauthAvailable ? (
                <Button onClick={() => oauth.mutate()} disabled={oauth.isPending}>
                  Connect with GitHub
                </Button>
              ) : (
                <p className="rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">
                  GitHub OAuth is not configured yet (GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET).
                  Use a personal access token below in the meantime.
                </p>
              )}
              <div className="flex flex-wrap items-end gap-2">
                <div className="min-w-60 flex-1 space-y-1.5">
                  <Label htmlFor="pat">Personal access token</Label>
                  <Input
                    id="pat"
                    type="password"
                    placeholder="ghp_…"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                  />
                </div>
                <Button onClick={() => connect.mutate()} disabled={!token || connect.isPending}>
                  {connect.isPending ? "Connecting…" : "Connect"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {connected ? (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-lg">1c · Pull your work</CardTitle>
            <CardDescription>Pull commits and merged PRs for the selected repositories.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="from">From</Label>
              <Input id="from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="to">To</Label>
              <Input id="to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
            <Button onClick={() => sync.mutate()} disabled={sync.isPending}>
              <RefreshCw className={`mr-2 h-4 w-4 ${sync.isPending ? "animate-spin" : ""}`} />
              {sync.isPending ? "Syncing…" : "Sync work"}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">1b · Choose repositories</CardTitle>
          <CardDescription>Tick the repositories to include in analysis.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {repos.isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : repos.data?.length ? (
            repos.data.map((repo) => (
              <label
                key={repo.id}
                className="flex cursor-pointer items-start gap-3 rounded-md border border-border/60 p-3 transition-colors hover:bg-secondary/50"
              >
                <Checkbox
                  checked={repo.selected}
                  onCheckedChange={(v) => toggle(repo.id, v === true)}
                  className="mt-1"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-mono text-sm">{repo.full_name}</p>
                  {repo.description ? (
                    <p className="truncate text-xs text-muted-foreground">{repo.description}</p>
                  ) : null}
                </div>
                <div className="flex shrink-0 gap-1.5">
                  {repo.primary_language ? (
                    <Badge variant="secondary" className="text-[10px]">{repo.primary_language}</Badge>
                  ) : null}
                  {repo.is_private ? (
                    <Badge variant="outline" className="text-[10px]">private</Badge>
                  ) : null}
                </div>
              </label>
            ))
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No repositories imported yet.
            </p>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}
