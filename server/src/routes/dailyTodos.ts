import { Router } from "express";
import {
  createDailyTodo,
  deleteDailyTodo,
  listDailyTodos,
  listDueTodos,
  updateDailyTodo,
} from "../services/daily/todoStore.js";

export const dailyTodosRouter = Router();

dailyTodosRouter.get("/api/daily/todos", (_req, res) => {
  res.json(listDailyTodos());
});

dailyTodosRouter.get("/api/daily/todos/due", (_req, res) => {
  res.json({ items: listDueTodos() });
});

dailyTodosRouter.post("/api/daily/todos", (req, res) => {
  const body = req.body && typeof req.body === "object" ? req.body : {};
  const title = typeof body.title === "string" ? body.title : "";
  const dueTime = typeof body.dueTime === "string" ? body.dueTime : undefined;
  const dueDate = typeof body.dueDate === "string" ? body.dueDate : undefined;
  try {
    const item = createDailyTodo(title, { dueTime, dueDate });
    res.status(201).json(item);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Invalid request";
    res.status(400).json({ error: message });
  }
});

dailyTodosRouter.patch("/api/daily/todos/:id", (req, res) => {
  const body = req.body && typeof req.body === "object" ? req.body : {};
  const patch: {
    title?: string;
    done?: boolean;
    dueTime?: string | null;
    dueDate?: string | null;
    dueNotified?: boolean;
  } = {};
  if (typeof body.title === "string") patch.title = body.title;
  if (typeof body.done === "boolean") patch.done = body.done;
  if (body.dueTime === null || typeof body.dueTime === "string") {
    patch.dueTime = body.dueTime as string | null;
  }
  if (body.dueDate === null || typeof body.dueDate === "string") {
    patch.dueDate = body.dueDate as string | null;
  }
  if (typeof body.dueNotified === "boolean") patch.dueNotified = body.dueNotified;

  if (Object.keys(patch).length === 0) {
    res.status(400).json({ error: "Nothing to update" });
    return;
  }

  try {
    const item = updateDailyTodo(req.params.id, patch);
    if (!item) {
      res.status(404).json({ error: "Todo not found" });
      return;
    }
    res.json(item);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Invalid request";
    res.status(400).json({ error: message });
  }
});

dailyTodosRouter.delete("/api/daily/todos/:id", (req, res) => {
  const ok = deleteDailyTodo(req.params.id);
  if (!ok) {
    res.status(404).json({ error: "Todo not found" });
    return;
  }
  res.json({ ok: true });
});
