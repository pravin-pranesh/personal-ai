import { Router } from "express";
import {
<<<<<<< HEAD
  createResearchSession,
  getResearchSession,
  listResearchSessions,
} from "../services/daily/researchStore.js";
import { resolveResearchContent } from "../services/daily/researchContent.js";
=======
  clearResearchData,
  deleteResearchSession,
  getResearchSessionById,
  listResearchSessions,
} from "../services/daily/researchStore.js";
import { runResearchPipeline } from "../services/daily/researchRunner.js";
import { searchSavedResearch } from "../services/researchRag.js";
>>>>>>> a927a5dee6fa72b384b7732db0a01595ccb5b969

export const dailyResearchRouter = Router();

dailyResearchRouter.get("/api/daily/research", (_req, res) => {
  res.json({ sessions: listResearchSessions() });
});

<<<<<<< HEAD
dailyResearchRouter.get("/api/daily/research/:id", (req, res) => {
  const id = typeof req.params.id === "string" ? req.params.id.trim() : "";
  if (!id) {
    res.status(400).json({ error: "Session id is required" });
    return;
  }
  const session = getResearchSession(id);
  if (!session) {
    res.status(404).json({ error: "Research session not found" });
=======
dailyResearchRouter.get("/api/daily/research/rag", async (req, res) => {
  const q = typeof req.query.q === "string" ? req.query.q : "";
  const hits = await searchSavedResearch(q);
  res.json({ query: q, hits, mode: "keyword" as const });
});

dailyResearchRouter.get("/api/daily/research/:id", (req, res) => {
  const session = getResearchSessionById(req.params.id);
  if (!session) {
    res.status(404).json({ error: "Session not found" });
>>>>>>> a927a5dee6fa72b384b7732db0a01595ccb5b969
    return;
  }
  res.json(session);
});

<<<<<<< HEAD
=======
dailyResearchRouter.delete("/api/daily/research", (_req, res) => {
  clearResearchData();
  res.json({ ok: true });
});

dailyResearchRouter.delete("/api/daily/research/:id", (req, res) => {
  const ok = deleteResearchSession(req.params.id);
  if (!ok) {
    res.status(404).json({ error: "Session not found" });
    return;
  }
  res.json({ ok: true });
});

>>>>>>> a927a5dee6fa72b384b7732db0a01595ccb5b969
dailyResearchRouter.post("/api/daily/research", async (req, res) => {
  const body = req.body && typeof req.body === "object" ? req.body : {};
  const prompt = typeof body.prompt === "string" ? body.prompt : "";
  const threadId =
    typeof body.threadId === "string" && body.threadId.trim()
      ? body.threadId.trim()
      : undefined;
  try {
<<<<<<< HEAD
    const content = await resolveResearchContent(prompt);
    const session = await createResearchSession(prompt, content, threadId);
=======
    const session = await runResearchPipeline(prompt);
>>>>>>> a927a5dee6fa72b384b7732db0a01595ccb5b969
    res.status(201).json(session);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Invalid request";
    res.status(400).json({ error: message });
  }
});
