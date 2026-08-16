const INTERNAL_AI_PATTERNS = [
  "AI is not configured",
  "API_KEY",
  "LOVABLE",
  "OPENAI",
  "GEMINI",
  "Lovable",
  "OpenAI",
  "Gemini",
  "No JSON found",
  "Empty AI response",
  "request failed",
  "All AI providers failed",
];

export function getAnalysisErrorMessage(error: Error) {
  if (INTERNAL_AI_PATTERNS.some((pattern) => error.message.includes(pattern))) {
    return "Analysis is temporarily unavailable. Please try again in a few minutes.";
  }

  return error.message;
}
