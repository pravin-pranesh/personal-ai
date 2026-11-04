import { readSettings } from "./settingsStore.js";

export function getOllamaUrl(): string {
  const settings = readSettings();
  const fromFile = settings.ollamaUrl?.trim();
  if (fromFile) return fromFile.replace(/\/$/, "");
  const fromEnv = process.env.OLLAMA_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  return "http://127.0.0.1:11434";
}

export async function checkOllamaReachable(): Promise<boolean> {
  const base = getOllamaUrl();
  try {
    const res = await fetch(`${base}/api/tags`, { signal: AbortSignal.timeout(4000) });
    return res.ok;
  } catch {
    return false;
  }
}
