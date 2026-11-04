import { Router } from "express";
import type { ResearchProvider, SettingsUpdateBody } from "@personal-ai/shared";
import { testGeminiConnection } from "../services/geminiTest.js";
import { testKimiConnection } from "../services/kimiTest.js";
import { getSettingsPublic, updateSettings } from "../services/settingsStore.js";

export const settingsRouter = Router();

const RESEARCH_PROVIDERS: ResearchProvider[] = ["auto", "kimi", "gemini", "wikipedia"];

settingsRouter.get("/api/settings", (_req, res) => {
  res.json(getSettingsPublic());
});

settingsRouter.get("/api/settings/test-gemini", async (_req, res) => {
  const result = await testGeminiConnection();
  if (!result.ok) {
    const status = result.error.includes("No Gemini") ? 400 : 502;
    res.status(status).json({ ok: false, error: result.error });
    return;
  }
  res.json({ ok: true, mode: result.mode });
});

settingsRouter.get("/api/settings/test-kimi", async (_req, res) => {
  const result = await testKimiConnection();
  if (!result.ok) {
    const status = result.error.includes("No Kimi") ? 400 : 502;
    res.status(status).json({ ok: false, error: result.error });
    return;
  }
  res.json({ ok: true });
});

settingsRouter.put("/api/settings", (req, res) => {
  const body = req.body as SettingsUpdateBody | null;
  if (!body || typeof body !== "object") {
    res.status(400).json({ error: "Invalid body" });
    return;
  }

  const patch: SettingsUpdateBody = {};
  if (body.geminiApiKey !== undefined) {
    if (typeof body.geminiApiKey !== "string") {
      res.status(400).json({ error: "geminiApiKey must be a string" });
      return;
    }
    patch.geminiApiKey = body.geminiApiKey;
  }
  if (body.geminiModel !== undefined) {
    if (typeof body.geminiModel !== "string") {
      res.status(400).json({ error: "geminiModel must be a string" });
      return;
    }
    patch.geminiModel = body.geminiModel;
  }
  if (body.geminiDevStub !== undefined) {
    if (typeof body.geminiDevStub !== "boolean") {
      res.status(400).json({ error: "geminiDevStub must be a boolean" });
      return;
    }
    patch.geminiDevStub = body.geminiDevStub;
  }
  if (body.kimiApiKey !== undefined) {
    if (typeof body.kimiApiKey !== "string") {
      res.status(400).json({ error: "kimiApiKey must be a string" });
      return;
    }
    patch.kimiApiKey = body.kimiApiKey;
  }
  if (body.kimiModel !== undefined) {
    if (typeof body.kimiModel !== "string") {
      res.status(400).json({ error: "kimiModel must be a string" });
      return;
    }
    patch.kimiModel = body.kimiModel;
  }
  if (body.researchProvider !== undefined) {
    if (typeof body.researchProvider !== "string") {
      res.status(400).json({ error: "researchProvider must be a string" });
      return;
    }
    if (!RESEARCH_PROVIDERS.includes(body.researchProvider as ResearchProvider)) {
      res.status(400).json({
        error: `researchProvider must be one of: ${RESEARCH_PROVIDERS.join(", ")}`,
      });
      return;
    }
    patch.researchProvider = body.researchProvider as ResearchProvider;
  }

  res.json(updateSettings(patch));
});
