import { readSettings } from "./settingsStore.js";
import { normalizeKimiApiKey, readEnvKimiKey } from "./kimiApiKey.js";

export const DEFAULT_KIMI_MODEL = "kimi-k3.1-pro";

export type KimiConfig = {
  apiKey: string;
  model: string;
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
  };
}
