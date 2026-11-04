import { Router } from "express";
import { clearResearchData } from "../services/daily/researchStore.js";
import { clearDailyTodos } from "../services/daily/todoStore.js";

export const dailyResetRouter = Router();

dailyResetRouter.post("/api/daily/reset", (_req, res) => {
  clearDailyTodos();
  clearResearchData();
  res.json({ ok: true, cleared: ["todos", "research"] });
});
