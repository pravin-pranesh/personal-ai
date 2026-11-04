import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { DailyTodo, DailyTodosPayload } from "@personal-ai/shared";
import { writeJsonAtomic } from "./atomicJsonFile.js";
import { parseRunTimeLocal } from "./timezoneLocal.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TODOS_PATH = path.join(__dirname, "..", "..", "..", "data", "daily", "todos.json");

function ensureDailyDir(): void {
  fs.mkdirSync(path.dirname(TODOS_PATH), { recursive: true });
}

function readStore(): DailyTodosPayload {
  ensureDailyDir();
  if (!fs.existsSync(TODOS_PATH)) {
    return { items: [] };
  }
  const raw = JSON.parse(fs.readFileSync(TODOS_PATH, "utf8")) as DailyTodosPayload;
  if (!raw || !Array.isArray(raw.items)) {
    return { items: [] };
  }
  return raw;
}

function saveStore(store: DailyTodosPayload): void {
  writeJsonAtomic(TODOS_PATH, store);
}

function normalizeDueDate(value: string | undefined, fallbackIso: string): string | undefined {
  if (!value?.trim()) return undefined;
  const d = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) {
    throw new Error("dueDate must be YYYY-MM-DD");
  }
  return d;
}

function normalizeDueTime(value: string | undefined): string | undefined {
  if (!value?.trim()) return undefined;
  const minutes = parseRunTimeLocal(value);
  if (minutes === null) throw new Error("dueTime must be HH:MM");
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function dueInstantMs(todo: DailyTodo): number | null {
  if (!todo.dueTime) return null;
  const date = todo.dueDate ?? todo.createdAt.slice(0, 10);
  const minutes = parseRunTimeLocal(todo.dueTime);
  if (minutes === null) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return new Date(`${date}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`).getTime();
}

function sortTodos(items: DailyTodo[]): DailyTodo[] {
  return [...items].sort((a, b) => {
    const aDue = dueInstantMs(a);
    const bDue = dueInstantMs(b);
    if (aDue !== null && bDue !== null) return aDue - bDue;
    if (aDue !== null) return -1;
    if (bDue !== null) return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

export function listDailyTodos(): DailyTodosPayload {
  const store = readStore();
  return { items: sortTodos(store.items) };
}

export function createDailyTodo(
  title: string,
  opts?: { dueTime?: string; dueDate?: string },
): DailyTodo {
  const trimmed = title.trim();
  if (!trimmed) {
    throw new Error("Title is required");
  }
  const createdAt = new Date().toISOString();
  const dueTime = normalizeDueTime(opts?.dueTime);
  const dueDate = dueTime
    ? normalizeDueDate(opts?.dueDate, createdAt) ?? createdAt.slice(0, 10)
    : normalizeDueDate(opts?.dueDate, createdAt);

  const store = readStore();
  const item: DailyTodo = {
    id: crypto.randomUUID(),
    title: trimmed,
    done: false,
    createdAt,
    ...(dueTime ? { dueTime } : {}),
    ...(dueDate ? { dueDate } : {}),
  };
  store.items.unshift(item);
  saveStore(store);
  return item;
}

export function updateDailyTodo(
  id: string,
  patch: {
    title?: string;
    done?: boolean;
    dueTime?: string | null;
    dueDate?: string | null;
    dueNotified?: boolean;
  },
): DailyTodo | null {
  const store = readStore();
  const index = store.items.findIndex((t) => t.id === id);
  if (index < 0) return null;

  const current = store.items[index];
  if (patch.title !== undefined) {
    const trimmed = patch.title.trim();
    if (!trimmed) {
      throw new Error("Title is required");
    }
    current.title = trimmed;
  }
  if (patch.done !== undefined) {
    current.done = patch.done;
  }
  if (patch.dueTime !== undefined) {
    if (patch.dueTime === null || patch.dueTime === "") {
      delete current.dueTime;
      delete current.dueDate;
    } else {
      current.dueTime = normalizeDueTime(patch.dueTime);
      if (!current.dueDate) {
        current.dueDate = current.createdAt.slice(0, 10);
      }
    }
  }
  if (patch.dueDate !== undefined) {
    if (patch.dueDate === null || patch.dueDate === "") {
      delete current.dueDate;
    } else {
      current.dueDate = normalizeDueDate(patch.dueDate, current.createdAt);
    }
  }
  if (patch.dueNotified !== undefined) {
    current.dueNotified = patch.dueNotified;
  }

  store.items[index] = current;
  saveStore(store);
  return current;
}

export function listDueTodos(now = new Date()): DailyTodo[] {
  const ms = now.getTime();
  return listDailyTodos().items.filter((t) => {
    if (t.done || t.dueNotified) return false;
    const due = dueInstantMs(t);
    return due !== null && due <= ms;
  });
}

export function deleteDailyTodo(id: string): boolean {
  const store = readStore();
  const next = store.items.filter((t) => t.id !== id);
  if (next.length === store.items.length) return false;
  saveStore({ items: next });
  return true;
}

export function clearDailyTodos(): void {
  saveStore({ items: [] });
}

export { dueInstantMs };
