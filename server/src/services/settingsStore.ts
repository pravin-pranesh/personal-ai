import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { SettingsPublic, SettingsUpdateBody } from "@personal-ai/shared";
import { writeJsonAtomic } from "./daily/atomicJsonFile.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const SETTINGS_PATH = path.join(__dirname, "..", "..", "data", "settings.json");

export type SettingsFile = {
  geminiApiKey?: string;
  geminiModel?: string;
};

const DEFAULT_GEMINI_MODEL = "gemini-2.0-flash";

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

function keyPreview(apiKey: string): string {
  const trimmed = apiKey.trim();
  if (trimmed.length <= 4) {
    return "…****";
  }
  return `…${trimmed.slice(-4)}`;
}

export function getSettingsPublic(): SettingsPublic {
  const file = readSettingsFile();
  const envKey = process.env.GEMINI_API_KEY?.trim();
  const fileKey = file.geminiApiKey?.trim();
  const configured = Boolean(envKey || fileKey);
  const model =
    file.geminiModel?.trim() ||
    process.env.GEMINI_MODEL?.trim() ||
    DEFAULT_GEMINI_MODEL;

  const previewSource = envKey ?? fileKey;
  return {
    geminiConfigured: configured,
    geminiModel: model,
    geminiKeyPreview: previewSource ? keyPreview(previewSource) : undefined,
  };
}

export function updateSettings(patch: SettingsUpdateBody): SettingsPublic {
  const current = readSettingsFile();
  const next: SettingsFile = { ...current };

  if (patch.geminiApiKey !== undefined) {
    const trimmed = patch.geminiApiKey.trim();
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

  writeJsonAtomic(SETTINGS_PATH, next);
  return getSettingsPublic();
}
