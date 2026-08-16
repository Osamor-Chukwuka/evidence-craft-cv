"use server";

import { z } from "zod";

import { requireUser } from "@/integrations/supabase/server";

function isEmptyAnalysisResult(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  return (
    message.includes("No synced contributions") ||
    message.includes("analysis returned no achievements") ||
    message.includes("No evidence items")
  );
}

function isAnalysisUnavailable(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  return (
    message.includes("AI is not configured") ||
    message.includes("API_KEY") ||
    message.includes("request failed") ||
    message.includes("All AI providers failed")
  );
}

export async function getAiConfigStatusAction() {
  await requireUser();

  return {
    configured: Boolean(
      process.env["LOVABLE_API_KEY"] ||
      process.env["OPENAI_API_KEY"] ||
      process.env["GEMINI_API_KEY"],
    ),
  };
}

export async function analyzeRepoAction(input: unknown) {
  const data = z.object({ repositoryId: z.string().uuid() }).parse(input);
  const { userId } = await requireUser();
  const { analyzeRepository } = await import("@/server/analysis.server");

  try {
    return await analyzeRepository(userId, data.repositoryId);
  } catch (error) {
    if (!isEmptyAnalysisResult(error)) throw error;

    return {
      created: 0,
      model: null,
      provider: null,
      message:
        "No synced commits or merged PRs were found for this repository. Sync work for it first, then analyze again.",
    };
  }
}

export async function analyzeSelectedReposAction() {
  const { userId } = await requireUser();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { analyzeRepository } = await import("@/server/analysis.server");

  const { data: repos, error } = await supabaseAdmin
    .from("repositories")
    .select("id, full_name")
    .eq("user_id", userId)
    .eq("selected", true)
    .order("full_name", { ascending: true });

  if (error) throw new Error(error.message);
  if (!repos?.length) throw new Error("Select at least one repository before analyzing work.");

  let created = 0;
  let analyzed = 0;
  const skipped: string[] = [];

  for (const repo of repos) {
    try {
      const result = await analyzeRepository(userId, repo.id);
      created += result.created;
      analyzed += 1;
    } catch (error) {
      if (isAnalysisUnavailable(error)) throw error;
      skipped.push(repo.full_name);
    }
  }

  if (!created) {
    return {
      created,
      analyzed,
      selected: repos.length,
      skipped,
      message:
        "No synced commits or merged PRs were found in the selected repositories. Sync recent work first, then analyze again.",
    };
  }

  return {
    created,
    analyzed,
    selected: repos.length,
    skipped,
  };
}

export async function buildCvAction(input: unknown) {
  const data = z
    .object({ targetRole: z.string().max(120).nullable(), title: z.string().min(1).max(120) })
    .parse(input);
  const { userId } = await requireUser();
  const { generateCv } = await import("@/server/cv.server");
  return generateCv(userId, data.targetRole, data.title);
}
