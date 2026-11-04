import type {
  DailyTodo,
  DailyTodosPayload,
  DashboardPayload,
  InstalledPayload,
  ClearLocalDataResponse,
  ResearchCreateResponse,
  ResearchListPayload,
  TaskDefinitionSummary,
  TaskDetail,
} from "@personal-ai/shared";
import { getApiBaseUrl } from "../config/api";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  if (!res.ok) {
    throw new Error(`API ${path} failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function fetchHealth(): Promise<boolean> {
  try {
    await request("/health");
    return true;
  } catch {
    return false;
  }
}

export function fetchDashboard(): Promise<DashboardPayload> {
  return request("/dashboard");
}

export function fetchTasks(params?: {
  category?: string;
  q?: string;
}): Promise<{ tasks: TaskDefinitionSummary[] }> {
  const search = new URLSearchParams();
  if (params?.category && params.category !== "all") {
    search.set("category", params.category);
  }
  if (params?.q?.trim()) search.set("q", params.q.trim());
  const qs = search.toString();
  return request(`/tasks${qs ? `?${qs}` : ""}`);
}

export function fetchTask(id: string): Promise<TaskDetail> {
  return request(`/tasks/${encodeURIComponent(id)}`);
}

export function installTask(
  id: string,
  config?: Record<string, unknown>,
): Promise<{ ok: boolean; task: TaskDetail }> {
  return request(`/tasks/${encodeURIComponent(id)}/install`, {
    method: "POST",
    body: JSON.stringify({ config: config ?? {} }),
  });
}

export function uninstallTask(id: string): Promise<{ ok: boolean }> {
  return request(`/tasks/${encodeURIComponent(id)}/install`, {
    method: "DELETE",
  });
}

export function favoriteTask(id: string): Promise<{ ok: boolean; task: TaskDetail }> {
  return request(`/tasks/${encodeURIComponent(id)}/favorite`, {
    method: "POST",
  });
}

export function unfavoriteTask(id: string): Promise<{ ok: boolean }> {
  return request(`/tasks/${encodeURIComponent(id)}/favorite`, {
    method: "DELETE",
  });
}

export function fetchInstalled(): Promise<InstalledPayload> {
  return request("/installed");
}

export function fetchDailyTodos(): Promise<DailyTodosPayload> {
  return request("/api/daily/todos");
}

export function createDailyTodo(title: string): Promise<DailyTodo> {
  return request("/api/daily/todos", {
    method: "POST",
    body: JSON.stringify({ title }),
  });
}

export function updateDailyTodo(
  id: string,
  patch: { title?: string; done?: boolean },
): Promise<DailyTodo> {
  return request(`/api/daily/todos/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export function deleteDailyTodo(id: string): Promise<{ ok: boolean }> {
  return request(`/api/daily/todos/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export function fetchResearchSessions(): Promise<ResearchListPayload> {
  return request("/api/daily/research");
}

export function createResearchSession(prompt: string): Promise<ResearchCreateResponse> {
  return request("/api/daily/research", {
    method: "POST",
    body: JSON.stringify({ prompt }),
  });
}

export function clearLocalDailyData(): Promise<ClearLocalDataResponse> {
  return request("/api/daily/reset", { method: "POST" });
}
