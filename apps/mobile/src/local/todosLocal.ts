import type { DailyTodo, DailyTodosPayload } from "@personal-ai/shared";
import { LOCAL_ROOT, newId, readJsonFile, writeJsonFile } from "./fsJson";
import { parseRunTimeLocal } from "./timezoneLocal";

const PATH = `${LOCAL_ROOT}/daily/todos.json`;

function normalizeDueTime(value?: string): string | undefined {
  if (!value?.trim()) return undefined;
  const m = parseRunTimeLocal(value);
  if (m === null) throw new Error("dueTime must be HH:MM");
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

function dueMs(todo: DailyTodo): number | null {
  if (!todo.dueTime) return null;
  const date = todo.dueDate ?? todo.createdAt.slice(0, 10);
  const m = parseRunTimeLocal(todo.dueTime);
  if (m === null) return null;
  const h = Math.floor(m / 60);
  const min = m % 60;
  return new Date(`${date}T${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}:00`).getTime();
}

function sort(items: DailyTodo[]): DailyTodo[] {
  return [...items].sort((a, b) => {
    const ad = dueMs(a);
    const bd = dueMs(b);
    if (ad !== null && bd !== null) return ad - bd;
    if (ad !== null) return -1;
    if (bd !== null) return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

async function read(): Promise<DailyTodosPayload> {
  return readJsonFile(PATH, { items: [] });
}

async function save(items: DailyTodo[]): Promise<void> {
  await writeJsonFile(PATH, { items });
}

export async function listTodosLocal(): Promise<DailyTodosPayload> {
  const data = await read();
  return { items: sort(data.items) };
}

export async function createTodoLocal(
  title: string,
  opts?: { dueTime?: string; dueDate?: string },
): Promise<DailyTodo> {
  const trimmed = title.trim();
  if (!trimmed) throw new Error("Title is required");
  const createdAt = new Date().toISOString();
  const dueTime = normalizeDueTime(opts?.dueTime);
  const item: DailyTodo = {
    id: newId(),
    title: trimmed,
    done: false,
    createdAt,
    ...(dueTime ? { dueTime, dueDate: opts?.dueDate?.trim() || createdAt.slice(0, 10) } : {}),
    ...(opts?.dueDate && !dueTime ? { dueDate: opts.dueDate.trim() } : {}),
  };
  const data = await read();
  data.items.unshift(item);
  await save(data.items);
  return item;
}

export async function updateTodoLocal(
  id: string,
  patch: {
    title?: string;
    done?: boolean;
    dueTime?: string | null;
    dueDate?: string | null;
    dueNotified?: boolean;
  },
): Promise<DailyTodo | null> {
  const data = await read();
  const idx = data.items.findIndex((t) => t.id === id);
  if (idx < 0) return null;
  const cur = data.items[idx];
  if (patch.title !== undefined) cur.title = patch.title.trim();
  if (patch.done !== undefined) cur.done = patch.done;
  if (patch.dueTime !== undefined) {
    if (!patch.dueTime) {
      delete cur.dueTime;
      delete cur.dueDate;
    } else {
      cur.dueTime = normalizeDueTime(patch.dueTime);
      cur.dueDate = cur.dueDate ?? cur.createdAt.slice(0, 10);
    }
  }
  if (patch.dueDate !== undefined) {
    if (!patch.dueDate) delete cur.dueDate;
    else cur.dueDate = patch.dueDate;
  }
  if (patch.dueNotified !== undefined) cur.dueNotified = patch.dueNotified;
  data.items[idx] = cur;
  await save(data.items);
  return cur;
}

export async function deleteTodoLocal(id: string): Promise<boolean> {
  const data = await read();
  const next = data.items.filter((t) => t.id !== id);
  if (next.length === data.items.length) return false;
  await save(next);
  return true;
}

export async function listDueTodosLocal(): Promise<DailyTodosPayload> {
  const now = Date.now();
  const items = (await listTodosLocal()).items.filter((t) => {
    if (t.done || t.dueNotified) return false;
    const d = dueMs(t);
    return d !== null && d <= now;
  });
  return { items };
}

export async function clearTodosLocal(): Promise<void> {
  await save([]);
}
