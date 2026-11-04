import type {
  DailyTaskRun,
  DailyTaskSchedule,
  DailyTaskTopic,
  DailyTasksPayload,
} from "@personal-ai/shared";
import { LOCAL_ROOT, newId, readJsonFile, writeJsonFile } from "./fsJson";
import { getLocalDateTimeParts, normalizeRunTimeLocal, parseRunTimeLocal } from "./timezoneLocal";
import { createResearchSessionLocal, getResearchSessionLocal } from "./researchStore";

const PATH = `${LOCAL_ROOT}/daily/daily-tasks.json`;

type File = {
  schedule: DailyTaskSchedule;
  topics: DailyTaskTopic[];
  runs: DailyTaskRun[];
};

const DEFAULT_SCHEDULE: DailyTaskSchedule = { runTimeLocal: "08:00", timezone: "UTC" };

async function readFile(): Promise<File> {
  return readJsonFile(PATH, { schedule: { ...DEFAULT_SCHEDULE }, topics: [], runs: [] });
}

async function saveFile(file: File): Promise<void> {
  await writeJsonFile(PATH, file);
}

const inFlight = new Set<string>();

async function enrichResultsAsync(runs: DailyTaskRun[]): Promise<DailyTasksPayload["results"]> {
  const results: NonNullable<DailyTasksPayload["results"]> = {};
  for (const run of runs) {
    if (run.status !== "done" || !run.researchSessionId) continue;
    const session = await getResearchSessionLocal(run.researchSessionId);
    if (!session) continue;
    results[run.id] = {
      prompt: session.prompt,
      summary: session.summary,
      cards: session.cards,
      createdAt: session.createdAt,
      ...(session.briefingMarkdown ? { briefingMarkdown: session.briefingMarkdown } : {}),
    };
  }
  return Object.keys(results).length ? results : undefined;
}

async function executeRun(run: DailyTaskRun): Promise<void> {
  if (inFlight.has(run.id)) return;
  inFlight.add(run.id);
  const file = await readFile();
  const running: DailyTaskRun = {
    ...run,
    status: "running",
    startedAt: new Date().toISOString(),
  };
  const idx = file.runs.findIndex((r) => r.id === run.id);
  if (idx >= 0) file.runs[idx] = running;
  else file.runs.push(running);
  await saveFile(file);
  try {
    const session = await createResearchSessionLocal(run.topic);
    const done: DailyTaskRun = {
      ...running,
      status: "done",
      researchSessionId: session.id,
      completedAt: new Date().toISOString(),
    };
    const f2 = await readFile();
    const i2 = f2.runs.findIndex((r) => r.id === run.id);
    if (i2 >= 0) f2.runs[i2] = done;
    await saveFile(f2);
  } catch (e) {
    const err: DailyTaskRun = {
      ...running,
      status: "error",
      error: e instanceof Error ? e.message : "Failed",
      completedAt: new Date().toISOString(),
    };
    const f2 = await readFile();
    const i2 = f2.runs.findIndex((r) => r.id === run.id);
    if (i2 >= 0) f2.runs[i2] = err;
    await saveFile(f2);
  } finally {
    inFlight.delete(run.id);
  }
}

export async function tickDailyTasksLocal(): Promise<DailyTasksPayload> {
  const file = await readFile();
  const { schedule, topics } = file;
  const { localDate, minutesOfDay } = getLocalDateTimeParts(schedule.timezone);
  const scheduledMinutes = parseRunTimeLocal(schedule.runTimeLocal);
  const isDue = scheduledMinutes !== null && minutesOfDay >= scheduledMinutes;

  for (const topic of topics) {
    let run = file.runs.find((r) => r.topicId === topic.id && r.localDate === localDate);
    if (!run) {
      run = {
        id: newId(),
        topicId: topic.id,
        topic: topic.topic,
        localDate,
        status: "pending",
      };
      file.runs.push(run);
      await saveFile(file);
    }
    if (isDue && run.status === "pending" && !inFlight.has(run.id)) {
      void executeRun(run);
    }
  }

  const fresh = await readFile();
  const todayRuns = fresh.runs
    .filter((r) => r.localDate === localDate)
    .sort((a, b) => a.topic.localeCompare(b.topic));

  return {
    topics: fresh.topics,
    schedule: fresh.schedule,
    todayRuns,
    results: await enrichResultsAsync(todayRuns),
  };
}

export async function fetchDailyTasksLocal(): Promise<DailyTasksPayload> {
  return tickDailyTasksLocal();
}

export async function updateScheduleLocal(
  patch: Partial<DailyTaskSchedule>,
): Promise<{ schedule: DailyTaskSchedule }> {
  const file = await readFile();
  if (patch.runTimeLocal !== undefined) {
    file.schedule.runTimeLocal = normalizeRunTimeLocal(patch.runTimeLocal);
  }
  if (patch.timezone !== undefined) {
    file.schedule.timezone = patch.timezone.trim() || "UTC";
  }
  await saveFile(file);
  return { schedule: file.schedule };
}

export async function addTopicLocal(topic: string): Promise<DailyTaskTopic> {
  const trimmed = topic.trim();
  if (!trimmed) throw new Error("Topic is required");
  const file = await readFile();
  const item: DailyTaskTopic = {
    id: newId(),
    topic: trimmed,
    createdAt: new Date().toISOString(),
  };
  file.topics.push(item);
  await saveFile(file);
  return item;
}

export async function deleteTopicLocal(id: string): Promise<boolean> {
  const file = await readFile();
  const next = file.topics.filter((t) => t.id !== id);
  if (next.length === file.topics.length) return false;
  file.topics = next;
  await saveFile(file);
  return true;
}

export async function clearDailyTasksLocal(): Promise<void> {
  await saveFile({ schedule: { ...DEFAULT_SCHEDULE }, topics: [], runs: [] });
}
