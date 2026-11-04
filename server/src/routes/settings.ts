import { Router } from "express";
import type { SettingsUpdateBody } from "@personal-ai/shared";
import { getSettingsPublic, updateSettings } from "../services/settingsStore.js";

export const settingsRouter = Router();

settingsRouter.get("/api/settings", (_req, res) => {
  res.json(getSettingsPublic());
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

  res.json(updateSettings(patch));
});
