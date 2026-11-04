import type { GeminiConfig } from "./geminiConfig.js";

export const GEMINI_MODEL_FALLBACKS = [
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-2.0-flash-001",
] as const;

const API_VERSIONS = ["v1beta", "v1"] as const;

function modelsToTry(preferred: string): string[] {
  const ordered = [preferred.trim(), ...GEMINI_MODEL_FALLBACKS].filter(Boolean);
  return [...new Set(ordered)];
}

function parseApiErrorBody(text: string): {
  code?: number;
  reason?: string;
  message?: string;
} {
  try {
    const parsed = JSON.parse(text) as {
      error?: { code?: number; message?: string; details?: Array<{ reason?: string }> };
    };
    return {
      code: parsed.error?.code,
      message: parsed.error?.message,
      reason: parsed.error?.details?.[0]?.reason,
    };
  } catch {
    return {};
  }
}

function isModelUnavailable(status: number, body: string): boolean {
  if (status === 404) {
    return true;
  }
  const lower = body.toLowerCase();
  return (
    lower.includes("no longer available") ||
    lower.includes("not found") ||
    lower.includes("is not supported")
  );
}

export function formatGeminiError(err: unknown): string {
  let raw = err instanceof Error ? err.message : String(err);
  raw = raw.replace(/^\[GoogleGenerativeAI Error\]:\s*/i, "");
  if (raw.includes("API_KEY_INVALID") || raw.includes("API key not valid")) {
    return "Gemini API key not valid. Create a new key in Google AI Studio (Get API key → Gemini API) and paste AIza… or AQ.… here.";
  }
  if (raw.includes("ACCESS_TOKEN_TYPE_UNSUPPORTED")) {
    return [
      "Gemini rejected this key for the Developer API.",
      "Use a Gemini API key from Google AI Studio (not a Cloud OAuth token).",
      "Create a fresh key under Get API key if this one was rotated or revoked.",
    ].join(" ");
  }
  if (raw.includes("UNAUTHENTICATED")) {
    return "Gemini authentication failed. Re-save a valid AI Studio API key on this server.";
  }
  return raw.length > 280 ? `${raw.slice(0, 280)}…` : raw;
}

async function generateGeminiTextFetch(
  apiKey: string,
  apiVersion: (typeof API_VERSIONS)[number],
  model: string,
  prompt: string,
): Promise<string> {
  const base = `https://generativelanguage.googleapis.com/${apiVersion}/models`;
  const url = `${base}/${encodeURIComponent(model)}:generateContent`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    }),
  });

  const bodyText = await response.text();
  if (!response.ok) {
    const apiErr = parseApiErrorBody(bodyText);
    const parts = [
      apiErr.message,
      apiErr.reason,
      `HTTP ${response.status}`,
    ].filter(Boolean);
    const err = new Error(parts.join(" — ") || `Gemini HTTP ${response.status}`);
    (err as Error & { status?: number; model?: string; retriableModel?: boolean }).status =
      response.status;
    (err as Error & { model?: string }).model = model;
    (err as Error & { retriableModel?: boolean }).retriableModel = isModelUnavailable(
      response.status,
      bodyText,
    );
    throw err;
  }

  const parsed = JSON.parse(bodyText) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text =
    parsed.candidates?.[0]?.content?.parts
      ?.map((p) => p.text ?? "")
      .join("") ?? "";
  return text;
}

/**
 * Generate text via Gemini Developer API (AI Studio keys: AIza… or AQ.…).
 * Uses REST only with x-goog-api-key (never Authorization: Bearer).
 * Tries v1beta then v1, and model fallbacks on unavailable models.
 */
export async function geminiComplete(
  config: GeminiConfig,
  prompt: string,
): Promise<string> {
  let lastError: unknown;

  for (const model of modelsToTry(config.model)) {
    for (const apiVersion of API_VERSIONS) {
      try {
        return await generateGeminiTextFetch(config.apiKey, apiVersion, model, prompt);
      } catch (fetchErr) {
        lastError = fetchErr;
        const status =
          fetchErr instanceof Error
            ? (fetchErr as Error & { status?: number }).status
            : undefined;
        const retriable =
          fetchErr instanceof Error &&
          (fetchErr as Error & { retriableModel?: boolean }).retriableModel;

        if (status === 401 || status === 403) {
          throw fetchErr;
        }

        if (retriable) {
          break;
        }
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Gemini request failed for all configured models.");
}

/** @deprecated Use geminiComplete */
export const generateGeminiText = geminiComplete;
