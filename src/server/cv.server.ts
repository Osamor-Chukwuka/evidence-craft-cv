import { generateJson } from "./ai.server";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export type CvContent = {
  headline: string;
  summary: string;
  skills: { category: string; items: string[] }[];
  experience: {
    title: string;
    context: string;
    period: string;
    bullets: string[];
  }[];
  projects: { name: string; description: string; bullets: string[]; url?: string }[];
};

const SYSTEM = `You are an expert technical CV writer for software engineers.
You receive verified achievements recovered from a developer's real git history plus their profile.
Write a truthful, high-signal CV. Never invent employers, dates, degrees, or metrics not present in the input.
Keep bullets outcome-first, specific, and free of fluff words like "passionate" or "team player".
Reply with JSON only, in this exact shape:
{"headline":string,"summary":string,"skills":[{"category":string,"items":[string]}],"experience":[{"title":string,"context":string,"period":string,"bullets":[string]}],"projects":[{"name":string,"description":string,"bullets":[string],"url":string}]}`;

export async function generateCv(userId: string, targetRole: string | null, title: string) {
  const db = await admin();

  const { data: profile } = await db
    .from("profiles")
    .select("full_name, headline, location, website, linkedin, years_experience, target_role")
    .eq("id", userId)
    .maybeSingle();

  const { data: achievements, error } = await db
    .from("achievements")
    .select("title, bullet, impact, category, skills, period_start, period_end, repository_id")
    .eq("user_id", userId)
    .eq("included", true)
    .limit(60);
  if (error) throw new Error(error.message);
  if (!achievements?.length) {
    throw new Error("Analyze some repositories first — there are no achievements to build a CV from.");
  }

  const { data: repos } = await db
    .from("repositories")
    .select("id, full_name, description, primary_language")
    .eq("user_id", userId)
    .eq("selected", true);
  const repoById = new Map((repos ?? []).map((r) => [r.id, r]));

  const evidence = achievements
    .map((a) => {
      const repo = a.repository_id ? repoById.get(a.repository_id) : null;
      return `- [${repo?.full_name ?? "project"} | ${a.category ?? "work"} | ${a.period_start ?? "?"} → ${a.period_end ?? "?"}] ${a.title}: ${a.bullet}${a.impact ? ` (impact: ${a.impact})` : ""} skills: ${(a.skills ?? []).join(", ")}`;
    })
    .join("\n");

  const result = await generateJson<CvContent>([
    { role: "system", content: SYSTEM },
    {
      role: "user",
      content: `Candidate: ${profile?.full_name ?? "Unnamed developer"}
Current headline: ${profile?.headline ?? "n/a"}
Location: ${profile?.location ?? "n/a"}
Years of experience: ${profile?.years_experience ?? "unknown"}
Target role: ${targetRole ?? profile?.target_role ?? "Software Engineer"}
Links: ${[profile?.website, profile?.linkedin].filter(Boolean).join(" | ") || "n/a"}

Verified achievements from git history:
${evidence}`,
    },
  ]);

  const { data: cv, error: insertError } = await db
    .from("cvs")
    .insert({
      user_id: userId,
      title,
      target_role: targetRole,
      summary: result.data.summary ?? null,
      content: JSON.parse(JSON.stringify(result.data)),
      model: result.model,
      provider: result.provider,
    })
    .select("id")
    .single();
  if (insertError) throw new Error(insertError.message);

  return { id: cv.id, model: result.model, provider: result.provider };
}
