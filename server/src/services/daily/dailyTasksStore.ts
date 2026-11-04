import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type {
  DailyTaskRun,
  DailyTaskSchedule,
  DailyTaskTopic,
} from "@personal-ai/shared";
import { writeJsonAtomic } from "./atomicJsonFile.js";
import { normalizeRunTimeLocal } from "./timezoneLocal.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STORE_PATH = path.join(__dirname, "..", "..", "..", "data", "daily", "daily-tasks.json");

export type DailyTasksFile = {
  schedule: DailyTaskSchedule;
  topics: DailyTaskTopic[];
  runs: DailyTaskRun[];
};

const DEFAULT_SCHEDULE: DailyTaskSchedule = {
  runTimeLocal: "08:00",
  timezone: "UTC",
};

function ensureDailyDir(): void {
  fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true });
}

function readFile(): DailyTasksFile {
  ensureDailyDir();
  if (!fs.existsSync(STORE_PATH)) {
    return { schedule: { ...DEFAULT_SCHEDULE }, topics: [], runs: [] };
  }
  const raw = JSON.parse(fs.readFileSync(STORE_PATH, "utf8")) as DailyTasksFile;
  return {
    schedule: raw?.schedule?.runTimeLocal
      ? {
          runTimeLocal: raw.schedule.runTimeLocal,
          timezone: raw.schedule.timezone?.trim() || "UTC",
        }
      : { ...DEFAULT_SCHEDULE },
    topics: Array.isArray(raw?.topics) ? raw.topics : [],
    runs: Array.isArray(raw?.runs) ? raw.runs : [],
  };
}

function saveFile(store: DailyTasksFile): void {
  writeJsonAtomic(STORE_PATH, store);
}

export function getDailyTasksFile(): DailyTasksFile {
  return readFile();
}

export function updateDailyTaskSchedule(patch: Partial<DailyTaskSchedule>): DailyTaskSchedule {
  const store = readFile();
  if (patch.runTimeLocal !== undefined) {
    store.schedule.runTimeLocal = normalizeRunTimeLocal(patch.runTimeLocal);
  }
  if (patch.timezone !== undefined) {
    const tz = patch.timezone.trim();
    if (!tz) {
      throw new Error("timezone is required");
    }
    store.schedule.timezone = tz;
  }
  saveFile(store);
  return store.schedule;
}

export function addDailyTaskTopic(topic: string): DailyTaskTopic {
  const trimmed = topic.trim();
  if (!trimmed) {
    throw new Error("Topic is required");
  }
  const store = readFile();
  const item: DailyTaskTopic = {
    id: crypto.randomUUID(),
    topic: trimmed,
    createdAt: new Date().toISOString(),
  };
  store.topics.push(item);
  saveFile(store);
  return item;
}

export function deleteDailyTaskTopic(id: string): boolean {
  const store = readFile();
  const nextTopics = store.topics.filter((t) => t.id !== id);
  if (nextTopics.length === store.topics.length) {
    return false;
  }
  store.topics = nextTopics;
  saveFile(store);
  return true;
}

export function upsertRun(run: DailyTaskRun): void {
  const store = readFile();
  const idx = store.runs.findIndex((r) => r.id === run.id);
  if (idx >= 0) {
    store.runs[idx] = run;
  } else {
    store.runs.push(run);
  }
  saveFile(store);
}

export function findRunForTopicOnDate(
  topicId: string,
  localDate: string,
): DailyTaskRun | undefined {
  const store = readFile();
  return store.runs.find((r) => r.topicId === topicId && r.localDate === localDate);
}

export function listRunsForLocalDate(localDate: string): DailyTaskRun[] {
  const store = readFile();
  return store.runs.filter((r) => r.localDate === localDate);
}

export function clearDailyTasksData(): void {
  saveFile({ schedule: { ...DEFAULT_SCHEDULE }, topics: [], runs: [] });
}
