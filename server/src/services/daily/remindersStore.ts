import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { ReminderKind, StoredReminder } from "@personal-ai/shared";
import { writeJsonAtomic } from "./atomicJsonFile.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STORE_PATH = path.join(__dirname, "..", "..", "..", "data", "daily", "reminders.json");

type RemindersFile = { items: StoredReminder[] };

function readFile(): RemindersFile {
  fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true });
  if (!fs.existsSync(STORE_PATH)) return { items: [] };
  const raw = JSON.parse(fs.readFileSync(STORE_PATH, "utf8")) as RemindersFile;
  return { items: Array.isArray(raw?.items) ? raw.items : [] };
}

function save(file: RemindersFile): void {
  writeJsonAtomic(STORE_PATH, file);
}

export function listReminders(): StoredReminder[] {
  return readFile().items.sort(
    (a, b) => new Date(a.fireAt).getTime() - new Date(b.fireAt).getTime(),
  );
}

export function createReminder(input: {
  title: string;
  fireAt: string;
  kind?: ReminderKind;
}): StoredReminder {
  const title = input.title.trim();
  if (!title) throw new Error("Title is required");
  const fireAt = input.fireAt.trim();
  if (!fireAt || Number.isNaN(new Date(fireAt).getTime())) {
    throw new Error("fireAt must be ISO datetime");
  }
  const item: StoredReminder = {
    id: crypto.randomUUID(),
    title,
    kind: input.kind ?? "reminder",
    fireAt,
    createdAt: new Date().toISOString(),
  };
  const file = readFile();
  file.items.push(item);
  save(file);
  return item;
}

export function deleteReminder(id: string): boolean {
  const file = readFile();
  const next = file.items.filter((r) => r.id !== id);
  if (next.length === file.items.length) return false;
  save({ items: next });
  return true;
}

export function markReminderNotified(id: string): void {
  const file = readFile();
  const item = file.items.find((r) => r.id === id);
  if (!item) return;
  item.notified = true;
  save(file);
}

export function clearReminders(): void {
  save({ items: [] });
}

/** Reminders whose fire time passed since last check (for mascot / polling). */
export function dueReminders(now = new Date()): StoredReminder[] {
  const ms = now.getTime();
  return listReminders().filter((r) => !r.notified && new Date(r.fireAt).getTime() <= ms);
}
