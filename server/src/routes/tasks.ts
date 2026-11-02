import { Router } from "express";
import {
  addFavorite,
  getDashboardPayload,
  getInstalledPayload,
  getTaskById,
  installTask,
  listTasks,
  removeFavorite,
  uninstallTask,
} from "../services/tasks/taskRepository.js";

export const tasksRouter = Router();

tasksRouter.get("/health", (_req, res) => {
  res.json({ ok: true });
});

tasksRouter.get("/dashboard", (_req, res) => {
  res.json(getDashboardPayload());
});

tasksRouter.get("/tasks", (req, res) => {
  const category = typeof req.query.category === "string" ? req.query.category : undefined;
  const q = typeof req.query.q === "string" ? req.query.q : undefined;
  res.json({ tasks: listTasks(category, q) });
});

tasksRouter.get("/tasks/:id", (req, res) => {
  const task = getTaskById(req.params.id);
  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }
  res.json(task);
});

tasksRouter.post("/tasks/:id/install", (req, res) => {
  const config =
    req.body && typeof req.body === "object" && "config" in req.body
      ? (req.body.config as Record<string, unknown>)
      : {};
  const ok = installTask(req.params.id, config);
  if (!ok) {
    res.status(404).json({ error: "Task not found" });
    return;
  }
  res.json({ ok: true, task: getTaskById(req.params.id) });
});

tasksRouter.delete("/tasks/:id/install", (req, res) => {
  uninstallTask(req.params.id);
  res.json({ ok: true });
});

tasksRouter.post("/tasks/:id/favorite", (req, res) => {
  const ok = addFavorite(req.params.id);
  if (!ok) {
    res.status(404).json({ error: "Task not found" });
    return;
  }
  res.json({ ok: true, task: getTaskById(req.params.id) });
});

tasksRouter.delete("/tasks/:id/favorite", (req, res) => {
  removeFavorite(req.params.id);
  res.json({ ok: true });
});

tasksRouter.get("/installed", (_req, res) => {
  res.json(getInstalledPayload());
});
