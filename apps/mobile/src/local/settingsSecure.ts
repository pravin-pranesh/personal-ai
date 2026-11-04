import * as SecureStore from "expo-secure-store";
import type { ResearchProvider, SettingsPublic, SettingsUpdateBody } from "@personal-ai/shared";
import { LOCAL_ROOT, readJsonFile, writeJsonFile } from "./fsJson";

const PREFS_PATH = `${LOCAL_ROOT}/settings-prefs.json`;
const KEY_GEMINI = "personal-ai-gemini-key";
const KEY_KIMI = "personal-ai-kimi-key";

type PrefsFile = {
  geminiModel?: string;
  kimiModel?: string;
  demoMode?: boolean;
  researchProvider?: ResearchProvider;
  ollamaUrl?: string;
};

async function readPrefs(): Promise<PrefsFile> {
  return readJsonFile<PrefsFile>(PREFS_PATH, {});
}

async function writePrefs(prefs: PrefsFile): Promise<void> {
  await writeJsonFile(PREFS_PATH, prefs);
}

function keyPreview(key: string): string {
  return key.length <= 4 ? "…****" : `…${key.slice(-4)}`;
}

async function checkOllama(url: string): Promise<boolean> {
  try {
    const res = await fetch(`${url.replace(/\/$/, "")}/api/tags`, {
      signal: AbortSignal.timeout(4000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function getLocalSettingsPublic(): Promise<SettingsPublic> {
  const prefs = await readPrefs();
  const geminiKey = (await SecureStore.getItemAsync(KEY_GEMINI)) ?? "";
  const kimiKey = (await SecureStore.getItemAsync(KEY_KIMI)) ?? "";
  const ollamaUrl = prefs.ollamaUrl?.trim() || "http://127.0.0.1:11434";
  return {
    geminiConfigured: Boolean(geminiKey.trim()),
    geminiModel: prefs.geminiModel?.trim() || "gemini-2.0-flash",
    geminiKeyPreview: geminiKey.trim() ? keyPreview(geminiKey.trim()) : undefined,
    kimiConfigured: Boolean(kimiKey.trim()),
    kimiKeyPreview: kimiKey.trim() ? keyPreview(kimiKey.trim()) : undefined,
    kimiModel: prefs.kimiModel?.trim() || "moonshot-v1-8k",
    ollamaUrl,
    ollamaReachable: await checkOllama(ollamaUrl),
    demoMode: prefs.demoMode === true,
    researchProvider: prefs.researchProvider ?? "auto",
    mcpEnabled: false,
  };
}

export async function updateLocalSettings(patch: SettingsUpdateBody): Promise<SettingsPublic> {
  const prefs = await readPrefs();

  if (patch.geminiApiKey !== undefined) {
    const t = patch.geminiApiKey.trim();
    if (t) await SecureStore.setItemAsync(KEY_GEMINI, t);
    else await SecureStore.deleteItemAsync(KEY_GEMINI);
  }
  if (patch.kimiApiKey !== undefined) {
    const t = patch.kimiApiKey.trim();
    if (t) await SecureStore.setItemAsync(KEY_KIMI, t);
    else await SecureStore.deleteItemAsync(KEY_KIMI);
  }
  if (patch.geminiModel !== undefined) {
    prefs.geminiModel = patch.geminiModel.trim() || undefined;
  }
  if (patch.kimiModel !== undefined) {
    prefs.kimiModel = patch.kimiModel.trim() || undefined;
  }
  if (patch.demoMode !== undefined) prefs.demoMode = patch.demoMode;
  if (patch.researchProvider !== undefined) prefs.researchProvider = patch.researchProvider;
  if (patch.ollamaUrl !== undefined) {
    prefs.ollamaUrl = patch.ollamaUrl.trim() || undefined;
  }

  await writePrefs(prefs);
  return getLocalSettingsPublic();
}

export async function getGeminiKey(): Promise<string | null> {
  const k = await SecureStore.getItemAsync(KEY_GEMINI);
  return k?.trim() || null;
}

export async function getKimiKey(): Promise<string | null> {
  const k = await SecureStore.getItemAsync(KEY_KIMI);
  return k?.trim() || null;
}

export async function testLocalGemini(): Promise<{ ok: boolean; error?: string }> {
  const settings = await getLocalSettingsPublic();
  const key = await getGeminiKey();
  if (!key) return { ok: false, error: "No Gemini API key on this phone" };
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(settings.geminiModel ?? "gemini-2.0-flash")}:generateContent?key=${encodeURIComponent(key)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: "Reply with OK only." }] }],
        }),
      },
    );
    if (!res.ok) {
      return { ok: false, error: `Gemini HTTP ${res.status}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Network error" };
  }
}

export async function testLocalOllama(): Promise<{ ok: boolean; error?: string }> {
  const settings = await getLocalSettingsPublic();
  const ok = await checkOllama(settings.ollamaUrl);
  return ok ? { ok: true } : { ok: false, error: "Ollama not reachable" };
}
