import { Router } from "express";
import { clearDailyTasksData } from "../services/daily/dailyTasksStore.js";
import { clearResearchData } from "../services/daily/researchStore.js";
import { clearDailyTodos } from "../services/daily/todoStore.js";

export const dailyResetRouter = Router();

dailyResetRouter.post("/api/daily/reset", (_req, res) => {
  clearDailyTodos();
  clearResearchData();
  clearDailyTasksData();
  res.json({ ok: true, cleared: ["todos", "research", "dailyTasks"] });
});
