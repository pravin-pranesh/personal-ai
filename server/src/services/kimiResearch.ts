import type { ResearchNewsCard } from "@personal-ai/shared";
import type { KimiConfig } from "./kimiConfig.js";
<<<<<<< HEAD
import { kimiComplete } from "./kimiClient.js";

type KimiResearchPayload = {
  summary: string;
=======

export type KimiResearchPayload = {
  summary: string;
  briefingMarkdown?: string;
>>>>>>> a927a5dee6fa72b384b7732db0a01595ccb5b969
  cards: ResearchNewsCard[];
};

function parsePayload(text: string): KimiResearchPayload | null {
  const trimmed = text.trim();
  const jsonBlock = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]?.trim();
  const candidate = jsonBlock ?? trimmed;
  try {
<<<<<<< HEAD
    const parsed = JSON.parse(candidate) as KimiResearchPayload;
    if (
      !parsed ||
      typeof parsed.summary !== "string" ||
      !Array.isArray(parsed.cards)
    ) {
=======
    const parsed = JSON.parse(candidate) as KimiResearchPayload & { briefing?: string };
    if (!parsed || typeof parsed.summary !== "string" || !Array.isArray(parsed.cards)) {
>>>>>>> a927a5dee6fa72b384b7732db0a01595ccb5b969
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
<<<<<<< HEAD
    if (!parsed.summary.trim()) {
      return null;
    }
    return { summary: parsed.summary.trim(), cards: cards.slice(0, 6) };
=======
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
>>>>>>> a927a5dee6fa72b384b7732db0a01595ccb5b969
  } catch {
    return null;
  }
}

<<<<<<< HEAD
const RESEARCH_INSTRUCTION = (prompt: string) =>
  [
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

=======
>>>>>>> a927a5dee6fa72b384b7732db0a01595ccb5b969
export async function generateResearchWithKimi(
  prompt: string,
  config: KimiConfig,
): Promise<KimiResearchPayload | null> {
<<<<<<< HEAD
  try {
    const text = await kimiComplete(config, RESEARCH_INSTRUCTION(prompt));
=======
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
>>>>>>> a927a5dee6fa72b384b7732db0a01595ccb5b969
    return parsePayload(text);
  } catch {
    return null;
  }
}
