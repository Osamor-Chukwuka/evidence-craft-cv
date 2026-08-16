import { generateJson } from "./ai.server";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

type AchievementDraft = {
  title: string;
  bullet: string;
  impact?: string;
  category?: string;
  skills?: string[];
  evidence?: string[];
  confidence?: number;
};

const SYSTEM = `You are a senior engineering hiring manager and CV writer.
You read raw git evidence (commit messages, merged pull requests, file paths, diff sizes) and recover the meaningful engineering work behind it.

Rules:
- Group related commits/PRs into a small number of substantial achievements (3-8), never one per commit.
- Each bullet must be resume-grade: strong verb, concrete technical substance, scope, and outcome.
- NEVER invent metrics, percentages, users, or revenue that are not supported by the evidence. Where quantity is supported, use the real numbers (files touched, PRs merged, lines changed).
- Prefer engineering substance (architecture, reliability, performance, migrations, testing, tooling, security) over routine chores.
- Reply with JSON only.

Reply with this exact JSON shape:
{"achievements":[{"title":string,"bullet":string,"impact":string,"category":"feature"|"architecture"|"performance"|"reliability"|"testing"|"tooling"|"security"|"refactor","skills":[string],"evidence":[string],"confidence":number}]}
"evidence" holds the URLs of the commits/PRs that support the bullet. "confidence" is 0-1.`;

export async function analyzeRepository(userId: string, repositoryId: string) {
  const db = await admin();

  const { data: repo, error: repoError } = await db
    .from("repositories")
    .select("id, full_name, description, primary_language")
    .eq("id", repositoryId)
    .eq("user_id", userId)
    .maybeSingle();
  if (repoError) throw new Error(repoError.message);
  if (!repo) throw new Error("Repository not found");

  const { data: contributions, error } = await db
    .from("contributions")
    .select("kind, title, body, url, additions, deletions, files_changed, occurred_at")
    .eq("user_id", userId)
    .eq("repository_id", repositoryId)
    .order("occurred_at", { ascending: true })
    .limit(200);
  if (error) throw new Error(error.message);
  if (!contributions?.length) {
    throw new Error("No synced contributions for this repository yet.");
  }

  const evidence = contributions
    .map(
      (c) =>
        `- [${c.kind}] ${c.occurred_at.slice(0, 10)} ${c.title} (+${c.additions}/-${c.deletions}, ${c.files_changed} files) ${c.url ?? ""}\n${(c.body ?? "").slice(0, 400)}`,
    )
    .join("\n");

  const dates = contributions.map((c) => c.occurred_at).sort();
  const periodStart = dates[0]?.slice(0, 10) ?? null;
  const periodEnd = dates[dates.length - 1]?.slice(0, 10) ?? null;

  const result = await generateJson<{ achievements: AchievementDraft[] }>([
    { role: "system", content: SYSTEM },
    {
      role: "user",
      content: `Repository: ${repo.full_name}\nLanguage: ${repo.primary_language ?? "unknown"}\nDescription: ${repo.description ?? "none"}\n\nEvidence:\n${evidence}`,
    },
  ]);

  const drafts = Array.isArray(result.data?.achievements) ? result.data.achievements : [];
  if (!drafts.length) throw new Error("The analysis returned no achievements.");

  await db.from("achievements").delete().eq("user_id", userId).eq("repository_id", repositoryId);

  const rows = drafts.slice(0, 10).map((a) => ({
    user_id: userId,
    repository_id: repositoryId,
    title: String(a.title ?? "Untitled").slice(0, 200),
    bullet: String(a.bullet ?? ""),
    impact: a.impact ?? null,
    category: a.category ?? null,
    skills: Array.isArray(a.skills) ? a.skills.slice(0, 12) : [],
    evidence: Array.isArray(a.evidence) ? a.evidence.slice(0, 10) : [],
    confidence: typeof a.confidence === "number" ? a.confidence : null,
    period_start: periodStart,
    period_end: periodEnd,
    included: false,
    model: result.model,
    provider: result.provider,
  }));

  const { error: insertError } = await db.from("achievements").insert(rows);
  if (insertError) throw new Error(insertError.message);

  return { created: rows.length, model: result.model, provider: result.provider };
}

export async function analyzeSelectedRepositories(userId: string) {
  const db = await admin();
  const { data: repos, error } = await db
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
