import type { ResearchNewsCard, ResearchSession } from "@personal-ai/shared";
import { getGeminiConfig } from "../geminiConfig.js";
import { generateResearchWithGemini } from "../geminiResearch.js";
import { createResearchSession } from "./researchStore.js";

export async function runResearchPipeline(prompt: string): Promise<ResearchSession> {
  let content: { summary: string; cards: ResearchNewsCard[] } | undefined;
  const gemini = getGeminiConfig();
  if (gemini) {
    const generated = await generateResearchWithGemini(prompt, gemini);
    if (generated) {
      content = generated;
    }
  }
  return createResearchSession(prompt, content);
}
