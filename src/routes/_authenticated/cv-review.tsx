import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Check, ScanSearch, Upload, X } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { compareCv, decideCvGap, uploadCv } from "@/lib/cv-review.functions";

export const Route = createFileRoute("/_authenticated/cv-review")({
  head: () => ({
    meta: [
      { title: "CV Review — Commit Trail" },
      {
        name: "description",
        content:
          "Upload your current CV and compare it against your real git history to find vague, missing, or unsupported entries.",
      },
      { property: "og:title", content: "CV Review — Commit Trail" },
      {
        property: "og:description",
        content: "Find the vague and missing entries in your CV, backed by commit evidence.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CvReviewPage,
});

const TEXT_TYPES = [".txt", ".md", ".markdown", ".text"];

function readFile(file: File): Promise<{ text?: string; fileData?: string }> {
  const isText =
    file.type.startsWith("text/") || TEXT_TYPES.some((ext) => file.name.toLowerCase().endsWith(ext));
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read that file"));
    reader.onload = () =>
      resolve(isText ? { text: String(reader.result) } : { fileData: String(reader.result) });
    if (isText) reader.readAsText(file);
    else reader.readAsDataURL(file);
  });
}

const KIND_LABEL: Record<string, string> = {
  vague: "Vague entry",
  missing: "Missing work",
  unsupported: "Unsupported claim",
};

function CvReviewPage() {
  const qc = useQueryClient();
  const uploadFn = useServerFn(uploadCv);
  const compareFn = useServerFn(compareCv);
  const decideFn = useServerFn(decideCvGap);
  const fileInput = useRef<HTMLInputElement>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const uploads = useQuery({
    queryKey: ["cv-uploads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cv_uploads")
        .select("id, file_name, created_at")
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return data;
    },
  });

  const latestUpload = uploads.data?.[0];

  const gaps = useQuery({
    queryKey: ["cv-gaps", latestUpload?.id],
    enabled: Boolean(latestUpload?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cv_gaps")
        .select("id, kind, section, cv_excerpt, issue, suggestion, skills, evidence, confidence, status")
        .eq("upload_id", latestUpload!.id)
        .order("status", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw new Error(error.message);
      return data;
    },
  });

  const upload = useMutation({
    mutationFn: async (file: File) => {
      const payload = await readFile(file);
      return uploadFn({
        data: {
          fileName: file.name,
          mimeType: file.type || "application/octet-stream",
          ...payload,
        },
      });
    },
    onSuccess: () => {
      toast.success("CV parsed. Run the comparison next.");
      qc.invalidateQueries({ queryKey: ["cv-uploads"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const compare = useMutation({
    mutationFn: () => compareFn({ data: { uploadId: latestUpload!.id } }),
    onSuccess: (r) => {
      toast.success(`Found ${r.count} items to review.`);
      qc.invalidateQueries({ queryKey: ["cv-gaps"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const decide = useMutation({
    mutationFn: (vars: { gapId: string; decision: "approved" | "rejected"; suggestion?: string }) =>
      decideFn({ data: vars }),
    onSuccess: (_r, vars) => {
      toast.success(vars.decision === "approved" ? "Added to your internal CV." : "Rejected.");
      qc.invalidateQueries({ queryKey: ["cv-gaps"] });
      qc.invalidateQueries({ queryKey: ["achievements"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const pending = gaps.data?.filter((g) => g.status === "pending") ?? [];
  const decided = gaps.data?.filter((g) => g.status !== "pending") ?? [];

  return (
    <AppShell
      title="CV review"
      description="Upload your current CV, compare it against your verified git history, then approve the suggestions worth keeping."
    >
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-lg">1 · Upload your CV</CardTitle>
          <CardDescription>
            PDF, plain text, or markdown. The text is extracted and structured — nothing is invented.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <input
            ref={fileInput}
            type="file"
            accept=".pdf,.txt,.md,.markdown,text/plain,application/pdf"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) upload.mutate(file);
              e.target.value = "";
            }}
          />
          <Button onClick={() => fileInput.current?.click()} disabled={upload.isPending}>
            <Upload className="mr-2 h-4 w-4" />
            {upload.isPending ? "Parsing…" : "Choose CV file"}
          </Button>
          {latestUpload ? (
            <p className="font-mono text-xs text-muted-foreground">
              current: {latestUpload.file_name}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-lg">2 · Compare against your evidence</CardTitle>
          <CardDescription>
            Flags vague entries, work missing from your CV, and claims your git history does not support.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={() => compare.mutate()}
            disabled={!latestUpload || compare.isPending}
          >
            <ScanSearch className="mr-2 h-4 w-4" />
            {compare.isPending ? "Comparing…" : "Run comparison"}
          </Button>
        </CardContent>
      </Card>

      <section className="space-y-4">
        <h2 className="text-sm uppercase tracking-wide text-muted-foreground">
          3 · Review suggestions
        </h2>

        {gaps.isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : pending.length === 0 && decided.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Nothing to review yet — upload a CV and run the comparison.
            </CardContent>
          </Card>
        ) : null}

        {pending.map((gap) => {
          const evidence = Array.isArray(gap.evidence)
            ? (gap.evidence as Array<{ label?: string; url?: string }>)
            : [];
          return (
            <Card key={gap.id}>
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={gap.kind === "unsupported" ? "destructive" : "secondary"}>
                    {KIND_LABEL[gap.kind] ?? gap.kind}
                  </Badge>
                  {gap.section ? (
                    <span className="font-mono text-xs text-muted-foreground">{gap.section}</span>
                  ) : null}
                  {gap.confidence != null ? (
                    <span className="ml-auto font-mono text-xs text-muted-foreground">
                      {Math.round(Number(gap.confidence) * 100)}% confidence
                    </span>
                  ) : null}
                </div>
                <CardDescription className="pt-2">{gap.issue}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {gap.cv_excerpt ? (
                  <p className="border-l-2 border-border pl-3 text-sm italic text-muted-foreground">
                    “{gap.cv_excerpt}”
                  </p>
                ) : null}

                <Textarea
                  value={drafts[gap.id] ?? gap.suggestion}
                  onChange={(e) => setDrafts((d) => ({ ...d, [gap.id]: e.target.value }))}
                  rows={3}
                />

                {gap.skills?.length ? (
                  <div className="flex flex-wrap gap-1.5">
                    {gap.skills.map((s) => (
                      <Badge key={s} variant="outline" className="text-[10px]">
                        {s}
                      </Badge>
                    ))}
                  </div>
                ) : null}

                {evidence.length ? (
                  <div className="flex flex-wrap gap-2 text-xs">
                    {evidence.map((e, i) =>
                      e.url ? (
                        <a
                          key={`${gap.id}-${i}`}
                          href={e.url}
                          target="_blank"
                          rel="noreferrer"
                          className="font-mono text-primary underline-offset-4 hover:underline"
                        >
                          {e.label ?? "evidence"}
                        </a>
                      ) : (
                        <span key={`${gap.id}-${i}`} className="font-mono text-muted-foreground">
                          {e.label}
                        </span>
                      ),
                    )}
                  </div>
                ) : null}

                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    onClick={() =>
                      decide.mutate({
                        gapId: gap.id,
                        decision: "approved",
                        suggestion: drafts[gap.id] ?? gap.suggestion,
                      })
                    }
                    disabled={decide.isPending}
                  >
                    <Check className="mr-2 h-4 w-4" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => decide.mutate({ gapId: gap.id, decision: "rejected" })}
                    disabled={decide.isPending}
                  >
                    <X className="mr-2 h-4 w-4" />
                    Reject
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {decided.length ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">
                Already decided
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {decided.map((gap) => (
                <div key={gap.id} className="flex items-start gap-2 text-sm">
                  <Badge variant={gap.status === "approved" ? "secondary" : "outline"}>
                    {gap.status}
                  </Badge>
                  <span className="text-muted-foreground">{gap.suggestion}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : null}
      </section>
    </AppShell>
  );
}
