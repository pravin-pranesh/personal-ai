import { Router } from "express";
import {
  createResearchSession,
  listResearchSessions,
} from "../services/daily/researchStore.js";

export const dailyResearchRouter = Router();

dailyResearchRouter.get("/api/daily/research", (_req, res) => {
  res.json({ sessions: listResearchSessions() });
});

dailyResearchRouter.post("/api/daily/research", (req, res) => {
  const prompt =
    req.body && typeof req.body === "object" && typeof req.body.prompt === "string"
      ? req.body.prompt
      : "";
  try {
    const session = createResearchSession(prompt);
    res.status(201).json(session);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Invalid request";
    res.status(400).json({ error: message });
  }
});
