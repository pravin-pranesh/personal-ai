import { Router } from "express";
import {
  createReminder,
  deleteReminder,
  dueReminders,
  listReminders,
  markReminderNotified,
} from "../services/daily/remindersStore.js";

export const remindersRouter = Router();

remindersRouter.get("/api/daily/reminders", (_req, res) => {
  res.json({ items: listReminders() });
});

remindersRouter.get("/api/daily/reminders/due", (_req, res) => {
  res.json({ items: dueReminders() });
});

remindersRouter.post("/api/daily/reminders", (req, res) => {
  const body = req.body && typeof req.body === "object" ? req.body : {};
  const title = typeof body.title === "string" ? body.title : "";
  const fireAt = typeof body.fireAt === "string" ? body.fireAt : "";
  const kind = body.kind === "alarm" ? "alarm" : "reminder";
  try {
    const item = createReminder({ title, fireAt, kind });
    res.status(201).json(item);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Invalid reminder";
    res.status(400).json({ error: message });
  }
});

remindersRouter.post("/api/daily/reminders/:id/ack", (req, res) => {
  markReminderNotified(req.params.id);
  res.json({ ok: true });
});

remindersRouter.delete("/api/daily/reminders/:id", (req, res) => {
  const ok = deleteReminder(req.params.id);
  if (!ok) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json({ ok: true });
});
