import { Router } from "express";
import {
  createDailyTodo,
  deleteDailyTodo,
  listDailyTodos,
  updateDailyTodo,
} from "../services/daily/todoStore.js";

export const dailyTodosRouter = Router();

dailyTodosRouter.get("/api/daily/todos", (_req, res) => {
  res.json(listDailyTodos());
});

dailyTodosRouter.post("/api/daily/todos", (req, res) => {
  const title =
    req.body && typeof req.body === "object" && typeof req.body.title === "string"
      ? req.body.title
      : "";
  try {
    const item = createDailyTodo(title);
    res.status(201).json(item);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Invalid request";
    res.status(400).json({ error: message });
  }
});

dailyTodosRouter.patch("/api/daily/todos/:id", (req, res) => {
  const body = req.body && typeof req.body === "object" ? req.body : {};
  const patch: { title?: string; done?: boolean } = {};
  if (typeof body.title === "string") patch.title = body.title;
  if (typeof body.done === "boolean") patch.done = body.done;

  if (patch.title === undefined && patch.done === undefined) {
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
