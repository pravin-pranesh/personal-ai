import type { ResearchNewsCard } from "@personal-ai/shared";
import type { KimiConfig } from "./kimiConfig.js";

export type KimiResearchPayload = {
  summary: string;
  briefingMarkdown?: string;
  cards: ResearchNewsCard[];
};

function parsePayload(text: string): KimiResearchPayload | null {
  const trimmed = text.trim();
  const jsonBlock = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]?.trim();
  const candidate = jsonBlock ?? trimmed;
  try {
    const parsed = JSON.parse(candidate) as KimiResearchPayload & { briefing?: string };
    if (!parsed || typeof parsed.summary !== "string" || !Array.isArray(parsed.cards)) {
      return null;
    }
    const cards: ResearchNewsCard[] = [];
    for (const item of parsed.cards) {
      if (
        !item ||
        typeof item.title !== "string" ||
        typeof item.snippet !== "string" ||
        typeof item.source !== "string"
      ) {
        continue;
      }
      cards.push({
        title: item.title.trim(),
        snippet: item.snippet.trim(),
        source: item.source.trim(),
        publishedAt:
          typeof item.publishedAt === "string" ? item.publishedAt : undefined,
      });
    }
    if (!parsed.summary.trim() || cards.length === 0) return null;
    return {
      summary: parsed.summary.trim(),
      briefingMarkdown:
        typeof parsed.briefingMarkdown === "string"
          ? parsed.briefingMarkdown.trim()
          : typeof parsed.briefing === "string"
            ? parsed.briefing.trim()
            : undefined,
      cards: cards.slice(0, 6),
    };
  } catch {
    return null;
  }
}

export async function generateResearchWithKimi(
  prompt: string,
  config: KimiConfig,
): Promise<KimiResearchPayload | null> {
  const base = config.baseUrl.replace(/\/$/, "");
  const instruction = [
    "You are a research assistant. Respond with JSON only:",
    '{"summary":"2-4 sentences","briefingMarkdown":"markdown with ## headings and bullets","cards":[{"title":"...","snippet":"...","source":"outlet","publishedAt":"ISO optional"}]}',
    "Provide 3 realistic headline cards.",
    `User topic: ${prompt.trim()}`,
  ].join("\n");

  try {
    const res = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages: [{ role: "user", content: instruction }],
        temperature: 0.4,
      }),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const text = body.choices?.[0]?.message?.content ?? "";
    return parsePayload(text);
  } catch {
    return null;
  }
}
