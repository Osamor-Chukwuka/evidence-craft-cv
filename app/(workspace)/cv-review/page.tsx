"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ScanSearch, Upload, X } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { compareCvAction, decideCvGapAction, uploadCvAction } from "@/actions/cv-review";
import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { getAnalysisErrorMessage } from "@/lib/user-facing-errors";

const TEXT_TYPES = [".txt", ".md", ".markdown", ".text"];
const KIND_LABEL: Record<string, string> = {
  vague: "Vague entry",
  missing: "Missing work",
  unsupported: "Unsupported claim",
};

function readFile(file: File): Promise<{ text?: string; fileData?: string }> {
  const isText =
    file.type.startsWith("text/") ||
    TEXT_TYPES.some((ext) => file.name.toLowerCase().endsWith(ext));
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read that file"));
    reader.onload = () =>
      resolve(isText ? { text: String(reader.result) } : { fileData: String(reader.result) });
    if (isText) reader.readAsText(file);
    else reader.readAsDataURL(file);
  });
}

export default function CvReviewPage() {
  const qc = useQueryClient();
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
        .select(
          "id, kind, section, cv_excerpt, issue, suggestion, skills, evidence, confidence, status",
        )
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
      return uploadCvAction({
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        ...payload,
      });
    },
    onSuccess: () => {
      toast.success("CV parsed. Run the comparison next.");
      qc.invalidateQueries({ queryKey: ["cv-uploads"] });
      qc.invalidateQueries({ queryKey: ["journey-counts"] });
    },
    onError: (error: Error) => toast.error(getAnalysisErrorMessage(error)),
  });

  const compare = useMutation({
    mutationFn: () => compareCvAction({ uploadId: latestUpload!.id }),
    onSuccess: (result) => {
      toast.success(`Found ${result.count} items to review.`);
      qc.invalidateQueries({ queryKey: ["cv-gaps"] });
      qc.invalidateQueries({ queryKey: ["journey-counts"] });
    },
    onError: (error: Error) => toast.error(getAnalysisErrorMessage(error)),
  });

  const decide = useMutation({
    mutationFn: (vars: { gapId: string; decision: "approved" | "rejected"; suggestion?: string }) =>
      decideCvGapAction(vars),
    onSuccess: (_result, vars) => {
      toast.success(vars.decision === "approved" ? "Added to your internal CV." : "Rejected.");
      qc.invalidateQueries({ queryKey: ["cv-gaps"] });
      qc.invalidateQueries({ queryKey: ["achievements"] });
      qc.invalidateQueries({ queryKey: ["journey-counts"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const pending = gaps.data?.filter((gap) => gap.status === "pending") ?? [];
  const decided = gaps.data?.filter((gap) => gap.status !== "pending") ?? [];

  return (
    <AppShell
      title="Resolve CV gaps"
      description="Upload a current CV when you have one. The workspace compares it against approved evidence and turns vague or missing work into a decision queue."
      actions={
        <div className="rounded-md border border-border bg-card px-3 py-2 text-sm text-muted-foreground">
          <span className="font-mono text-foreground">{pending.length}</span> pending
        </div>
      }
    >
      <section className="grid min-w-0 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Current CV source</CardTitle>
            <CardDescription>
              PDF, plain text, or markdown. Original files are not modified.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex min-w-0 flex-col items-start gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <input
              ref={fileInput}
              type="file"
              accept=".pdf,.txt,.md,.markdown,text/plain,application/pdf"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) upload.mutate(file);
                event.target.value = "";
              }}
            />
            <Button
              className="w-full sm:w-auto"
              onClick={() => fileInput.current?.click()}
              disabled={upload.isPending}
            >
              <Upload className="mr-2 h-4 w-4" />
              {upload.isPending ? "Parsing..." : "Choose CV file"}
            </Button>
            {latestUpload ? (
              <p className="break-anywhere min-w-0 font-mono text-xs text-muted-foreground">
                current: {latestUpload.file_name}
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Compare with approved evidence</CardTitle>
            <CardDescription>
              Find vague entries, missing work, and unsupported claims.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              className="w-full sm:w-auto"
              onClick={() => compare.mutate()}
              disabled={!latestUpload || compare.isPending}
            >
              <ScanSearch className="mr-2 h-4 w-4" />
              {compare.isPending ? "Comparing..." : "Run comparison"}
            </Button>
          </CardContent>
        </Card>
      </section>

      <section className="mt-4 grid gap-4">
        {gaps.isLoading ? <Skeleton className="h-40 w-full" /> : null}
        {!gaps.isLoading && pending.length === 0 && decided.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Nothing to review yet. Upload a CV and run the comparison.
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
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <Badge variant={gap.kind === "unsupported" ? "destructive" : "secondary"}>
                    {KIND_LABEL[gap.kind] ?? gap.kind}
                  </Badge>
                  {gap.section ? (
                    <span className="break-anywhere font-mono text-xs text-muted-foreground">
                      {gap.section}
                    </span>
                  ) : null}
                  {gap.confidence != null ? (
                    <span className="w-full font-mono text-xs text-muted-foreground sm:ml-auto sm:w-auto">
                      {Math.round(Number(gap.confidence) * 100)}% confidence
                    </span>
                  ) : null}
                </div>
                <CardDescription className="break-anywhere pt-2">{gap.issue}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {gap.cv_excerpt ? (
                  <p className="break-anywhere rounded-md border border-border bg-surface p-3 text-sm italic text-muted-foreground">
                    "{gap.cv_excerpt}"
                  </p>
                ) : null}
                <Textarea
                  value={drafts[gap.id] ?? gap.suggestion}
                  onChange={(event) =>
                    setDrafts((draft) => ({ ...draft, [gap.id]: event.target.value }))
                  }
                  rows={3}
                />
                {gap.skills?.length ? (
                  <div className="flex flex-wrap gap-1.5">
                    {gap.skills.map((skill) => (
                      <Badge key={skill} variant="outline" className="text-[10px]">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                ) : null}
                {evidence.length ? (
                  <div className="flex min-w-0 flex-wrap gap-2 text-xs">
                    {evidence.map((item, index) =>
                      item.url ? (
                        <a
                          key={`${gap.id}-${index}`}
                          href={item.url}
                          target="_blank"
                          rel="noreferrer"
                          className="break-anywhere font-mono text-primary underline-offset-4 hover:underline"
                        >
                          {item.label ?? "evidence"}
                        </a>
                      ) : (
                        <span
                          key={`${gap.id}-${index}`}
                          className="break-anywhere font-mono text-muted-foreground"
                        >
                          {item.label}
                        </span>
                      ),
                    )}
                  </div>
                ) : null}
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  <Button
                    size="sm"
                    className="w-full sm:w-auto"
                    onClick={() =>
                      decide.mutate({
                        gapId: gap.id,
                        decision: "approved",
                        suggestion: drafts[gap.id] ?? gap.suggestion,
                      })
                    }
                    disabled={decide.isPending}
                  >
                    <Check className="mr-2 h-4 w-4" /> Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="w-full sm:w-auto"
                    onClick={() => decide.mutate({ gapId: gap.id, decision: "rejected" })}
                    disabled={decide.isPending}
                  >
                    <X className="mr-2 h-4 w-4" /> Dismiss
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {decided.length ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Resolved decisions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {decided.map((gap) => (
                <div
                  key={gap.id}
                  className="flex min-w-0 flex-col items-start gap-2 rounded-md bg-surface p-3 text-sm sm:flex-row"
                >
                  <Badge variant={gap.status === "approved" ? "secondary" : "outline"}>
                    {gap.status}
                  </Badge>
                  <span className="break-anywhere min-w-0 text-muted-foreground">
                    {gap.suggestion}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : null}
      </section>
    </AppShell>
  );
}
