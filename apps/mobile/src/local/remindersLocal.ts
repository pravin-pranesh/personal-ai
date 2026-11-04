import type { ReminderKind, RemindersPayload, StoredReminder } from "@personal-ai/shared";
import { LOCAL_ROOT, newId, readJsonFile, writeJsonFile } from "./fsJson";

const PATH = `${LOCAL_ROOT}/daily/reminders.json`;

async function read(): Promise<RemindersPayload> {
  return readJsonFile(PATH, { items: [] });
}

async function save(items: StoredReminder[]): Promise<void> {
  await writeJsonFile(PATH, { items });
}

export async function listRemindersLocal(): Promise<RemindersPayload> {
  const data = await read();
  return {
    items: [...data.items].sort(
      (a, b) => new Date(a.fireAt).getTime() - new Date(b.fireAt).getTime(),
    ),
  };
}

export async function createReminderLocal(input: {
  title: string;
  fireAt: string;
  kind?: ReminderKind;
}): Promise<StoredReminder> {
  const title = input.title.trim();
  if (!title) throw new Error("Title is required");
  if (Number.isNaN(new Date(input.fireAt).getTime())) throw new Error("Invalid fireAt");
  const item: StoredReminder = {
    id: newId(),
    title,
    kind: input.kind ?? "reminder",
    fireAt: input.fireAt,
    createdAt: new Date().toISOString(),
  };
  const data = await read();
  data.items.push(item);
  await save(data.items);
  return item;
}

export async function ackReminderLocal(id: string): Promise<void> {
  const data = await read();
  const item = data.items.find((r) => r.id === id);
  if (item) {
    item.notified = true;
    await save(data.items);
  }
}

export async function deleteReminderLocal(id: string): Promise<boolean> {
  const data = await read();
  const next = data.items.filter((r) => r.id !== id);
  if (next.length === data.items.length) return false;
  await save(next);
  return true;
}

export async function listDueRemindersLocal(): Promise<RemindersPayload> {
  const now = Date.now();
  return {
    items: (await listRemindersLocal()).items.filter(
      (r) => !r.notified && new Date(r.fireAt).getTime() <= now,
    ),
  };
}

export async function clearRemindersLocal(): Promise<void> {
  await save([]);
}
