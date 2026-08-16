"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Github,
  Inbox,
  RefreshCw,
  Search,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import {
  connectGithubTokenAction,
  disconnectGithubAction,
  getGithubStatusAction,
  importReposAction,
  startGithubOAuthAction,
  syncContributionsAction,
} from "@/actions/github";
import { AppShell } from "@/components/AppShell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type Repository = {
  id: string;
  full_name: string;
  description: string | null;
  primary_language: string | null;
  is_private: boolean;
  stars: number;
  selected: boolean;
  pushed_at: string | null;
  last_synced_at: string | null;
};

type SyncSummary = {
  commits: number;
  pullRequests: number;
  repos: number;
  skipped: string[];
};

function isoDaysAgo(days: number) {
  return new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
}

function plural(count: number, singular: string, pluralText = `${singular}s`) {
  return `${count} ${count === 1 ? singular : pluralText}`;
}

export default function RepositoriesPage() {
  const qc = useQueryClient();
  const [token, setToken] = useState("");
  const [from, setFrom] = useState(isoDaysAgo(365));
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const [filter, setFilter] = useState("");
  const [syncSummary, setSyncSummary] = useState<SyncSummary | null>(null);
  const [importSummary, setImportSummary] = useState<number | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("github") === "connected") toast.success("GitHub connected.");
    if (params.get("github") === "error") toast.error("GitHub connection failed.");
  }, []);

  const status = useQuery({ queryKey: ["github-status"], queryFn: () => getGithubStatusAction() });

  const repos = useQuery({
    queryKey: ["repositories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("repositories")
        .select(
          "id, full_name, description, primary_language, is_private, stars, selected, pushed_at, last_synced_at",
        )
        .order("pushed_at", { ascending: false, nullsFirst: false });
      if (error) throw new Error(error.message);
      return data as Repository[];
    },
  });

  const contributionCount = useQuery({
    queryKey: ["contributions-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("contributions")
        .select("id", { count: "exact", head: true });
      if (error) throw new Error(error.message);
      return count ?? 0;
    },
  });

  const connect = useMutation({
    mutationFn: () => connectGithubTokenAction({ token }),
    onSuccess: () => {
      setToken("");
      toast.success("GitHub connected.");
      qc.invalidateQueries({ queryKey: ["github-status"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const oauth = useMutation({
    mutationFn: () => startGithubOAuthAction({ origin: window.location.origin }),
    onSuccess: ({ url }) => {
      window.location.href = url;
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const disconnect = useMutation({
    mutationFn: () => disconnectGithubAction(),
    onSuccess: () => {
      toast.success("GitHub disconnected.");
      qc.invalidateQueries({ queryKey: ["github-status"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const importRepositories = useMutation({
    mutationFn: () => importReposAction(),
    onSuccess: (result) => {
      setImportSummary(result.imported);
      toast.success(`Imported ${result.imported} repositories.`);
      qc.invalidateQueries({ queryKey: ["repositories"] });
      qc.invalidateQueries({ queryKey: ["journey-counts"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const sync = useMutation({
    mutationFn: () => syncContributionsAction({ from, to }),
    onMutate: () => {
      setSyncSummary(null);
    },
    onSuccess: (result) => {
      const skipped = (result as { skipped?: string[] }).skipped ?? [];
      setSyncSummary({
        commits: result.commits,
        pullRequests: result.pullRequests,
        repos: result.repos,
        skipped,
      });
      toast.success(
        `Sync complete: ${result.commits} commits and ${result.pullRequests} merged PRs.`,
      );
      qc.invalidateQueries();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const connected = status.data?.connected;
  const allRepos = useMemo(() => repos.data ?? [], [repos.data]);
  const selectedCount = allRepos.filter((repo) => repo.selected).length;
  const importedCount = allRepos.length;
  const hasSyncedWork = Boolean(syncSummary) || (contributionCount.data ?? 0) > 0;
  const syncing = sync.isPending;

  const filteredRepos = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    if (!needle) return allRepos;
    return allRepos.filter((repo) =>
      [repo.full_name, repo.description, repo.primary_language]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(needle)),
    );
  }, [allRepos, filter]);

  const visibleIds = filteredRepos.map((repo) => repo.id);
  const visibleSelectedCount = filteredRepos.filter((repo) => repo.selected).length;
  const allVisibleSelected =
    filteredRepos.length > 0 && visibleSelectedCount === filteredRepos.length;
  const someVisibleSelected = visibleSelectedCount > 0 && !allVisibleSelected;

  const setRepoSelection = async (ids: string[], selected: boolean) => {
    if (!ids.length || syncing) return;

    const previous = qc.getQueryData<Repository[]>(["repositories"]) ?? [];
    qc.setQueryData<Repository[]>(["repositories"], (current = []) =>
      current.map((repo) => (ids.includes(repo.id) ? { ...repo, selected } : repo)),
    );

    const { error } = await supabase.from("repositories").update({ selected }).in("id", ids);
    if (error) {
      qc.setQueryData(["repositories"], previous);
      toast.error(error.message);
      return;
    }

    qc.invalidateQueries({ queryKey: ["journey-counts"] });
  };

  const progress = syncing
    ? 68
    : hasSyncedWork
      ? 100
      : selectedCount
        ? 62
        : importedCount
          ? 42
          : connected
            ? 24
            : 8;

  return (
    <AppShell
      title="Set up your evidence sources"
      description="Connect GitHub, choose the repositories that contain relevant work, then sync commits and merged PRs for the period you want to turn into evidence."
    >
      <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,360px)]">
        <div className="min-w-0 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <CardTitle className="flex items-center gap-2">
                    <Github className="h-5 w-5" /> GitHub connection
                  </CardTitle>
                  <CardDescription>
                    {connected
                      ? `Connected as ${status.data?.login}. Import again whenever your GitHub access changes.`
                      : "Connect GitHub to import the repositories this workspace can inspect."}
                  </CardDescription>
                </div>
                {connected ? (
                  <Badge variant="secondary">Connected</Badge>
                ) : (
                  <Badge variant="outline">Not connected</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {connected ? (
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    onClick={() => importRepositories.mutate()}
                    disabled={importRepositories.isPending || syncing}
                  >
                    {importRepositories.isPending
                      ? "Importing..."
                      : importedCount
                        ? "Refresh repository list"
                        : "Import repositories"}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => disconnect.mutate()}
                    disabled={disconnect.isPending || syncing}
                  >
                    Disconnect
                  </Button>
                  {importSummary != null ? (
                    <span className="text-sm text-muted-foreground">
                      Last import found {plural(importSummary, "repository", "repositories")}.
                    </span>
                  ) : null}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Button onClick={() => oauth.mutate()} disabled={oauth.isPending}>
                      {oauth.isPending ? "Opening GitHub..." : "Connect with GitHub"}
                    </Button>
                    {status.isError ? (
                      <p className="text-sm text-muted-foreground">
                        Connection status could not refresh. You can still try OAuth.
                      </p>
                    ) : null}
                  </div>
                  <div className="grid gap-2 rounded-lg border border-dashed border-border p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                    <div className="min-w-0 space-y-1.5">
                      <Label htmlFor="pat">Personal access token fallback</Label>
                      <Input
                        id="pat"
                        type="password"
                        placeholder="ghp_..."
                        value={token}
                        onChange={(event) => setToken(event.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Use this only if the GitHub browser redirect is blocked.
                      </p>
                    </div>
                    <Button
                      className="w-full sm:w-auto"
                      onClick={() => connect.mutate()}
                      disabled={!token || connect.isPending}
                    >
                      {connect.isPending ? "Connecting..." : "Connect token"}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <CardTitle>Choose repositories</CardTitle>
                  <CardDescription>
                    Select the repositories whose commits and merged pull requests should become
                    evidence.
                  </CardDescription>
                </div>
                <Badge variant={selectedCount ? "secondary" : "outline"}>
                  {selectedCount} selected
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {syncing ? (
                <Alert>
                  <LockNotice />
                  <AlertTitle>Selections are locked during sync</AlertTitle>
                  <AlertDescription>
                    The selected repository set is being used right now, so changes are disabled
                    until this sync finishes.
                  </AlertDescription>
                </Alert>
              ) : null}

              <div className="flex min-w-0 flex-col gap-3 rounded-lg border border-border bg-surface p-3 md:flex-row md:items-center md:justify-between">
                <label
                  className={cn(
                    "flex min-h-11 min-w-0 cursor-pointer items-center gap-3",
                    syncing && "cursor-not-allowed opacity-60",
                  )}
                >
                  <Checkbox
                    checked={
                      allVisibleSelected ? true : someVisibleSelected ? "indeterminate" : false
                    }
                    disabled={!filteredRepos.length || syncing}
                    onCheckedChange={(value) => setRepoSelection(visibleIds, value === true)}
                    aria-label="Select all visible repositories"
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">
                      Select all {filter ? "visible" : "imported"} repositories
                    </span>
                    <span className="break-anywhere block text-xs text-muted-foreground">
                      {visibleSelectedCount} of {filteredRepos.length} shown repos selected
                    </span>
                  </span>
                </label>
                <div className="relative w-full min-w-0 md:w-72">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={filter}
                    onChange={(event) => setFilter(event.target.value)}
                    placeholder="Filter repositories"
                    className="pl-9"
                    disabled={!importedCount}
                  />
                </div>
              </div>

              {repos.isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : filteredRepos.length ? (
                <div className="grid gap-2">
                  {filteredRepos.map((repo) => (
                    <label
                      key={repo.id}
                      className={cn(
                        "grid min-h-16 cursor-pointer grid-cols-[auto_minmax(0,1fr)] gap-3 rounded-lg border border-border bg-card p-3 transition-colors hover:bg-secondary sm:grid-cols-[auto_minmax(0,1fr)_auto]",
                        repo.selected && "border-primary/45 bg-primary/5",
                        syncing && "cursor-not-allowed opacity-65 hover:bg-card",
                      )}
                    >
                      <Checkbox
                        checked={repo.selected}
                        disabled={syncing}
                        onCheckedChange={(value) => setRepoSelection([repo.id], value === true)}
                        className="mt-1"
                        aria-label={`Select ${repo.full_name}`}
                      />
                      <span className="min-w-0">
                        <span className="break-anywhere block font-mono text-sm">
                          {repo.full_name}
                        </span>
                        {repo.description ? (
                          <span className="break-anywhere mt-0.5 block text-xs text-muted-foreground">
                            {repo.description}
                          </span>
                        ) : null}
                        {repo.last_synced_at ? (
                          <span className="mt-1 block text-xs text-muted-foreground">
                            Last synced {new Date(repo.last_synced_at).toLocaleDateString()}
                          </span>
                        ) : null}
                      </span>
                      <span className="col-start-2 flex min-w-0 flex-wrap gap-1.5 sm:col-start-auto sm:justify-end">
                        {repo.primary_language ? (
                          <Badge variant="secondary" className="max-w-full text-[10px]">
                            {repo.primary_language}
                          </Badge>
                        ) : null}
                        {repo.is_private ? (
                          <Badge variant="outline" className="max-w-full text-[10px]">
                            private
                          </Badge>
                        ) : null}
                      </span>
                    </label>
                  ))}
                </div>
              ) : importedCount ? (
                <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                  No repositories match your filter.
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                  No repositories imported yet. Connect GitHub, then import your repositories.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <aside className="min-w-0 space-y-4 lg:sticky lg:top-4 lg:self-start">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5" /> Sync work
              </CardTitle>
              <CardDescription>
                This date range filters commits and merged pull requests inside the selected repos.
                It does not filter repos by creation date.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Progress value={progress} aria-label="Source setup progress" />
              <div className="grid gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="from">Commit/PR date range starts</Label>
                  <Input
                    id="from"
                    type="date"
                    value={from}
                    disabled={syncing}
                    onChange={(event) => setFrom(event.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="to">Commit/PR date range ends</Label>
                  <Input
                    id="to"
                    type="date"
                    value={to}
                    disabled={syncing}
                    onChange={(event) => setTo(event.target.value)}
                  />
                </div>
              </div>
              <Button
                className="min-h-11 w-full"
                onClick={() => sync.mutate()}
                disabled={!connected || selectedCount === 0 || syncing}
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
                {syncing ? "Syncing selected work..." : "Sync selected work"}
              </Button>
              <p className="text-xs text-muted-foreground">
                Ready to scan {plural(selectedCount, "selected repo", "selected repos")} from {from}{" "}
                to {to}.
              </p>
            </CardContent>
          </Card>

          {syncing ? (
            <Alert>
              <RefreshCw className="h-4 w-4 animate-spin" />
              <AlertTitle>Sync in progress</AlertTitle>
              <AlertDescription>
                Keep this page open. Repository selection is paused until the selected work has
                finished syncing.
              </AlertDescription>
            </Alert>
          ) : hasSyncedWork ? (
            <Alert className="border-primary/40 bg-primary/5">
              <CheckCircle2 className="h-4 w-4" />
              <AlertTitle>Work synced successfully</AlertTitle>
              <AlertDescription className="space-y-3">
                <p>
                  {syncSummary
                    ? `Found ${plural(syncSummary.commits, "commit")} and ${plural(syncSummary.pullRequests, "merged PR")} across ${plural(syncSummary.repos, "repository", "repositories")}.`
                    : `You already have ${plural(contributionCount.data ?? 0, "synced work item")} ready for analysis.`}
                </p>
                {syncSummary?.skipped.length ? (
                  <p className="break-anywhere">
                    Skipped {syncSummary.skipped.length} repo(s):{" "}
                    {syncSummary.skipped.slice(0, 3).join(", ")}
                    {syncSummary.skipped.length > 3 ? "..." : ""}
                  </p>
                ) : null}
                <Button asChild className="w-full">
                  <Link href="/achievements">
                    <Inbox className="mr-2 h-4 w-4" /> Review evidence inbox
                  </Link>
                </Button>
              </AlertDescription>
            </Alert>
          ) : (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Next step appears after sync</AlertTitle>
              <AlertDescription>
                Import repos, select the ones that matter, then sync. The evidence inbox link will
                appear here when there is work to review.
              </AlertDescription>
            </Alert>
          )}
        </aside>
      </div>
    </AppShell>
  );
}

function LockNotice() {
  return <RefreshCw className="h-4 w-4 animate-spin" />;
}
