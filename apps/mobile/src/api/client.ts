import type {
  DailyTaskSchedule,
  DailyTaskTopic,
  DailyTasksPayload,
  EngineStatusPayload,
  DailyTodo,
  DailyTodosPayload,
  DashboardPayload,
  ClearLocalDataResponse,
  ReminderKind,
  RemindersPayload,
  ResearchCreateResponse,
  ResearchListPayload,
  ResearchRagPayload,
  ResearchSession,
  SettingsPublic,
  SettingsUpdateBody,
  StoredReminder,
} from "@personal-ai/shared";
import { getApiBaseUrl, isPhoneLocalMode } from "../config/api";
import * as dailyLocal from "../local/dailyTasksLocal";
import * as remindersLocal from "../local/remindersLocal";
import * as researchLocal from "../local/researchStore";
import * as settingsLocal from "../local/settingsSecure";
import * as todosLocal from "../local/todosLocal";

export class ApiRequestError extends Error {
  readonly status: number;
  readonly path: string;

  constructor(path: string, status: number, detail: string) {
    super(detail ? `API ${path} failed (${status}): ${detail}` : `API ${path} failed (${status})`);
    this.name = "ApiRequestError";
    this.status = status;
    this.path = path;
  }
}

async function readErrorDetail(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: string };
    if (typeof body?.error === "string" && body.error.trim()) {
      return body.error.trim();
    }
    return "";
  } catch {
    try {
      const text = await res.text();
      return text.trim().slice(0, 200);
    } catch {
      return "";
    }
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const base = getApiBaseUrl();
  if (!base) {
    throw new ApiRequestError(path, 0, "Remote API disabled (phone-local mode)");
  }
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  if (!res.ok) {
    const detail = await readErrorDetail(res);
    throw new ApiRequestError(path, res.status, detail);
  }
  return res.json() as Promise<T>;
}

export async function fetchHealth(): Promise<boolean> {
  if (isPhoneLocalMode()) return true;
  try {
    await request("/health");
    return true;
  } catch {
    return false;
  }
}

export function fetchDashboard(): Promise<DashboardPayload> {
  if (isPhoneLocalMode()) {
    return Promise.resolve({
      welcome: {
        greeting: "Personal AI",
        subtitle: "All data stays on this phone.",
      },
      stats: { installedCount: 0, favoriteCount: 0 },
      featured: [],
      favourites: [],
      categories: [],
      recentlyExecuted: [],
      recentResults: [],
    });
  }
  return request("/dashboard");
}

export function fetchDailyTodos(): Promise<DailyTodosPayload> {
  if (isPhoneLocalMode()) return todosLocal.listTodosLocal();
  return request("/api/daily/todos");
}

export function createDailyTodo(
  title: string,
  opts?: { dueTime?: string; dueDate?: string },
): Promise<DailyTodo> {
  if (isPhoneLocalMode()) return todosLocal.createTodoLocal(title, opts);
  return request("/api/daily/todos", {
    method: "POST",
    body: JSON.stringify({ title, ...opts }),
  });
}

