import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { ResearchProvider, SettingsPublic, SettingsUpdateBody } from "@personal-ai/shared";
import { writeJsonAtomic } from "./daily/atomicJsonFile.js";
import { normalizeGeminiApiKey, readEnvGeminiKey } from "./geminiApiKey.js";
import { normalizeKimiApiKey, readEnvKimiKey } from "./kimiApiKey.js";
import { DEFAULT_KIMI_MODEL } from "./kimiConfig.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const SETTINGS_PATH = path.join(__dirname, "..", "..", "data", "settings.json");

export type SettingsFile = {
  geminiApiKey?: string;
  geminiModel?: string;
  geminiDevStub?: boolean;
  kimiApiKey?: string;
  kimiModel?: string;
  researchProvider?: ResearchProvider;
};

const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";

const RESEARCH_PROVIDERS: ResearchProvider[] = ["auto", "kimi", "gemini", "wikipedia"];

function readSettingsFile(): SettingsFile {
  if (!fs.existsSync(SETTINGS_PATH)) {
    return {};
  }
  try {
    const raw = JSON.parse(fs.readFileSync(SETTINGS_PATH, "utf8")) as SettingsFile;
    if (!raw || typeof raw !== "object") {
      return {};
    }
    return raw;
  } catch {
    return {};
  }
}

export function readSettings(): SettingsFile {
  return readSettingsFile();
}

export function isGeminiDevStubEnabled(): boolean {
  const env = process.env.GEMINI_DEV_STUB?.trim().toLowerCase();
  if (env === "true" || env === "1") {
    return true;
  }
  return readSettingsFile().geminiDevStub === true;
}

export function getResearchProvider(): ResearchProvider {
  const file = readSettingsFile();
  const value = file.researchProvider;
  if (value && RESEARCH_PROVIDERS.includes(value)) {
    return value;
  }
  return "auto";
}

function keyPreview(apiKey: string): string {
  const trimmed = apiKey.trim();
  if (trimmed.length <= 4) {
    return "…****";
  }
  return `…${trimmed.slice(-4)}`;
}

export function getSettingsPublic(): SettingsPublic {
  const file = readSettingsFile();
  const envKey = readEnvGeminiKey();
  const fileKey = file.geminiApiKey
    ? normalizeGeminiApiKey(file.geminiApiKey)
    : undefined;
  const geminiConfigured = Boolean(envKey || fileKey);
  const geminiModel =
    file.geminiModel?.trim() ||
    process.env.GEMINI_MODEL?.trim() ||
    DEFAULT_GEMINI_MODEL;

  const previewSource = envKey ?? fileKey;

  const envKimi = readEnvKimiKey();
  const fileKimi = file.kimiApiKey ? normalizeKimiApiKey(file.kimiApiKey) : undefined;
  const kimiConfigured = Boolean(envKimi || fileKimi);
  const kimiModel =
    file.kimiModel?.trim() || process.env.KIMI_MODEL?.trim() || DEFAULT_KIMI_MODEL;
  const kimiPreviewSource = envKimi ?? fileKimi;

  return {
    geminiConfigured,
    geminiModel,
    geminiKeyPreview: previewSource ? keyPreview(previewSource) : undefined,
    geminiDevStub: isGeminiDevStubEnabled(),
    kimiConfigured,
    kimiModel,
    kimiKeyPreview: kimiPreviewSource ? keyPreview(kimiPreviewSource) : undefined,
    researchProvider: getResearchProvider(),
  };
}

export function updateSettings(patch: SettingsUpdateBody): SettingsPublic {
  const current = readSettingsFile();
  const next: SettingsFile = { ...current };

  if (patch.geminiApiKey !== undefined) {
    const trimmed = normalizeGeminiApiKey(patch.geminiApiKey);
    if (trimmed) {
      next.geminiApiKey = trimmed;
    } else {
      delete next.geminiApiKey;
    }
  }

  if (patch.geminiModel !== undefined) {
    const trimmed = patch.geminiModel.trim();
    if (trimmed) {
      next.geminiModel = trimmed;
    } else {
      delete next.geminiModel;
    }
  }

  if (patch.geminiDevStub !== undefined) {
    if (patch.geminiDevStub) {
      next.geminiDevStub = true;
    } else {
      delete next.geminiDevStub;
    }
  }

  if (patch.kimiApiKey !== undefined) {
    const trimmed = normalizeKimiApiKey(patch.kimiApiKey);
    if (trimmed) {
      next.kimiApiKey = trimmed;
    } else {
      delete next.kimiApiKey;
    }
  }

  if (patch.kimiModel !== undefined) {
    const trimmed = patch.kimiModel.trim();
    if (trimmed) {
      next.kimiModel = trimmed;
    } else {
      delete next.kimiModel;
    }
  }

  if (patch.researchProvider !== undefined) {
    if (RESEARCH_PROVIDERS.includes(patch.researchProvider)) {
      next.researchProvider = patch.researchProvider;
    } else {
      delete next.researchProvider;
    }
  }

  writeJsonAtomic(SETTINGS_PATH, next);
  return getSettingsPublic();
}
