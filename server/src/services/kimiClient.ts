import type { KimiConfig } from "./kimiConfig.js";

const CHAT_COMPLETIONS_URL = "https://api.moonshot.ai/v1/chat/completions";

function parseApiErrorBody(text: string): { message?: string } {
  try {
    const parsed = JSON.parse(text) as { error?: { message?: string } };
    return { message: parsed.error?.message };
  } catch {
    return {};
  }
}

export function formatKimiError(err: unknown): string {
  let raw = err instanceof Error ? err.message : String(err);
  const lower = raw.toLowerCase();
  if (lower.includes("invalid authentication") || lower.includes("incorrect api key")) {
    return "Kimi API key not valid. Create a key at platform.kimi.ai (Console → API Keys) and paste it in Settings.";
  }
  if (lower.includes("insufficient balance") || lower.includes("quota")) {
    return "Kimi account has insufficient balance. Top up at platform.kimi.ai (pay-as-you-go; flagship models need a minimum top-up).";
  }
  return raw.length > 280 ? `${raw.slice(0, 280)}…` : raw;
}

export async function kimiComplete(config: KimiConfig, prompt: string): Promise<string> {
  const response = await fetch(CHAT_COMPLETIONS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
    }),
  });

  const bodyText = await response.text();
  if (!response.ok) {
    const apiErr = parseApiErrorBody(bodyText);
    const parts = [apiErr.message, `HTTP ${response.status}`].filter(Boolean);
    throw new Error(parts.join(" — ") || `Kimi HTTP ${response.status}`);
  }

  const parsed = JSON.parse(bodyText) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = parsed.choices?.[0]?.message?.content ?? "";
  if (!text.trim()) {
    throw new Error("Kimi returned an empty completion.");
  }
  return text;
}
