import type { ResearchNewsCard } from "@personal-ai/shared";
import { getGeminiConfig } from "../geminiConfig.js";
import { generateResearchWithGemini } from "../geminiResearch.js";
import { getKimiConfig } from "../kimiConfig.js";
import { generateResearchWithKimi } from "../kimiResearch.js";
import { fetchRssCards } from "../rssResearch.js";
import { readSettings } from "../settingsStore.js";
import { fetchWikipediaResearch } from "../wikipediaResearch.js";
import {
  buildStubSummary,
  stubCardsFromPrompt,
} from "./researchStore.js";

export type ResearchContent = {
  summary: string;
  cards: ResearchNewsCard[];
  briefingMarkdown?: string;
};

function buildDemoContent(prompt: string): ResearchContent {
  const cards = stubCardsFromPrompt(prompt);
  return {
    summary: `[Offline demo] ${buildStubSummary(prompt, cards)}`,
    briefingMarkdown: [
      `## Demo briefing: ${prompt}`,
      "",
      "- This is **offline demo mode** — connect Gemini or turn off demo for live sources.",
      "- Wikipedia and BBC RSS run when demo mode is off and cloud keys are unavailable.",
    ].join("\n"),
    cards,
  };
}

async function mergeFreeSources(topic: string, base: ResearchContent): Promise<ResearchContent> {
  const rss = await fetchRssCards(topic, 2);
  const cards = [...base.cards];
  for (const card of rss) {
    if (!cards.some((c) => c.title === card.title)) {
      cards.push(card);
    }
  }
  return { ...base, cards: cards.slice(0, 6) };
}

export async function collectResearchContent(prompt: string): Promise<ResearchContent> {
  const trimmed = prompt.trim();
  const settings = readSettings();
  const demoMode = settings.demoMode === true;
  const provider = settings.researchProvider ?? "auto";

  if (demoMode) {
    return buildDemoContent(trimmed);
  }

  if (provider === "gemini" || provider === "auto") {
    const gemini = getGeminiConfig();
    if (gemini) {
      const generated = await generateResearchWithGemini(trimmed, gemini);
      if (generated) {
        return {
          summary: generated.summary,
          briefingMarkdown: generated.briefingMarkdown,
          cards: generated.cards,
        };
      }
    }
  }

  if (provider === "kimi" || provider === "auto") {
    const kimi = getKimiConfig();
    if (kimi) {
      const generated = await generateResearchWithKimi(trimmed, kimi);
      if (generated) {
        return {
          summary: generated.summary,
          briefingMarkdown: generated.briefingMarkdown,
          cards: generated.cards,
        };
      }
    }
  }

  if (provider === "free" || provider === "auto") {
    const wiki = await fetchWikipediaResearch(trimmed);
    if (wiki) {
      return mergeFreeSources(trimmed, {
        summary: wiki.summary,
        briefingMarkdown: wiki.briefingMarkdown,
        cards: wiki.cards,
      });
    }
    const rssOnly = await fetchRssCards(trimmed, 3);
    if (rssOnly.length) {
      return {
        summary: `Headlines related to “${trimmed}” from BBC News RSS.`,
        briefingMarkdown: `## Headlines\n\n${rssOnly.map((c) => `- **${c.title}** — ${c.snippet}`).join("\n")}`,
        cards: rssOnly,
      };
    }
  }

  const cards = stubCardsFromPrompt(trimmed);
  return {
    summary: buildStubSummary(trimmed, cards),
    cards,
  };
}
