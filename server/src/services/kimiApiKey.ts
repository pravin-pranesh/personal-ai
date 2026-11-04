/** Trim and strip accidental JSON/env quote wrapping. */
export function normalizeKimiApiKey(raw: string): string {
  let key = raw.trim();
  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1).trim();
  }
  return key;
}

export function readEnvKimiKey(): string | undefined {
  const moonshot = process.env.MOONSHOT_API_KEY?.trim();
  if (moonshot) {
    return normalizeKimiApiKey(moonshot);
  }
  const kimi = process.env.KIMI_API_KEY?.trim();
  if (kimi) {
    return normalizeKimiApiKey(kimi);
  }
  return undefined;
}
