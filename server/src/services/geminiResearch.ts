import { GoogleGenerativeAI } from "@google/generative-ai";
import type { ResearchNewsCard } from "@personal-ai/shared";
import type { GeminiConfig } from "./geminiConfig.js";

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
    if (!parsed.summary.trim() || cards.length === 0) {
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
  const genAI = new GoogleGenerativeAI(config.apiKey);
  const model = genAI.getGenerativeModel({ model: config.model });

  const instruction = [
    "You are a research assistant. The user asked for a brief news-style briefing.",
    "Respond with JSON only (no markdown prose outside the JSON). Shape:",
    '{"summary":"2-4 sentences","cards":[{"title":"...","snippet":"...","source":"outlet name","publishedAt":"ISO-8601 optional"}]}',
    "Provide 3 headline-style cards with realistic outlet names. Note uncertainty where appropriate.",
    `User topic: ${prompt.trim()}`,
  ].join("\n");

  try {
    const result = await model.generateContent(instruction);
    const text = result.response.text();
    return parsePayload(text);
  } catch {
    return null;
  }
}
