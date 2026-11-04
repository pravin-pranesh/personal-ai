import crypto from "node:crypto";
import type { DailyTaskRun, DailyTasksPayload } from "@personal-ai/shared";
import {
  findRunForTopicOnDate,
  getDailyTasksFile,
  listRunsForLocalDate,
  upsertRun,
} from "./dailyTasksStore.js";
import { getResearchSessionById } from "./researchStore.js";
import { runResearchPipeline } from "./researchRunner.js";
import { getLocalDateTimeParts, parseRunTimeLocal } from "./timezoneLocal.js";

const inFlight = new Set<string>();

function enrichResults(
  runs: DailyTaskRun[],
): DailyTasksPayload["results"] {
  const results: NonNullable<DailyTasksPayload["results"]> = {};
  for (const run of runs) {
    if (run.status !== "done" || !run.researchSessionId) continue;
    const session = getResearchSessionById(run.researchSessionId);
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

  const running: DailyTaskRun = {
    ...run,
    status: "running",
    startedAt: new Date().toISOString(),
  };
  upsertRun(running);

  try {
    const session = await runResearchPipeline(run.topic);
    upsertRun({
      ...running,
      status: "done",
      researchSessionId: session.id,
      completedAt: new Date().toISOString(),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Research failed";
    upsertRun({
      ...running,
      status: "error",
      error: message,
      completedAt: new Date().toISOString(),
    });
  } finally {
    inFlight.delete(run.id);
  }
}

function ensureRunRecord(
  topicId: string,
  topic: string,
  localDate: string,
): DailyTaskRun {
  const existing = findRunForTopicOnDate(topicId, localDate);
  if (existing) {
    return existing;
  }
  const run: DailyTaskRun = {
    id: crypto.randomUUID(),
    topicId,
    topic,
    localDate,
    status: "pending",
  };
  upsertRun(run);
  return run;
}

/**
 * Ensure today's run rows exist and start research when local run time has passed.
 * Safe to call on every GET and on a lightweight interval while the server runs.
 */
export function tickDailyTasks(): DailyTasksPayload {
  const file = getDailyTasksFile();
  const { schedule, topics } = file;
  const { localDate, minutesOfDay } = getLocalDateTimeParts(schedule.timezone);
  const scheduledMinutes = parseRunTimeLocal(schedule.runTimeLocal);
  const isDue = scheduledMinutes !== null && minutesOfDay >= scheduledMinutes;

  for (const topic of topics) {
    let run = findRunForTopicOnDate(topic.id, localDate);
    if (!run) {
      run = ensureRunRecord(topic.id, topic.topic, localDate);
    }

    if (
      isDue &&
      run.status === "pending" &&
      !inFlight.has(run.id)
    ) {
      void executeRun(run);
    }
  }

  const todayRuns = listRunsForLocalDate(localDate).sort((a, b) =>
    a.topic.localeCompare(b.topic),
  );

  return {
    topics,
    schedule,
    todayRuns,
    results: enrichResults(todayRuns),
  };
}
