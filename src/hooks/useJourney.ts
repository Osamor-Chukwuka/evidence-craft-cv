import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { supabase } from "@/integrations/supabase/client";
import { getGithubStatus } from "@/lib/github.functions";

export type JourneyStep = {
  id: string;
  step: number;
  to: string;
  label: string;
  short: string;
  hint: string;
  done: boolean;
  count: number;
};

/**
 * Single source of truth for "where am I in the flow?".
 * Drives the step rail, the dashboard checklist and the next-step bar.
 */
export function useJourney() {
  const statusFn = useServerFn(getGithubStatus);

  const github = useQuery({ queryKey: ["github-status"], queryFn: () => statusFn({}) });

  const counts = useQuery({
    queryKey: ["journey-counts"],
    queryFn: async () => {
      const [repos, contributions, items, approved, uploads, cvs] = await Promise.all([
        supabase.from("repositories").select("id", { count: "exact", head: true }).eq("selected", true),
        supabase.from("contributions").select("id", { count: "exact", head: true }),
        supabase.from("achievements").select("id", { count: "exact", head: true }),
        supabase
          .from("achievements")
          .select("id", { count: "exact", head: true })
          .eq("included", true),
        supabase.from("cv_uploads").select("id", { count: "exact", head: true }),
        supabase.from("cvs").select("id", { count: "exact", head: true }),
      ]);
      return {
        repos: repos.count ?? 0,
        contributions: contributions.count ?? 0,
        items: items.count ?? 0,
        approved: approved.count ?? 0,
        uploads: uploads.count ?? 0,
        cvs: cvs.count ?? 0,
      };
    },
  });

  const c = counts.data;
  const connected = Boolean(github.data?.connected);

  const steps: JourneyStep[] = [
    {
      id: "connect",
      step: 1,
      to: "/repositories",
      label: "Connect GitHub & sync",
      short: "Sync",
      hint: "Pick the repositories worth mining and pull your commits and merged PRs.",
      done: connected && (c?.contributions ?? 0) > 0,
      count: c?.contributions ?? 0,
    },
    {
      id: "items",
      step: 2,
      to: "/achievements",
      label: "Review work items",
      short: "Work items",
      hint: "AI turns your real commits into achievements. Approve the accurate ones.",
      done: (c?.approved ?? 0) > 0,
      count: c?.items ?? 0,
    },
    {
      id: "review",
      step: 3,
      to: "/cv-review",
      label: "Compare your CV",
      short: "CV review",
      hint: "Upload your current CV and see what's vague, missing or unsupported.",
      done: (c?.uploads ?? 0) > 0,
      count: c?.uploads ?? 0,
    },
    {
      id: "cv",
      step: 4,
      to: "/cv",
      label: "Generate your CV",
      short: "Your CV",
      hint: "Build an evidence-backed CV from everything you approved.",
      done: (c?.cvs ?? 0) > 0,
      count: c?.cvs ?? 0,
    },
  ];

  const current = steps.find((s) => !s.done) ?? steps[steps.length - 1]!;

  return {
    steps,
    current,
    connected,
    counts: c,
    isLoading: github.isLoading || counts.isLoading,
  };
}
