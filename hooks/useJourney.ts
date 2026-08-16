"use client";

import { useQuery } from "@tanstack/react-query";

import { getGithubStatusAction } from "@/actions/github";
import { supabase } from "@/integrations/supabase/client";

export type JourneyStep = {
  id: string;
  icon: "dashboard" | "sources" | "evidence" | "review" | "cv";
  to: string;
  label: string;
  short: string;
  hint: string;
  done: boolean;
  count: number;
};

export function useJourney() {
  const github = useQuery({
    queryKey: ["github-status"],
    queryFn: () => getGithubStatusAction(),
    retry: false,
  });

  const counts = useQuery({
    queryKey: ["journey-counts"],
    queryFn: async () => {
      const [
        repos,
        contributions,
        items,
        approved,
        uploads,
        totalGaps,
        pendingGaps,
        approvedGaps,
        cvs,
      ] = await Promise.all([
        supabase
          .from("repositories")
          .select("id", { count: "exact", head: true })
          .eq("selected", true),
        supabase.from("contributions").select("id", { count: "exact", head: true }),
        supabase.from("achievements").select("id", { count: "exact", head: true }),
        supabase
          .from("achievements")
          .select("id", { count: "exact", head: true })
          .eq("included", true),
        supabase.from("cv_uploads").select("id", { count: "exact", head: true }),
        supabase.from("cv_gaps").select("id", { count: "exact", head: true }),
        supabase
          .from("cv_gaps")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending"),
        supabase
          .from("cv_gaps")
          .select("id", { count: "exact", head: true })
          .eq("status", "approved"),
        supabase.from("cvs").select("id", { count: "exact", head: true }),
      ]);

      return {
        repos: repos.count ?? 0,
        contributions: contributions.count ?? 0,
        items: items.count ?? 0,
        approved: approved.count ?? 0,
        uploads: uploads.count ?? 0,
        totalGaps: totalGaps.count ?? 0,
        gaps: pendingGaps.count ?? 0,
        approvedGaps: approvedGaps.count ?? 0,
        cvs: cvs.count ?? 0,
      };
    },
  });

  const c = counts.data;
  const connected = Boolean(github.data?.connected);

  const steps: JourneyStep[] = [
    {
      id: "dashboard",
      icon: "dashboard",
      to: "/dashboard",
      label: "Command center",
      short: "Home",
      hint: "Choose the highest-value next action from your workspace queue.",
      done: connected || (c?.contributions ?? 0) > 0,
      count: c?.contributions ?? 0,
    },
    {
      id: "sources",
      icon: "sources",
      to: "/repositories",
      label: "Source setup",
      short: "Sources",
      hint: "Connect GitHub, choose repositories, and sync the work history that matters.",
      done: connected && (c?.contributions ?? 0) > 0,
      count: c?.repos ?? 0,
    },
    {
      id: "evidence",
      icon: "evidence",
      to: "/achievements",
      label: "Evidence inbox",
      short: "Evidence",
      hint: "Review reconstructed work items, keep the accurate ones, and reject noise.",
      done: (c?.approved ?? 0) > 0,
      count: c?.items ?? 0,
    },
    {
      id: "review",
      icon: "review",
      to: "/cv-review",
      label: "Gap review",
      short: "Gaps",
      hint: "Compare an existing CV against the approved evidence and resolve missing or vague claims.",
      done: (c?.approvedGaps ?? 0) > 0 || ((c?.totalGaps ?? 0) > 0 && (c?.gaps ?? 0) === 0),
      count: c?.gaps ?? 0,
    },
    {
      id: "cv",
      icon: "cv",
      to: "/cv",
      label: "CV studio",
      short: "CV",
      hint: "Generate and refine a version of your CV from approved, traceable evidence.",
      done: (c?.cvs ?? 0) > 0,
      count: c?.cvs ?? 0,
    },
  ];

  const current = steps.find((step) => !step.done) ?? steps[steps.length - 1]!;

  return {
    steps,
    current,
    connected,
    counts: c,
    isLoading: github.isLoading || counts.isLoading,
  };
}
