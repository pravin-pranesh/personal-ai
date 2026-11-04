import type { ResearchSession } from "@personal-ai/shared";
import { collectResearchContent } from "./researchContent.js";
import { createResearchSession } from "./researchStore.js";

export async function runResearchPipeline(prompt: string): Promise<ResearchSession> {
  const content = await collectResearchContent(prompt);
  return createResearchSession(prompt, content);
}
