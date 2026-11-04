import type {
  DailyTodo,
  DailyTodosPayload,
  DashboardPayload,
  ClearLocalDataResponse,
  ResearchCreateResponse,
  ResearchListPayload,
  SettingsPublic,
  SettingsUpdateBody,
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

export function fetchSettings(): Promise<SettingsPublic> {
  return request("/api/settings");
}

export function updateSettings(body: SettingsUpdateBody): Promise<SettingsPublic> {
  return request("/api/settings", {
    method: "PUT",
    body: JSON.stringify(body),
  });
}
