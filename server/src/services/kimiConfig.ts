import { readSettings } from "./settingsStore.js";
<<<<<<< HEAD
import { normalizeKimiApiKey, readEnvKimiKey } from "./kimiApiKey.js";

export const DEFAULT_KIMI_MODEL = "kimi-k3.1-pro";
=======

const DEFAULT_KIMI_MODEL = "moonshot-v1-8k";
const DEFAULT_BASE = "https://api.moonshot.ai/v1";
>>>>>>> a927a5dee6fa72b384b7732db0a01595ccb5b969

export type KimiConfig = {
  apiKey: string;
  model: string;
<<<<<<< HEAD
};

export function getKimiConfig(): KimiConfig | null {
  const envKey = readEnvKimiKey();
  if (envKey) {
    const settings = readSettings();
    return {
      apiKey: envKey,
      model:
        settings.kimiModel?.trim() ||
        process.env.KIMI_MODEL?.trim() ||
        DEFAULT_KIMI_MODEL,
    };
  }

  const settings = readSettings();
  const fileKey = settings.kimiApiKey
    ? normalizeKimiApiKey(settings.kimiApiKey)
    : undefined;
  if (!fileKey) {
    return null;
  }

  return {
    apiKey: fileKey,
    model: settings.kimiModel?.trim() || DEFAULT_KIMI_MODEL,
=======
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
>>>>>>> a927a5dee6fa72b384b7732db0a01595ccb5b969
  };
}
