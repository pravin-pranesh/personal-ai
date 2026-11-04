import { getGeminiConfig } from "./geminiConfig.js";
import { formatGeminiError, geminiComplete } from "./geminiClient.js";
import { isGeminiDevStubEnabled } from "./settingsStore.js";

export type GeminiTestResult =
  | { ok: true; mode: "live" | "stub" }
  | { ok: false; error: string };

export async function testGeminiConnection(): Promise<GeminiTestResult> {
  if (isGeminiDevStubEnabled()) {
    return { ok: true, mode: "stub" };
  }

  const config = getGeminiConfig();
  if (!config) {
    return { ok: false, error: "No Gemini API key saved on this server." };
  }

  try {
    await geminiComplete(config, "Reply with exactly: ok");
    return { ok: true, mode: "live" };
  } catch (err) {
    return { ok: false, error: formatGeminiError(err) };
  }
}
