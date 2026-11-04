import { Router } from "express";
import {
  addDailyTaskTopic,
  deleteDailyTaskTopic,
  updateDailyTaskSchedule,
} from "../services/daily/dailyTasksStore.js";
import { tickDailyTasks } from "../services/daily/dailyTasksScheduler.js";

export const dailyTasksRouter = Router();

dailyTasksRouter.get("/api/daily/tasks", (_req, res) => {
  res.json(tickDailyTasks());
});

dailyTasksRouter.post("/api/daily/tasks/tick", (_req, res) => {
  res.json(tickDailyTasks());
});

dailyTasksRouter.put("/api/daily/tasks/schedule", (req, res) => {
  const body = req.body && typeof req.body === "object" ? req.body : {};
  try {
    const schedule = updateDailyTaskSchedule({
      runTimeLocal:
        typeof body.runTimeLocal === "string" ? body.runTimeLocal : undefined,
      timezone: typeof body.timezone === "string" ? body.timezone : undefined,
    });
    res.json({ schedule });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Invalid schedule";
    res.status(400).json({ error: message });
  }
});

dailyTasksRouter.post("/api/daily/tasks/topics", (req, res) => {
  const topic =
    req.body && typeof req.body === "object" && typeof req.body.topic === "string"
      ? req.body.topic
      : "";
  try {
    const created = addDailyTaskTopic(topic);
    res.status(201).json(created);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Invalid topic";
    res.status(400).json({ error: message });
  }
});

dailyTasksRouter.delete("/api/daily/tasks/topics/:id", (req, res) => {
  const ok = deleteDailyTaskTopic(req.params.id);
  if (!ok) {
    res.status(404).json({ error: "Topic not found" });
    return;
  }
  res.json({ ok: true });
});
