import { Router } from "express";
import type { ResearchProvider, SettingsUpdateBody } from "@personal-ai/shared";
import { testGeminiConnection } from "../services/geminiTest.js";
import { checkOllamaReachable } from "../services/ollamaHealth.js";
import {
  getSettingsPublicAsync,
  updateSettings,
} from "../services/settingsStore.js";

export const settingsRouter = Router();

settingsRouter.get("/api/settings", async (_req, res) => {
  res.json(await getSettingsPublicAsync());
});

settingsRouter.get("/api/settings/test-gemini", async (_req, res) => {
  const result = await testGeminiConnection();
  if (!result.ok) {
    const status = result.error.includes("No Gemini") ? 400 : 502;
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
  if (body.ollamaUrl !== undefined) {
    if (typeof body.ollamaUrl !== "string") {
      res.status(400).json({ error: "ollamaUrl must be a string" });
      return;
    }
    patch.ollamaUrl = body.ollamaUrl;
  }
  if (body.demoMode !== undefined) {
    if (typeof body.demoMode !== "boolean") {
      res.status(400).json({ error: "demoMode must be boolean" });
      return;
    }
    patch.demoMode = body.demoMode;
  }
  if (body.researchProvider !== undefined) {
    const p = body.researchProvider;
    if (p !== "auto" && p !== "gemini" && p !== "kimi" && p !== "free") {
      res.status(400).json({ error: "Invalid researchProvider" });
      return;
    }
    patch.researchProvider = p as ResearchProvider;
  }

  res.json(updateSettings(patch));
});

settingsRouter.get("/api/settings/test-ollama", async (_req, res) => {
  const ok = await checkOllamaReachable();
  if (!ok) {
    res.status(502).json({ ok: false, error: "Ollama not reachable at configured URL" });
    return;
  }
  res.json({ ok: true });
});