export function fetchDueTodos(): Promise<DailyTodosPayload> {
  if (isPhoneLocalMode()) return todosLocal.listDueTodosLocal();
  return request("/api/daily/todos/due");
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
): Promise<DailyTodo> {
  if (isPhoneLocalMode()) {
    return todosLocal.updateTodoLocal(id, patch).then((t) => {
      if (!t) throw new ApiRequestError("/todos", 404, "Not found");
      return t;
    });
  }
  return request(`/api/daily/todos/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export function deleteDailyTodo(id: string): Promise<{ ok: boolean }> {
  if (isPhoneLocalMode()) {
    return todosLocal.deleteTodoLocal(id).then((ok) => ({ ok }));
  }
  return request(`/api/daily/todos/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export function fetchResearchSessions(): Promise<ResearchListPayload> {
  if (isPhoneLocalMode()) {
    return researchLocal.listResearchSessionsLocal().then((sessions) => ({ sessions }));
  }
  return request("/api/daily/research");
}

export function createResearchSession(prompt: string): Promise<ResearchCreateResponse> {
  if (isPhoneLocalMode()) return researchLocal.createResearchSessionLocal(prompt);
  return request("/api/daily/research", {
    method: "POST",
    body: JSON.stringify({ prompt }),
  });
}

export function fetchDailyTasks(): Promise<DailyTasksPayload> {
  if (isPhoneLocalMode()) return dailyLocal.fetchDailyTasksLocal();
  return request("/api/daily/tasks");
}

export function tickDailyTasks(): Promise<DailyTasksPayload> {
  if (isPhoneLocalMode()) return dailyLocal.tickDailyTasksLocal();
  return request("/api/daily/tasks/tick", { method: "POST" });
}

export function updateDailyTaskSchedule(
  schedule: Partial<DailyTaskSchedule>,
): Promise<{ schedule: DailyTaskSchedule }> {
  if (isPhoneLocalMode()) return dailyLocal.updateScheduleLocal(schedule);
  return request("/api/daily/tasks/schedule", {
    method: "PUT",
    body: JSON.stringify(schedule),
  });
}

export function createDailyTaskTopic(topic: string): Promise<DailyTaskTopic> {
  if (isPhoneLocalMode()) return dailyLocal.addTopicLocal(topic);
  return request("/api/daily/tasks/topics", {
    method: "POST",
    body: JSON.stringify({ topic }),
  });
}

export function deleteDailyTaskTopic(id: string): Promise<{ ok: boolean }> {
  if (isPhoneLocalMode()) {
    return dailyLocal.deleteTopicLocal(id).then((ok) => ({ ok }));
  }
  return request(`/api/daily/tasks/topics/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export async function clearLocalDailyData(): Promise<ClearLocalDataResponse> {
  if (isPhoneLocalMode()) {
    await todosLocal.clearTodosLocal();
    await researchLocal.clearResearchLocal();
    await dailyLocal.clearDailyTasksLocal();
    await remindersLocal.clearRemindersLocal();
    return { ok: true, cleared: ["todos", "research", "dailyTasks", "reminders"] };
  }
  return request("/api/daily/reset", { method: "POST" });
}

export function fetchSettings(): Promise<SettingsPublic> {
  if (isPhoneLocalMode()) return settingsLocal.getLocalSettingsPublic();
  return request("/api/settings");
}

export function updateSettings(body: SettingsUpdateBody): Promise<SettingsPublic> {
  if (isPhoneLocalMode()) return settingsLocal.updateLocalSettings(body);
  return request("/api/settings", {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export function testGeminiSettings(): Promise<{ ok: boolean; error?: string }> {
  if (isPhoneLocalMode()) return settingsLocal.testLocalGemini();
  return request("/api/settings/test-gemini");
}

export function testOllamaSettings(): Promise<{ ok: boolean; error?: string }> {
  if (isPhoneLocalMode()) return settingsLocal.testLocalOllama();
  return request("/api/settings/test-ollama");
}

export function fetchReminders(): Promise<RemindersPayload> {
  if (isPhoneLocalMode()) return remindersLocal.listRemindersLocal();
  return request("/api/daily/reminders");
}

export function fetchDueReminders(): Promise<RemindersPayload> {
  if (isPhoneLocalMode()) return remindersLocal.listDueRemindersLocal();
  return request("/api/daily/reminders/due");
}

export function createReminder(input: {
  title: string;
  fireAt: string;
  kind?: ReminderKind;
}): Promise<StoredReminder> {
  if (isPhoneLocalMode()) return remindersLocal.createReminderLocal(input);
  return request("/api/daily/reminders", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function ackReminder(id: string): Promise<{ ok: boolean }> {
  if (isPhoneLocalMode()) {
    return remindersLocal.ackReminderLocal(id).then(() => ({ ok: true }));
  }
  return request(`/api/daily/reminders/${encodeURIComponent(id)}/ack`, {
    method: "POST",
  });
}

export function deleteReminder(id: string): Promise<{ ok: boolean }> {
  if (isPhoneLocalMode()) {
    return remindersLocal.deleteReminderLocal(id).then((ok) => ({ ok }));
  }
  return request(`/api/daily/reminders/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export function searchResearchRag(q: string): Promise<ResearchRagPayload> {
  if (isPhoneLocalMode()) return researchLocal.searchResearchRagLocal(q);
  const params = new URLSearchParams({ q });
  return request(`/api/daily/research/rag?${params.toString()}`);
}

export function fetchResearchSession(id: string): Promise<ResearchSession> {
  if (isPhoneLocalMode()) {
    return researchLocal.getResearchSessionLocal(id).then((s) => {
      if (!s) throw new ApiRequestError("/research", 404, "Not found");
      return s;
    });
  }
  return request(`/api/daily/research/${encodeURIComponent(id)}`);
}

export function deleteResearchSession(id: string): Promise<{ ok: boolean }> {
  if (isPhoneLocalMode()) {
    return researchLocal.deleteResearchSessionLocal(id).then((ok) => ({ ok }));
  }
  return request(`/api/daily/research/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export function clearAllResearchHistory(): Promise<{ ok: boolean }> {
  if (isPhoneLocalMode()) {
    return researchLocal.clearResearchLocal().then(() => ({ ok: true }));
  }
  return request("/api/daily/research", { method: "DELETE" });
}

export async function fetchEngineStatus(): Promise<EngineStatusPayload> {
  if (isPhoneLocalMode()) {
    const { getEngineStatus } = await import("../local/engine/queue");
    return getEngineStatus();
  }
  return request<EngineStatusPayload>("/api/tasks/engine/status");
}

export async function enqueueEngineTask(
  type: import("@personal-ai/shared").EngineTaskType,
  payload: Record<string, unknown>,
) {
  if (isPhoneLocalMode()) {
    const { enqueueEngineTask: enqueue } = await import("../local/engine/queue");
    return enqueue(type, payload);
  }
  return request("/api/tasks/engine", {
    method: "POST",
    body: JSON.stringify({ type, payload }),
  });
}

export async function runEngineNow() {
  if (isPhoneLocalMode()) {
    const { processEngineQueue } = await import("../local/engine/processor");
    await processEngineQueue(3);
    return { ok: true };
  }
  return request("/api/tasks/engine/run", { method: "POST" });
}

export function processEngineQueueLocal(): Promise<void> {
  if (!isPhoneLocalMode()) return Promise.resolve();
  return import("../local/engine/processor").then((m) => m.processEngineQueue(2));
}

export function tickDailyTasksLocalOps(): Promise<unknown> {
  if (isPhoneLocalMode()) return dailyLocal.tickDailyTasksLocal();
  return tickDailyTasks();
}

export function tickMcpScheduleLocal(): Promise<void> {
  if (!isPhoneLocalMode()) return Promise.resolve();
  return import("../local/mcp/scheduler").then((m) => m.tickMcpSchedule());
}

export async function listMcpRunsLocal() {
  if (isPhoneLocalMode()) {
    const { listMcpRuns } = await import("../local/mcp/client");
    return listMcpRuns();
  }
  return [];
}

export async function exportAllResearchLocal() {
  if (!isPhoneLocalMode()) throw new Error("Export requires phone-local mode");
  const { exportAllResearch } = await import("../local/researchExport");
  return exportAllResearch();
}

export async function exportResearchSessionLocal(session: ResearchSession) {
  if (!isPhoneLocalMode()) throw new Error("Export requires phone-local mode");
  const { exportSessionMarkdown } = await import("../local/researchExport");
  return exportSessionMarkdown(session);
}
