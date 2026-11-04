import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { DailyTodo, DailyTodosPayload } from "@personal-ai/shared";
import { writeJsonAtomic } from "./atomicJsonFile.js";

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

export function listDailyTodos(): DailyTodosPayload {
  return readStore();
}

export function createDailyTodo(title: string): DailyTodo {
  const trimmed = title.trim();
  if (!trimmed) {
    throw new Error("Title is required");
  }
  const store = readStore();
  const item: DailyTodo = {
    id: crypto.randomUUID(),
    title: trimmed,
    done: false,
    createdAt: new Date().toISOString(),
  };
  store.items.unshift(item);
  saveStore(store);
  return item;
}

export function updateDailyTodo(
  id: string,
  patch: { title?: string; done?: boolean },
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
  store.items[index] = current;
  saveStore(store);
  return current;
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
