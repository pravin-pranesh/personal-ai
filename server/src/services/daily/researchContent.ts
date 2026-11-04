<<<<<<< HEAD
import type { ResearchNewsCard, ResearchSource } from "@personal-ai/shared";
import { resolveDemoResearchContent } from "./researchStore.js";
import {
  getResearchProvider,
  isGeminiDevStubEnabled,
} from "../settingsStore.js";
=======
import type { ResearchNewsCard } from "@personal-ai/shared";
>>>>>>> a927a5dee6fa72b384b7732db0a01595ccb5b969
import { getGeminiConfig } from "../geminiConfig.js";
import { generateResearchWithGemini } from "../geminiResearch.js";
import { getKimiConfig } from "../kimiConfig.js";
import { generateResearchWithKimi } from "../kimiResearch.js";
<<<<<<< HEAD
import { buildWikiEnrichedResearch } from "../wikipediaResearch.js";

export type ResolvedResearchContent = {
  summary: string;
  cards: ResearchNewsCard[];
  sourcesUsed: ResearchSource[];
};

async function tryKimi(prompt: string): Promise<ResolvedResearchContent | null> {
  const kimi = getKimiConfig();
  if (!kimi) {
    return null;
  }
  const generated = await generateResearchWithKimi(prompt, kimi);
  if (!generated) {
    return null;
  }
  return { ...generated, sourcesUsed: ["kimi"] };
}

async function tryGemini(prompt: string): Promise<ResolvedResearchContent | null> {
  const gemini = getGeminiConfig();
  if (!gemini) {
    return null;
  }
  const generated = await generateResearchWithGemini(prompt, gemini);
  if (!generated) {
    return null;
  }
  return { ...generated, sourcesUsed: ["gemini"] };
}

async function tryWiki(prompt: string): Promise<ResolvedResearchContent | null> {
  const wiki = await buildWikiEnrichedResearch(prompt);
  if (!wiki) {
    return null;
  }
  return {
    summary: wiki.summary,
    cards: wiki.cards,
    sourcesUsed: ["wikipedia"],
  };
}

async function demoFallback(prompt: string): Promise<ResolvedResearchContent> {
  const fallback = await resolveDemoResearchContent(prompt, "fallback");
  return { ...fallback, sourcesUsed: ["stub"] };
}

export async function resolveResearchContent(
  prompt: string,
): Promise<ResolvedResearchContent> {
  if (isGeminiDevStubEnabled()) {
    return resolveDemoResearchContent(prompt, "dev-stub");
  }

  const provider = getResearchProvider();

  switch (provider) {
    case "kimi": {
      const kimi = await tryKimi(prompt);
      if (kimi) return kimi;
      const wiki = await tryWiki(prompt);
      if (wiki) return wiki;
      return demoFallback(prompt);
    }
    case "gemini": {
      const gemini = await tryGemini(prompt);
      if (gemini) return gemini;
      const wiki = await tryWiki(prompt);
      if (wiki) return wiki;
      return demoFallback(prompt);
    }
    case "wikipedia": {
      const wiki = await tryWiki(prompt);
      if (wiki) return wiki;
      return demoFallback(prompt);
    }
    case "auto":
    default: {
      const kimi = await tryKimi(prompt);
      if (kimi) return kimi;
      const gemini = await tryGemini(prompt);
      if (gemini) return gemini;
      const wiki = await tryWiki(prompt);
      if (wiki) return wiki;
      return demoFallback(prompt);
    }
  }
=======
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
>>>>>>> a927a5dee6fa72b384b7732db0a01595ccb5b969
}
