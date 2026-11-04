import type { ResearchNewsCard, ResearchSource } from "@personal-ai/shared";
import { resolveDemoResearchContent } from "./researchStore.js";
import {
  getResearchProvider,
  isGeminiDevStubEnabled,
} from "../settingsStore.js";
import { getGeminiConfig } from "../geminiConfig.js";
import { generateResearchWithGemini } from "../geminiResearch.js";
import { getKimiConfig } from "../kimiConfig.js";
import { generateResearchWithKimi } from "../kimiResearch.js";
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
}
