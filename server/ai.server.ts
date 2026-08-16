export type ContentBlock =
  { type: "text"; text: string } | { type: "file"; file: { filename: string; file_data: string } };

type ChatMessage = { role: "system" | "user"; content: string | ContentBlock[] };

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const OPENAI_RESPONSES = "https://api.openai.com/v1/responses";
const GEMINI_GENERATE_CONTENT = "https://generativelanguage.googleapis.com/v1beta/models";

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

function toOpenAIInput(messages: ChatMessage[]) {
  return messages.map((message) => ({
    role: message.role,
    content:
      typeof message.content === "string"
        ? [{ type: "input_text", text: message.content }]
        : message.content.map((block) =>
            block.type === "text"
              ? { type: "input_text", text: block.text }
              : {
                  type: "input_file",
                  filename: block.file.filename,
                  file_data: block.file.file_data,
                },
          ),
  }));
}

function readOpenAIOutput(json: unknown) {
  const outputText = (json as { output_text?: unknown }).output_text;
  if (typeof outputText === "string" && outputText.trim()) return outputText;

  const output = (json as { output?: Array<{ content?: Array<{ text?: unknown }> }> }).output;
  const text = output
    ?.flatMap((item) => item.content ?? [])
    .map((item) => item.text)
    .filter((item): item is string => typeof item === "string")
    .join("\n");
  if (text?.trim()) return text;

  throw new Error("Empty AI response");
}

async function callOpenAI(messages: ChatMessage[]): Promise<AiResult<unknown>> {
  const apiKey = process.env["OPENAI_API_KEY"];
  if (!apiKey) {
    throw new Error(
      "AI is not configured. Add OPENAI_API_KEY, GEMINI_API_KEY, or LOVABLE_API_KEY to enable evidence analysis.",
    );
  }

  const model = process.env["OPENAI_MODEL"] ?? "gpt-5";
  const res = await fetch(OPENAI_RESPONSES, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      input: toOpenAIInput(messages),
      text: { format: { type: "json_object" } },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenAI request failed [${res.status}]: ${text.slice(0, 300)}`);
  }

  const json = await res.json();
  return { data: extractJson(readOpenAIOutput(json)), model, provider: "openai" };
}

function splitDataUrl(value: string) {
  const match = value.match(/^data:([^;,]+);base64,(.+)$/);
  if (!match) return { mimeType: "application/octet-stream", data: value };
  return { mimeType: match[1], data: match[2] };
}

function toGeminiParts(content: string | ContentBlock[]) {
  if (typeof content === "string") return [{ text: content }];

  return content.map((block) => {
    if (block.type === "text") return { text: block.text };

    const { mimeType, data } = splitDataUrl(block.file.file_data);
    return {
      inlineData: {
        mimeType,
        data,
      },
    };
  });
}

function toGeminiRequest(messages: ChatMessage[]) {
  const systemText = messages
    .filter((message) => message.role === "system")
    .flatMap((message) => toGeminiParts(message.content))
    .filter((part): part is { text: string } => "text" in part);

  const contents = messages
    .filter((message) => message.role !== "system")
    .map((message) => ({
      role: "user",
      parts: toGeminiParts(message.content),
    }));

  return {
    ...(systemText.length ? { systemInstruction: { parts: systemText } } : {}),
    contents,
    generationConfig: {
      responseMimeType: "application/json",
    },
  };
}

function readGeminiOutput(json: unknown) {
  const candidates = (
    json as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: unknown }> } }>;
    }
  ).candidates;
  const text = candidates?.[0]?.content?.parts
    ?.map((part) => part.text)
    .filter((part): part is string => typeof part === "string")
    .join("\n");
  if (text?.trim()) return text;
  throw new Error("Empty Gemini response");
}

async function callGemini(messages: ChatMessage[]): Promise<AiResult<unknown>> {
  const apiKey = process.env["GEMINI_API_KEY"];
  if (!apiKey) {
    throw new Error(
      "AI is not configured. Add OPENAI_API_KEY, GEMINI_API_KEY, or LOVABLE_API_KEY to enable evidence analysis.",
    );
  }

  const model = process.env["GEMINI_MODEL"] ?? "gemini-2.5-flash";
  const res = await fetch(`${GEMINI_GENERATE_CONTENT}/${model}:generateContent`, {
    method: "POST",
    headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify(toGeminiRequest(messages)),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gemini request failed [${res.status}]: ${text.slice(0, 300)}`);
  }

  const json = await res.json();
  return { data: extractJson(readGeminiOutput(json)), model, provider: "gemini" };
}

async function callLovableGateway<T>(messages: ChatMessage[]): Promise<AiResult<T>> {
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
  throw lastError instanceof Error ? lastError : new Error("All Lovable gateway providers failed");
}

/**
 * Runs the prompt against the preferred model, retrying once on a malformed
 * structured response before failing over to the next provider. Provider-level
 * failures (rate limit, outage, credits) fail over immediately.
 */
export async function generateJson<T>(messages: ChatMessage[]): Promise<AiResult<T>> {
  let lastError: unknown;

  if (process.env["LOVABLE_API_KEY"]) {
    try {
      return await callLovableGateway<T>(messages);
    } catch (error) {
      lastError = error;
    }
  }

  if (process.env["OPENAI_API_KEY"]) {
    try {
      const result = await callOpenAI(messages);
      return result as AiResult<T>;
    } catch (error) {
      lastError = error;
    }
  }

  if (process.env["GEMINI_API_KEY"]) {
    try {
      const result = await callGemini(messages);
      return result as AiResult<T>;
    } catch (error) {
      lastError = error;
    }
  }

  if (!lastError) {
    throw new Error(
      "AI is not configured. Add OPENAI_API_KEY, GEMINI_API_KEY, or LOVABLE_API_KEY to enable evidence analysis.",
    );
  }

  throw lastError instanceof Error ? lastError : new Error("All AI providers failed");
}
