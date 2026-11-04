import { readSettings } from "./settingsStore.js";

const DEFAULT_GEMINI_MODEL = "gemini-2.0-flash";

export type GeminiConfig = {
  apiKey: string;
  model: string;
};

export function getGeminiConfig(): GeminiConfig | null {
  const envKey = process.env.GEMINI_API_KEY?.trim();
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
  const fileKey = settings.geminiApiKey?.trim();
  if (!fileKey) {
    return null;
  }

  return {
    apiKey: fileKey,
    model: settings.geminiModel?.trim() || DEFAULT_GEMINI_MODEL,
  };
}
