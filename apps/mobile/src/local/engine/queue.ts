import type {
  EngineStatusPayload,
  EngineTask,
  EngineTaskStatus,
  EngineTaskType,
} from "@personal-ai/shared";
import { LOCAL_ROOT, newId, readJsonFile, writeJsonFile } from "../fsJson";

const QUEUE_PATH = `${LOCAL_ROOT}/daily/engine-queue.json`;

type QueueFile = { tasks: EngineTask[] };

async function readQueue(): Promise<QueueFile> {
  return readJsonFile<QueueFile>(QUEUE_PATH, { tasks: [] });
}

async function saveQueue(tasks: EngineTask[]): Promise<void> {
  await writeJsonFile(QUEUE_PATH, { tasks });
}

export async function listEngineTasks(limit = 50): Promise<EngineTask[]> {
  const { tasks } = await readQueue();
  return [...tasks]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
}

export async function getEngineStatus(): Promise<EngineStatusPayload> {
  const tasks = await listEngineTasks(100);
  return {
    pending: tasks.filter((t) => t.status === "pending").length,
    running: tasks.filter((t) => t.status === "running").length,
    done: tasks.filter((t) => t.status === "done").length,
    error: tasks.filter((t) => t.status === "error").length,
    tasks: tasks.slice(0, 20),
  };
}

export async function enqueueEngineTask(
  type: EngineTaskType,
  payload: Record<string, unknown>,
): Promise<EngineTask> {
  const task: EngineTask = {
    id: newId(),
    type,
    status: "pending",
    payload,
    createdAt: new Date().toISOString(),
  };
  const file = await readQueue();
  file.tasks.unshift(task);
  await saveQueue(file.tasks);
  return task;
}

export async function updateEngineTask(
  id: string,
  patch: Partial<EngineTask>,
): Promise<EngineTask | null> {
  const file = await readQueue();
  const idx = file.tasks.findIndex((t) => t.id === id);
  if (idx < 0) return null;
  file.tasks[idx] = { ...file.tasks[idx], ...patch };
  await saveQueue(file.tasks);
  return file.tasks[idx];
}

export async function nextPendingTask(): Promise<EngineTask | null> {
  const file = await readQueue();
  return file.tasks.find((t) => t.status === "pending") ?? null;
}

export async function clearFinishedEngineTasks(): Promise<void> {
  const file = await readQueue();
  await saveQueue(file.tasks.filter((t) => t.status === "pending" || t.status === "running"));
}
