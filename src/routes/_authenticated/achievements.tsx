import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Check, Sparkles, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { analyzeRepo } from "@/lib/ai.functions";

export const Route = createFileRoute("/_authenticated/achievements")({
  head: () => ({
    meta: [
      { title: "Work items — Commit Trail" },
      {
        name: "description",
        content: "Review AI-recovered work items backed by your commits and merged pull requests.",
      },
      { property: "og:title", content: "Work items — Commit Trail" },
      { property: "og:description", content: "Approve, edit, or reject evidence-backed achievements." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AchievementsPage,
});

function AchievementsPage() {
  const qc = useQueryClient();
  const analyze = useServerFn(analyzeRepo);
  const [editing, setEditing] = useState<Record<string, string>>({});

  const repos = useQuery({
    queryKey: ["selected-repos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("repositories")
        .select("id, full_name")
        .eq("selected", true);
      if (error) throw new Error(error.message);
      return data;
    },
  });

  const achievements = useQuery({
    queryKey: ["achievements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("achievements")
        .select("id, title, bullet, impact, category, skills, evidence, confidence, included, repository_id")
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return data;
    },
  });

  const run = useMutation({
    mutationFn: (repositoryId: string) => analyze({ data: { repositoryId } }),
    onSuccess: (r) => {
      toast.success(`Generated ${r.created} work items with ${r.model}.`);
      qc.invalidateQueries({ queryKey: ["achievements"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const update = async (id: string, patch: Record<string, unknown>) => {
    const { error } = await supabase.from("achievements").update(patch).eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    qc.invalidateQueries({ queryKey: ["achievements"] });
  };

  const repoName = (id: string | null) =>
    repos.data?.find((r) => r.id === id)?.full_name ?? "repository";

  return (
    <AppShell
      title="Work items"
      description="Each item is clustered from real commits and merged PRs. Approve what is accurate, edit what is not."
    >
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-lg">Discover work</CardTitle>
          <CardDescription>Analyze a synced repository to recover its achievements.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {repos.isLoading ? (
            <Skeleton className="h-9 w-48" />
          ) : repos.data?.length ? (
            repos.data.map((repo) => (
              <Button
                key={repo.id}
                variant="secondary"
                size="sm"
                disabled={run.isPending}
                onClick={() => run.mutate(repo.id)}
              >
                <Sparkles className="mr-2 h-3.5 w-3.5" />
                <span className="font-mono text-xs">{repo.full_name}</span>
              </Button>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">Select and sync repositories first.</p>
          )}
        </CardContent>
      </Card>

      <div className="space-y-4">
        {achievements.isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : achievements.data?.length ? (
          achievements.data.map((item) => (
            <Card key={item.id} className={item.included ? "" : "opacity-60"}>
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <CardTitle className="text-base">{item.title}</CardTitle>
                  <div className="flex gap-1.5">
                    {item.category ? <Badge variant="secondary">{item.category}</Badge> : null}
                    <Badge variant="outline" className="font-mono text-[10px]">
                      {repoName(item.repository_id)}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <Textarea
                  value={editing[item.id] ?? item.bullet}
                  onChange={(e) => setEditing((s) => ({ ...s, [item.id]: e.target.value }))}
                  rows={3}
                />
                {(item.skills ?? []).length ? (
                  <div className="flex flex-wrap gap-1.5">
                    {(item.skills ?? []).map((skill: string) => (
                      <Badge key={skill} variant="secondary" className="text-[10px]">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                ) : null}
                {(item.evidence ?? []).length ? (
                  <div className="flex flex-wrap gap-2 text-xs">
                    {(item.evidence ?? []).map((url: string, i: number) => (
                      <a
                        key={url}
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="font-mono text-accent underline-offset-2 hover:underline"
                      >
                        evidence[{i}]
                      </a>
                    ))}
                  </div>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    onClick={() =>
                      update(item.id, {
                        bullet: editing[item.id] ?? item.bullet,
                        included: true,
                        reviewed: true,
                      })
                    }
                  >
                    <Check className="mr-2 h-3.5 w-3.5" /> Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => update(item.id, { included: false, reviewed: true })}
                  >
                    <X className="mr-2 h-3.5 w-3.5" /> Reject
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              No work items yet — analyze a repository above.
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
