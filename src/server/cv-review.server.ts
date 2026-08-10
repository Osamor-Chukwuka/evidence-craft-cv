import type { ContentBlock } from "./ai.server";
import { generateJson } from "./ai.server";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export type ParsedCv = {
  rawText: string;
  headline: string | null;
  summary: string | null;
  skills: string[];
  experience: { title: string; company: string; period: string; bullets: string[] }[];
  education: { qualification: string; institution: string; period: string }[];
  projects: { name: string; description: string }[];
};

const PARSE_SYSTEM = `You extract structured data from a software engineer's CV/resume.
Transcribe faithfully. Never invent employers, dates, titles, or metrics that are not in the document.
Reply with JSON only, in this exact shape:
{"rawText":string,"headline":string|null,"summary":string|null,"skills":[string],"experience":[{"title":string,"company":string,"period":string,"bullets":[string]}],"education":[{"qualification":string,"institution":string,"period":string}],"projects":[{"name":string,"description":string}]}
"rawText" must contain the full plain-text content of the CV.`;

export async function parseCvUpload(
  userId: string,
  input: { fileName: string; mimeType: string; text?: string; fileData?: string },
) {
  const userContent: ContentBlock[] = input.text
    ? [{ type: "text", text: `CV file: ${input.fileName}\n\n${input.text.slice(0, 120000)}` }]
    : [
        { type: "text", text: `Extract this CV (${input.fileName}).` },
        { type: "file", file: { filename: input.fileName, file_data: input.fileData! } },
      ];

  const result = await generateJson<ParsedCv>([
    { role: "system", content: PARSE_SYSTEM },
    { role: "user", content: userContent },
  ]);

  const parsed = result.data;
  const db = await admin();
  const { data, error } = await db
    .from("cv_uploads")
    .insert({
      user_id: userId,
      file_name: input.fileName,
      mime_type: input.mimeType,
      source_text: parsed.rawText ?? input.text ?? "",
      parsed: JSON.parse(JSON.stringify(parsed)),
      model: result.model,
      provider: result.provider,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  return { id: data.id, model: result.model, provider: result.provider, parsed };
}

type GapDraft = {
  kind: "vague" | "missing" | "unsupported";
  section: string;
  cvExcerpt: string | null;
  issue: string;
  suggestion: string;
  skills: string[];
  achievementIndexes: number[];
  confidence: number;
};

const COMPARE_SYSTEM = `You audit a software engineer's CV against verified achievements recovered from their real git history.
Find three kinds of problems:
- "vague": a CV line that is real but unspecific, and the git evidence lets it be rewritten concretely.
- "missing": substantial verified work that the CV never mentions.
- "unsupported": a CV claim with no matching evidence in the git history (flag it, do not rewrite it into a claim).
Rules: never invent employers, dates, metrics, or technologies. Every suggestion must be traceable to the numbered achievements you were given.
Return at most 12 items, highest value first.
Reply with JSON only, in this exact shape:
{"gaps":[{"kind":"vague"|"missing"|"unsupported","section":string,"cvExcerpt":string|null,"issue":string,"suggestion":string,"skills":[string],"achievementIndexes":[number],"confidence":number}]}
"section" is a short label (max 8 words) for the CV area or role this belongs to.
"confidence" is between 0 and 1.`;

export async function compareCvToEvidence(userId: string, uploadId: string) {
  const db = await admin();

  const { data: upload, error: uploadError } = await db
    .from("cv_uploads")
    .select("id, file_name, parsed, source_text")
    .eq("id", uploadId)
    .eq("user_id", userId)
    .maybeSingle();
  if (uploadError) throw new Error(uploadError.message);
  if (!upload) throw new Error("CV upload not found");

  const { data: achievements, error } = await db
    .from("achievements")
    .select("id, title, bullet, impact, category, skills, evidence, period_start, period_end")
    .eq("user_id", userId)
    .eq("included", true)
    .order("period_end", { ascending: false, nullsFirst: false })
    .limit(60);
  if (error) throw new Error(error.message);
  if (!achievements?.length) {
    throw new Error("No approved work items yet — sync and analyze repositories first.");
  }

  const evidenceList = achievements
    .map(
      (a, i) =>
        `${i}. [${a.category ?? "work"} | ${a.period_start ?? "?"} → ${a.period_end ?? "?"}] ${a.title}: ${a.bullet}${a.impact ? ` (impact: ${a.impact})` : ""} skills: ${(a.skills ?? []).join(", ")}`,
    )
    .join("\n");

  const cvText =
    upload.source_text?.trim() ||
    JSON.stringify(upload.parsed).slice(0, 40000);

  const result = await generateJson<{ gaps: GapDraft[] }>([
    { role: "system", content: COMPARE_SYSTEM },
    {
      role: "user",
      content: `CURRENT CV (${upload.file_name}):
${cvText.slice(0, 40000)}

VERIFIED ACHIEVEMENTS FROM GIT HISTORY:
${evidenceList}`,
    },
  ]);

  const gaps = Array.isArray(result.data?.gaps) ? result.data.gaps : [];

  await db.from("cv_gaps").delete().eq("upload_id", uploadId).eq("status", "pending");

  const rows = gaps.slice(0, 12).map((g) => {
    const linked = (g.achievementIndexes ?? [])
      .map((i) => achievements[i])
      .filter(Boolean)
      .flatMap((a) => {
        const ev = Array.isArray(a!.evidence) ? (a!.evidence as unknown[]) : [];
        return ev.length ? ev : [{ label: a!.title }];
      })
      .slice(0, 8);

    return {
      user_id: userId,
      upload_id: uploadId,
      kind: ["vague", "missing", "unsupported"].includes(g.kind) ? g.kind : "vague",
      section: g.section ?? null,
      cv_excerpt: g.cvExcerpt ?? null,
      issue: g.issue,
      suggestion: g.suggestion,
      skills: g.skills ?? [],
      evidence: JSON.parse(JSON.stringify(linked)),
      confidence: typeof g.confidence === "number" ? g.confidence : null,
      model: result.model,
      provider: result.provider,
    };
  });

  if (rows.length) {
    const { error: insertError } = await db.from("cv_gaps").insert(rows);
    if (insertError) throw new Error(insertError.message);
  }

  return { count: rows.length, model: result.model, provider: result.provider };
}

export async function decideGap(
  userId: string,
  gapId: string,
  decision: "approved" | "rejected",
  suggestion?: string,
) {
  const db = await admin();

  const { data: gap, error } = await db
    .from("cv_gaps")
    .select("id, kind, section, suggestion, skills, evidence, confidence, achievement_id")
    .eq("id", gapId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!gap) throw new Error("Suggestion not found");

  const finalText = (suggestion ?? gap.suggestion).trim();

  if (decision === "rejected") {
    if (gap.achievement_id) {
      await db.from("achievements").update({ included: false }).eq("id", gap.achievement_id);
    }
    await db.from("cv_gaps").update({ status: "rejected", suggestion: finalText }).eq("id", gapId);
    return { ok: true, achievementId: null };
  }

  if (gap.kind === "unsupported") {
    await db.from("cv_gaps").update({ status: "approved", suggestion: finalText }).eq("id", gapId);
    return { ok: true, achievementId: null };
  }

  let achievementId = gap.achievement_id;
  if (achievementId) {
    await db
      .from("achievements")
      .update({ bullet: finalText, included: true, skills: gap.skills ?? [] })
      .eq("id", achievementId);
  } else {
    const { data: created, error: createError } = await db
      .from("achievements")
      .insert({
        user_id: userId,
        title: gap.section ?? "CV improvement",
        bullet: finalText,
        category: "cv-gap",
        skills: gap.skills ?? [],
        evidence: gap.evidence ?? [],
        confidence: gap.confidence,
        included: true,
      })
      .select("id")
      .single();
    if (createError) throw new Error(createError.message);
    achievementId = created.id;
  }

  await db
    .from("cv_gaps")
    .update({ status: "approved", suggestion: finalText, achievement_id: achievementId })
    .eq("id", gapId);

  return { ok: true, achievementId };
}
