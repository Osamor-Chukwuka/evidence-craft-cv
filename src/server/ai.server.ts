type ChatMessage = { role: "system" | "user"; content: string };

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

type Candidate = { model: string; provider: string };

const CANDIDATES: Candidate[] = [
  { model: "google/gemini-3.5-flash", provider: "google" },
  { model: "google/gemini-2.5-flash", provider: "google" },
  { model: "openai/gpt-5.6-terra", provider: "openai" },
];

export type AiResult<T> = { data: T; model: string; provider: string };

function extractJson(text: string): unknown {
  const cleaned = text
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();
  const start = cleaned.search(/[[{]/);
  const end = Math.max(cleaned.lastIndexOf("}"), cleaned.lastIndexOf("]"));
  if (start === -1 || end === -1) throw new Error("No JSON found in model output");
  return JSON.parse(cleaned.slice(start, end + 1));
}

async function callOnce(model: string, messages: ChatMessage[]): Promise<unknown> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("LOVABLE_API_KEY is not configured");

  const body: Record<string, unknown> = { model, messages };
  if (model.startsWith("openai/gpt-5.6")) body["reasoning_effort"] = "none";

  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    const err = new Error(`AI request failed [${res.status}]: ${text.slice(0, 300)}`) as Error & {
      status?: number;
      retryable?: boolean;
    };
    err.status = res.status;
    err.retryable = res.status === 429 || res.status === 402 || res.status >= 500;
    throw err;
  }

  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = json.choices?.[0]?.message?.content;
  if (!content) throw new Error("Empty AI response");
  return extractJson(content);
}

/**
 * Runs the prompt against the preferred model, retrying once on a malformed
 * structured response before failing over to the next provider. Provider-level
 * failures (rate limit, outage, credits) fail over immediately.
 */
export async function generateJson<T>(messages: ChatMessage[]): Promise<AiResult<T>> {
  let lastError: unknown;
  for (const candidate of CANDIDATES) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const data = (await callOnce(candidate.model, messages)) as T;
        return { data, model: candidate.model, provider: candidate.provider };
      } catch (error) {
        lastError = error;
        const providerFailure = (error as { retryable?: boolean }).retryable === true;
        if (providerFailure) break; // move to next provider
        // bad/invalid structured response: retry once, then move on
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error("All AI providers failed");
}
