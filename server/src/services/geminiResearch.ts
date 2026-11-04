import type { ResearchNewsCard } from "@personal-ai/shared";
import type { GeminiConfig } from "./geminiConfig.js";
import { geminiComplete } from "./geminiClient.js";

type GeminiResearchPayload = {
  summary: string;
  cards: ResearchNewsCard[];
};

function parsePayload(text: string): GeminiResearchPayload | null {
  const trimmed = text.trim();
  const jsonBlock = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]?.trim();
  const candidate = jsonBlock ?? trimmed;
  try {
    const parsed = JSON.parse(candidate) as GeminiResearchPayload;
    if (
      !parsed ||
      typeof parsed.summary !== "string" ||
      !Array.isArray(parsed.cards)
    ) {
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
    if (!parsed.summary.trim()) {
      return null;
    }
    return { summary: parsed.summary.trim(), cards: cards.slice(0, 6) };
  } catch {
    return null;
  }
}

export async function generateResearchWithGemini(
  prompt: string,
  config: GeminiConfig,
): Promise<GeminiResearchPayload | null> {
  const instruction = [
    "You are a research assistant with access to current public knowledge (treat this like a grounded web search over news and reference sites).",
    "Return a detailed, fact-checked briefing for the user's topic. Prefer recent developments when the topic is newsy; cite realistic outlet names in cards.",
    "Respond with JSON only (no markdown outside the JSON object). Shape:",
    '{"summary":"markdown string","cards":[{"title":"...","snippet":"...","source":"outlet name","publishedAt":"ISO-8601 optional"}]}',
    "The summary MUST be markdown with bullet lines starting with \"- \" (6–10 bullets total) and these section headings:",
    "### Key facts",
    "### What to watch",
    "### Sources / context",
    "Under each section, use \"- \" bullets with concrete facts, angles, and caveats. Note uncertainty where appropriate.",
    "In ### Sources / context, mention which kinds of sources informed the briefing (e.g. major news wires, official announcements, encyclopedic background).",
    "Optional cards: 0–6 headline-style items with realistic outlet names and richer snippets (1–2 sentences each).",
    `User topic: ${prompt.trim()}`,
  ].join("\n");

  try {
    const text = await geminiComplete(config, instruction);
    return parsePayload(text);
  } catch {
    return null;
  }
}
