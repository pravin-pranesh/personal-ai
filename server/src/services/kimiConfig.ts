import { readSettings } from "./settingsStore.js";

const DEFAULT_KIMI_MODEL = "moonshot-v1-8k";
const DEFAULT_BASE = "https://api.moonshot.ai/v1";

export type KimiConfig = {
  apiKey: string;
  model: string;
  baseUrl: string;
};

export function getKimiConfig(): KimiConfig | null {
  const settings = readSettings();
  const key = settings.kimiApiKey?.trim();
  if (!key) return null;
  return {
    apiKey: key,
    model: settings.kimiModel?.trim() || DEFAULT_KIMI_MODEL,
    baseUrl: settings.kimiBaseUrl?.trim() || DEFAULT_BASE,
  };
}
