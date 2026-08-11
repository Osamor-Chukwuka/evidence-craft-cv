import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { FileText } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { buildCv } from "@/lib/ai.functions";
import type { CvContent } from "@/server/cv.types";

export const Route = createFileRoute("/_authenticated/cv")({
  head: () => ({
    meta: [
      { title: "CV — Commit Trail" },
      {
        name: "description",
        content: "Generate an internal CV from the work items you approved, backed by real evidence.",
      },
      { property: "og:title", content: "CV — Commit Trail" },
      { property: "og:description", content: "An engineering CV built only from work you can prove." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CvPage,
});

function CvPage() {
  const qc = useQueryClient();
  const build = useServerFn(buildCv);
  const [targetRole, setTargetRole] = useState("");
  const [title, setTitle] = useState("Engineering CV");

  const cvs = useQuery({
    queryKey: ["cvs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cvs")
        .select("id, title, target_role, content, created_at, model")
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return data;
    },
  });

  const generate = useMutation({
    mutationFn: () => build({ data: { targetRole: targetRole || null, title } }),
    onSuccess: (r) => {
      toast.success(`CV generated with ${r.model}.`);
      qc.invalidateQueries({ queryKey: ["cvs"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const latest = cvs.data?.[0];
  const content = latest?.content as unknown as CvContent | null;

  return (
    <AppShell
      title="Step 4 · Your CV"
      description="Built only from approved work items. Every bullet traces back to a commit or merged PR."
    >
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-lg">Generate</CardTitle>
          <CardDescription>Optionally target a role to shape emphasis and ordering.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div className="min-w-48 space-y-1.5">
            <Label htmlFor="cv-title">Title</Label>
            <Input id="cv-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="min-w-56 flex-1 space-y-1.5">
            <Label htmlFor="role">Target role</Label>
            <Input
              id="role"
              placeholder="Senior Backend Engineer"
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
            />
          </div>
          <Button onClick={() => generate.mutate()} disabled={generate.isPending}>
            <FileText className="mr-2 h-4 w-4" />
            {generate.isPending ? "Generating…" : "Generate CV"}
          </Button>
        </CardContent>
      </Card>

      {cvs.isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : content ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">{content.headline}</CardTitle>
            <CardDescription>{content.summary}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            {content.skills?.length ? (
              <section>
                <h2 className="mb-3 text-sm uppercase tracking-wide text-muted-foreground">Skills</h2>
                <div className="space-y-1.5">
                  {content.skills.map((group) => (
                    <p key={group.category} className="text-sm">
                      <span className="font-medium">{group.category}: </span>
                      <span className="text-muted-foreground">{group.items?.join(", ")}</span>
                    </p>
                  ))}
                </div>
              </section>
            ) : null}

            {content.experience?.length ? (
              <section>
                <h2 className="mb-3 text-sm uppercase tracking-wide text-muted-foreground">
                  Experience
                </h2>
                <div className="space-y-5">
                  {content.experience.map((role) => (
                    <div key={`${role.title}-${role.period}`}>
                      <p className="font-medium">{role.title}</p>
                      <p className="font-mono text-xs text-muted-foreground">
                        {role.context} · {role.period}
                      </p>
                      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                        {role.bullets?.map((b) => <li key={b}>{b}</li>)}
                      </ul>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {content.projects?.length ? (
              <section>
                <h2 className="mb-3 text-sm uppercase tracking-wide text-muted-foreground">Projects</h2>
                <div className="space-y-5">
                  {content.projects.map((project) => (
                    <div key={project.name}>
                      <p className="font-medium">{project.name}</p>
                      <p className="text-xs text-muted-foreground">{project.description}</p>
                      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                        {project.bullets?.map((b) => <li key={b}>{b}</li>)}
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
            No CV yet — approve some work items, then generate one.
          </CardContent>
        </Card>
      )}
    </AppShell>
  );
}
