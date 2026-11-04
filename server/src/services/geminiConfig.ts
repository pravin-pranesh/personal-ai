import { readSettings } from "./settingsStore.js";

import { normalizeGeminiApiKey, readEnvGeminiKey } from "./geminiApiKey.js";

const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";

export type GeminiConfig = {
  apiKey: string;
  model: string;
};

export function getGeminiConfig(): GeminiConfig | null {
  const envKey = readEnvGeminiKey();
  if (envKey) {
    const settings = readSettings();
    return {
      apiKey: envKey,
      model:
        settings.geminiModel?.trim() ||
        process.env.GEMINI_MODEL?.trim() ||
        DEFAULT_GEMINI_MODEL,
    };
  }

  const settings = readSettings();
  const fileKey = settings.geminiApiKey
    ? normalizeGeminiApiKey(settings.geminiApiKey)
    : undefined;
  if (!fileKey) {
    return null;
  }

  return {
    apiKey: fileKey,
    model: settings.geminiModel?.trim() || DEFAULT_GEMINI_MODEL,
  };
}
