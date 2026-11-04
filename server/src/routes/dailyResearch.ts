import { Router } from "express";
import {
  createResearchSession,
  getResearchSession,
  listResearchSessions,
} from "../services/daily/researchStore.js";
import { resolveResearchContent } from "../services/daily/researchContent.js";

export const dailyResearchRouter = Router();

dailyResearchRouter.get("/api/daily/research", (_req, res) => {
  res.json({ sessions: listResearchSessions() });
});

dailyResearchRouter.get("/api/daily/research/:id", (req, res) => {
  const id = typeof req.params.id === "string" ? req.params.id.trim() : "";
  if (!id) {
    res.status(400).json({ error: "Session id is required" });
    return;
  }
  const session = getResearchSession(id);
  if (!session) {
    res.status(404).json({ error: "Research session not found" });
    return;
  }
  res.json(session);
});

dailyResearchRouter.post("/api/daily/research", async (req, res) => {
  const body = req.body && typeof req.body === "object" ? req.body : {};
  const prompt = typeof body.prompt === "string" ? body.prompt : "";
  const threadId =
    typeof body.threadId === "string" && body.threadId.trim()
      ? body.threadId.trim()
      : undefined;
  try {
    const content = await resolveResearchContent(prompt);
    const session = await createResearchSession(prompt, content, threadId);
    res.status(201).json(session);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Invalid request";
    res.status(400).json({ error: message });
  }
});
