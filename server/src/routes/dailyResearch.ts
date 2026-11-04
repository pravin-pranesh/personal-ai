import { Router } from "express";
import { getResearchSessionById, listResearchSessions } from "../services/daily/researchStore.js";
import { runResearchPipeline } from "../services/daily/researchRunner.js";
import { searchSavedResearch } from "../services/researchRag.js";

export const dailyResearchRouter = Router();

dailyResearchRouter.get("/api/daily/research", (_req, res) => {
  res.json({ sessions: listResearchSessions() });
});

dailyResearchRouter.get("/api/daily/research/rag", async (req, res) => {
  const q = typeof req.query.q === "string" ? req.query.q : "";
  const hits = await searchSavedResearch(q);
  res.json({ query: q, hits });
});

dailyResearchRouter.get("/api/daily/research/:id", (req, res) => {
  const session = getResearchSessionById(req.params.id);
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }
  res.json(session);
});

dailyResearchRouter.post("/api/daily/research", async (req, res) => {
  const prompt =
    req.body && typeof req.body === "object" && typeof req.body.prompt === "string"
      ? req.body.prompt
      : "";
  try {
    const session = await runResearchPipeline(prompt);
    res.status(201).json(session);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Invalid request";
    res.status(400).json({ error: message });
  }
});
