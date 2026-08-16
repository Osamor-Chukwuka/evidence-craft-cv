"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { buildCvAction } from "@/actions/ai";
import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { getAnalysisErrorMessage } from "@/lib/user-facing-errors";
import type { CvContent } from "@/server/cv.types";

export default function CvPage() {
  const qc = useQueryClient();
  const [targetRole, setTargetRole] = useState("");
  const [title, setTitle] = useState("Evidence-backed CV");

  const cvs = useQuery({
    queryKey: ["cvs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cvs")
        .select("id, title, target_role, content, created_at")
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return data;
    },
  });

  const generate = useMutation({
    mutationFn: () => buildCvAction({ targetRole: targetRole || null, title }),
    onSuccess: () => {
      toast.success("CV generated.");
      qc.invalidateQueries({ queryKey: ["cvs"] });
      qc.invalidateQueries({ queryKey: ["journey-counts"] });
    },
    onError: (error: Error) => toast.error(getAnalysisErrorMessage(error)),
  });

  const latest = cvs.data?.[0];
  const content = latest?.content as unknown as CvContent | null;

  return (
    <AppShell
      title="Assemble your CV"
      description="Generate a structured CV from the evidence you approved. This keeps the final document separate from raw GitHub activity and draft suggestions."
      actions={
        latest ? (
          <Badge variant="secondary" className="px-3 py-1.5">
            Latest: {new Date(latest.created_at).toLocaleDateString()}
          </Badge>
        ) : null
      }
    >
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" /> Generate a version
          </CardTitle>
          <CardDescription>Use a target role to tune emphasis and ordering.</CardDescription>
        </CardHeader>
        <CardContent className="grid min-w-0 gap-3 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)_auto] md:items-end">
          <div className="min-w-0 space-y-1.5">
            <Label htmlFor="cv-title">Version title</Label>
            <Input id="cv-title" value={title} onChange={(event) => setTitle(event.target.value)} />
          </div>
          <div className="min-w-0 space-y-1.5">
            <Label htmlFor="role">Target role</Label>
            <Input
              id="role"
              placeholder="Senior Backend Engineer"
              value={targetRole}
              onChange={(event) => setTargetRole(event.target.value)}
            />
          </div>
          <Button
            className="w-full md:w-auto"
            onClick={() => generate.mutate()}
            disabled={generate.isPending}
          >
            <FileText className="mr-2 h-4 w-4" />
            {generate.isPending ? "Generating..." : "Generate CV"}
          </Button>
        </CardContent>
      </Card>

      {cvs.isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : content ? (
        <Card className="cv-document">
          <CardHeader>
            <CardTitle className="break-anywhere text-2xl">{content.headline}</CardTitle>
            <CardDescription className="break-anywhere text-base">
              {content.summary}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            {content.skills?.length ? (
              <section>
                <h2 className="mb-3 text-sm font-semibold uppercase text-muted-foreground">
                  Skills
                </h2>
                <div className="grid min-w-0 gap-2 md:grid-cols-2">
                  {content.skills.map((group) => (
                    <p
                      key={group.category}
                      className="break-anywhere rounded-md bg-surface p-3 text-sm"
                    >
                      <span className="font-medium">{group.category}: </span>
                      <span className="text-muted-foreground">{group.items?.join(", ")}</span>
                    </p>
                  ))}
                </div>
              </section>
            ) : null}

            {content.experience?.length ? (
              <section>
                <h2 className="mb-3 text-sm font-semibold uppercase text-muted-foreground">
                  Experience
                </h2>
                <div className="space-y-5">
                  {content.experience.map((role) => (
                    <div
                      key={`${role.title}-${role.period}`}
                      className="rounded-md border border-border bg-surface p-4"
                    >
                      <p className="break-anywhere font-medium">{role.title}</p>
                      <p className="break-anywhere font-mono text-xs text-muted-foreground">
                        {role.context} - {role.period}
                      </p>
                      <ul className="break-anywhere mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                        {role.bullets?.map((bullet) => (
                          <li key={bullet}>{bullet}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {content.projects?.length ? (
              <section>
                <h2 className="mb-3 text-sm font-semibold uppercase text-muted-foreground">
                  Projects
                </h2>
                <div className="grid min-w-0 gap-4 md:grid-cols-2">
                  {content.projects.map((project) => (
                    <div
                      key={project.name}
                      className="rounded-md border border-border bg-surface p-4"
                    >
                      <p className="break-anywhere font-medium">{project.name}</p>
                      <p className="break-anywhere mt-1 text-xs text-muted-foreground">
                        {project.description}
                      </p>
                      <ul className="break-anywhere mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                        {project.bullets?.map((bullet) => (
                          <li key={bullet}>{bullet}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No CV yet. Approve evidence first, then generate a version here.
          </CardContent>
        </Card>
      )}
    </AppShell>
  );
}
