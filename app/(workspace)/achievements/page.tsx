"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Check, ExternalLink, Sparkles, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  analyzeRepoAction,
  analyzeSelectedReposAction,
  getAiConfigStatusAction,
} from "@/actions/ai";
import { AppShell } from "@/components/AppShell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { getAnalysisErrorMessage } from "@/lib/user-facing-errors";
import { cn } from "@/lib/utils";

type Achievement = {
  id: string;
  title: string;
  bullet: string;
  impact: string | null;
  category: string | null;
  skills: unknown;
  evidence: unknown;
  confidence: number | null;
  included: boolean;
  repository_id: string | null;
};

type SelectedRepo = {
  id: string;
  full_name: string;
};

type AnalysisSummary = {
  created: number;
  analyzed: number;
  selected: number;
  skipped: string[];
  message?: string;
};

function asArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

export default function AchievementsPage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Record<string, string>>({});
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisSummary, setAnalysisSummary] = useState<AnalysisSummary | null>(null);

  const aiStatus = useQuery({
    queryKey: ["ai-config-status"],
    queryFn: () => getAiConfigStatusAction(),
  });

  const repos = useQuery({
    queryKey: ["selected-repos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("repositories")
        .select("id, full_name")
        .eq("selected", true);
      if (error) throw new Error(error.message);
      return data as SelectedRepo[];
    },
  });

  const achievements = useQuery({
    queryKey: ["achievements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("achievements")
        .select(
          "id, title, bullet, impact, category, skills, evidence, confidence, included, repository_id",
        )
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return data as Achievement[];
    },
  });

  const run = useMutation({
    mutationFn: (repositoryId: string) => analyzeRepoAction({ repositoryId }),
    onSuccess: (result) => {
      const message =
        ("message" in result && typeof result.message === "string" ? result.message : null) ??
        "No synced commits or merged PRs were found for this repository. Sync work for it first, then analyze again.";
      setAnalysisError(null);
      setAnalysisSummary({
        created: result.created,
        analyzed: result.created ? 1 : 0,
        selected: 1,
        skipped: [],
        ...(result.created ? {} : { message }),
      });
      if (result.created) toast.success(`Generated ${result.created} work items.`);
      else toast.info(message);
      qc.invalidateQueries({ queryKey: ["achievements"] });
      qc.invalidateQueries({ queryKey: ["journey-counts"] });
    },
    onError: (error: Error) => {
      const message = getAnalysisErrorMessage(error);
      setAnalysisError(message);
      toast.error(message);
    },
  });

  const runAll = useMutation({
    mutationFn: () => analyzeSelectedReposAction(),
    onSuccess: (result) => {
      const message =
        ("message" in result && typeof result.message === "string" ? result.message : null) ??
        "No synced commits or merged PRs were found in the selected repositories. Sync recent work first, then analyze again.";
      setAnalysisError(null);
      setAnalysisSummary(result);
      if (result.created) {
        toast.success(
          `Generated ${result.created} work items from ${result.analyzed} repositories.`,
        );
      } else {
        toast.info(message);
      }
      qc.invalidateQueries({ queryKey: ["achievements"] });
      qc.invalidateQueries({ queryKey: ["journey-counts"] });
    },
    onError: (error: Error) => {
      const message = getAnalysisErrorMessage(error);
      setAnalysisSummary(null);
      setAnalysisError(message);
      toast.error(message);
    },
  });

  const updateAchievement = useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string;
      patch: { bullet?: string; included?: boolean };
    }) => {
      const { error } = await supabase.from("achievements").update(patch).eq("id", id);
      if (error) throw new Error(error.message);
      return { id, patch };
    },
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: ["achievements"] });
      const previous = qc.getQueryData<Achievement[]>(["achievements"]);

      qc.setQueryData<Achievement[]>(["achievements"], (current = []) =>
        current.map((item) => (item.id === id ? { ...item, ...patch } : item)),
      );

      return { previous };
    },
    onError: (error: Error, _variables, context) => {
      if (context?.previous) qc.setQueryData(["achievements"], context.previous);
      toast.error(error.message);
    },
    onSuccess: ({ patch }) => {
      if (patch.included === true) toast.success("Kept for your CV.");
      if (patch.included === false) toast.success("Removed from CV draft.");
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["achievements"] });
      qc.invalidateQueries({ queryKey: ["journey-counts"] });
    },
  });

  const repoName = (id: string | null) =>
    repos.data?.find((repo) => repo.id === id)?.full_name ?? "repository";

  const approved = achievements.data?.filter((item) => item.included).length ?? 0;
  const selectedRepoCount = repos.data?.length ?? 0;
  const analysisBusy = run.isPending || runAll.isPending;

  return (
    <AppShell
      title="Review your evidence inbox"
      description="Generate work items from synced repositories, then keep only the claims you would be comfortable defending in an interview."
      actions={
        <div className="rounded-md border border-border bg-card px-3 py-2 text-sm text-muted-foreground">
          <span className="font-mono text-foreground">{approved}</span> approved
        </div>
      }
    >
      <Card className="mb-4">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <CardTitle>Analyze selected repositories</CardTitle>
              <CardDescription>
                Run one evidence pass across every repository selected in Source setup.
              </CardDescription>
            </div>
            <Badge variant={selectedRepoCount ? "secondary" : "outline"}>
              {selectedRepoCount} selected
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {runAll.isPending ? (
            <Alert>
              <Sparkles className="h-4 w-4 animate-pulse" />
              <AlertTitle>Analyzing selected repositories</AlertTitle>
              <AlertDescription>
                This can take a few minutes for larger repository sets. The generated work items
                will appear below when the pass finishes.
              </AlertDescription>
            </Alert>
          ) : null}

          {analysisSummary ? (
            <Alert
              className={cn(
                analysisSummary.created ? "border-primary/40 bg-primary/5" : "bg-surface",
              )}
            >
              {analysisSummary.created ? (
                <Check className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <AlertTitle>
                {analysisSummary.created ? "Evidence pass complete" : "No work found to analyze"}
              </AlertTitle>
              <AlertDescription>
                {analysisSummary.message ??
                  `Generated ${analysisSummary.created} work items from ${analysisSummary.analyzed} of ${analysisSummary.selected} selected repositories.`}
                {analysisSummary.created && analysisSummary.skipped.length
                  ? ` ${analysisSummary.skipped.length} repo(s) had no usable synced work.`
                  : ""}
              </AlertDescription>
            </Alert>
          ) : null}

          <div className="flex min-w-0 flex-col items-start gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <Button
              className="min-h-11 w-full sm:w-auto"
              disabled={
                selectedRepoCount === 0 || analysisBusy || aiStatus.data?.configured === false
              }
              onClick={() => runAll.mutate()}
            >
              <Sparkles className={`mr-2 h-4 w-4 ${runAll.isPending ? "animate-pulse" : ""}`} />
              {runAll.isPending
                ? "Analyzing selected repos..."
                : `Analyze all ${selectedRepoCount || ""} selected repos`.trim()}
            </Button>
            {selectedRepoCount ? (
              <p className="break-anywhere text-sm text-muted-foreground">
                Uses your selected repo scope. No need to run repositories one by one.
              </p>
            ) : null}
          </div>

          <div className="rounded-lg border border-border bg-surface p-3">
            <p className="text-sm font-medium">Need to rerun just one repository?</p>
            <CardDescription>
              Use these secondary actions only when you want to refresh one repo without rerunning
              the full selected set.
            </CardDescription>
          </div>

          {aiStatus.data && !aiStatus.data.configured ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Analysis is not available yet</AlertTitle>
              <AlertDescription>
                You can still connect GitHub, import repositories, and sync work. Evidence
                generation will be available once analysis is enabled for this workspace.
              </AlertDescription>
            </Alert>
          ) : null}
          {analysisError ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Analysis could not run</AlertTitle>
              <AlertDescription>{analysisError}</AlertDescription>
            </Alert>
          ) : null}
          <div className="grid min-w-0 gap-2 sm:flex sm:flex-wrap">
            {repos.isLoading ? (
              <Skeleton className="h-11 w-56" />
            ) : repos.data?.length ? (
              repos.data.map((repo) => (
                <Button
                  key={repo.id}
                  className="h-auto min-h-11 max-w-full justify-start gap-2 whitespace-normal px-2.5 py-2 text-left"
                  size="sm"
                  variant="outline"
                  disabled={analysisBusy || aiStatus.data?.configured === false}
                  onClick={() => run.mutate(repo.id)}
                >
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-primary">
                    Rerun
                  </span>
                  <span className="h-4 w-px bg-border" aria-hidden="true" />
                  <span className="break-anywhere min-w-0 font-mono text-xs text-foreground">
                    {repo.full_name}
                  </span>
                </Button>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Select and sync repositories first.</p>
            )}
          </div>
        </CardContent>
      </Card>

      <section className="grid gap-4">
        {achievements.isLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : achievements.data?.length ? (
          achievements.data.map((item) => {
            const draft = editing[item.id] ?? item.bullet;
            const isEdited = draft !== item.bullet;
            const isUpdating =
              updateAchievement.isPending && updateAchievement.variables?.id === item.id;

            return (
              <Card
                key={item.id}
                className={cn(
                  "transition-colors",
                  item.included ? "border-primary/45 bg-primary/5" : "opacity-80",
                )}
              >
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <CardTitle className="break-anywhere text-lg">{item.title}</CardTitle>
                      {item.impact ? (
                        <CardDescription className="break-anywhere mt-1">
                          {item.impact}
                        </CardDescription>
                      ) : null}
                    </div>
                    <div className="flex min-w-0 flex-wrap gap-1.5 sm:justify-end">
                      <Badge variant={item.included ? "secondary" : "outline"}>
                        {item.included ? "Kept for CV" : "Needs review"}
                      </Badge>
                      {item.category ? <Badge variant="secondary">{item.category}</Badge> : null}
                      <Badge
                        variant="outline"
                        className="break-anywhere max-w-full font-mono text-[10px]"
                      >
                        {repoName(item.repository_id)}
                      </Badge>
                      {item.confidence != null ? (
                        <Badge variant="outline" className="font-mono text-[10px]">
                          {Math.round(Number(item.confidence) * 100)}%
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Textarea
                    value={draft}
                    onChange={(event) =>
                      setEditing((state) => ({ ...state, [item.id]: event.target.value }))
                    }
                    rows={3}
                  />
                  {asArray(item.skills).length ? (
                    <div className="flex flex-wrap gap-1.5">
                      {asArray(item.skills).map((skill) => (
                        <Badge key={skill} variant="secondary" className="text-[10px]">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  ) : null}
                  {asArray(item.evidence).length ? (
                    <div className="flex min-w-0 flex-wrap gap-2 text-xs">
                      {asArray(item.evidence).map((url, index) => (
                        <a
                          key={url}
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="break-anywhere inline-flex min-w-0 items-center gap-1 font-mono text-primary underline-offset-2 hover:underline"
                        >
                          evidence[{index}] <ExternalLink className="h-3 w-3" />
                        </a>
                      ))}
                    </div>
                  ) : null}
                  <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                    <Button
                      size="sm"
                      className="w-full sm:w-auto"
                      onClick={() =>
                        updateAchievement.mutate({
                          id: item.id,
                          patch: { bullet: draft, included: true },
                        })
                      }
                      disabled={isUpdating}
                      variant={item.included ? "secondary" : "default"}
                    >
                      <Check className="mr-2 h-4 w-4" />
                      {isUpdating
                        ? "Saving..."
                        : item.included
                          ? isEdited
                            ? "Save CV copy"
                            : "Kept for CV"
                          : "Keep for CV"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="w-full sm:w-auto"
                      onClick={() =>
                        updateAchievement.mutate({ id: item.id, patch: { included: false } })
                      }
                      disabled={isUpdating || !item.included}
                    >
                      <X className="mr-2 h-4 w-4" />
                      {item.included ? "Remove from CV" : "Not CV-worthy"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              No work items yet. Analyze a synced repository above.
            </CardContent>
          </Card>
        )}
      </section>
    </AppShell>
  );
}
