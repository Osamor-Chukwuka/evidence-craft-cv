"use server";

import { z } from "zod";

import { requireUser } from "@/integrations/supabase/server";

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
  return analyzeRepository(userId, data.repositoryId);
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
      const message = error instanceof Error ? error.message : "";
      const analysisUnavailable =
        message.includes("AI is not configured") ||
        message.includes("API_KEY") ||
        message.includes("request failed") ||
        message.includes("All AI providers failed");

      if (analysisUnavailable) throw error;
      skipped.push(repo.full_name);
    }
  }

  if (!created) {
    throw new Error(
      skipped.length
        ? "No evidence items could be generated from the selected repositories. Sync recent work first, then try again."
        : "No evidence items were generated.",
    );
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
