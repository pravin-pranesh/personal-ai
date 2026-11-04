import type { ResearchNewsCard } from "@personal-ai/shared";
import { Router } from "express";
import {
  createResearchSession,
  listResearchSessions,
} from "../services/daily/researchStore.js";
import { getGeminiConfig } from "../services/geminiConfig.js";
import { generateResearchWithGemini } from "../services/geminiResearch.js";

export const dailyResearchRouter = Router();

dailyResearchRouter.get("/api/daily/research", (_req, res) => {
  res.json({ sessions: listResearchSessions() });
});

dailyResearchRouter.post("/api/daily/research", async (req, res) => {
  const prompt =
    req.body && typeof req.body === "object" && typeof req.body.prompt === "string"
      ? req.body.prompt
      : "";
  try {
    const gemini = getGeminiConfig();
    let content: { summary: string; cards: ResearchNewsCard[] } | undefined;
    if (gemini) {
      const generated = await generateResearchWithGemini(prompt, gemini);
      if (generated) {
        content = generated;
      }
    }
    const session = createResearchSession(prompt, content);
    res.status(201).json(session);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Invalid request";
    res.status(400).json({ error: message });
  }
});
