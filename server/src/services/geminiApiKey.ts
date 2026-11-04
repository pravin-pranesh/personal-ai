/** Trim and strip accidental JSON/env quote wrapping. */
export function normalizeGeminiApiKey(raw: string): string {
  let key = raw.trim();
  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1).trim();
  }
  return key;
}

export function readEnvGeminiKey(): string | undefined {
  const gemini = process.env.GEMINI_API_KEY?.trim();
  if (gemini) {
    return normalizeGeminiApiKey(gemini);
  }
  const google = process.env.GOOGLE_API_KEY?.trim();
  if (google) {
    return normalizeGeminiApiKey(google);
  }
  return undefined;
}
