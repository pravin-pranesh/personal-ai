import type {
  AiRequirements,
  DashboardPayload,
  InstalledPayload,
  TaskCategory,
  TaskDataSource,
  TaskDefinition,
  TaskDefinitionSummary,
  TaskDetail,
  TaskInputField,
} from "@personal-ai/shared";
import { STORE_CATEGORIES } from "@personal-ai/shared";
import type { DatabaseSync } from "node:sqlite";
import { getDb } from "../../db/database.js";

type TaskRow = {
  id: string;
  name: string;
  icon: string;
  category: string;
  description: string;
  features_json: string;
  required_inputs_json: string;
  data_sources_json: string;
  ai_requirements_json: string | null;
  runner_key: string;
  featured: number;
};

function rowToDefinition(row: TaskRow): TaskDefinition {
  return {
    id: row.id,
    name: row.name,
    icon: row.icon,
    category: row.category as TaskCategory,
    description: row.description,
    features: JSON.parse(row.features_json) as string[],
    requiredInputs: JSON.parse(row.required_inputs_json) as TaskInputField[],
    dataSources: JSON.parse(row.data_sources_json) as TaskDataSource[],
    aiRequirements: row.ai_requirements_json
      ? (JSON.parse(row.ai_requirements_json) as AiRequirements)
      : null,
    runnerKey: row.runner_key,
    featured: row.featured === 1,
  };
}

function rowToSummary(row: TaskRow): TaskDefinitionSummary {
  return {
    id: row.id,
    name: row.name,
    icon: row.icon,
    category: row.category as TaskCategory,
    description: row.description,
    featured: row.featured === 1,
  };
}

function isInstalled(database: DatabaseSync, taskId: string): boolean {
  const row = database
    .prepare("SELECT 1 FROM installed_tasks WHERE task_id = ?")
    .get(taskId);
  return !!row;
}

function isFavorite(database: DatabaseSync, taskId: string): boolean {
  const row = database
    .prepare("SELECT 1 FROM favorites WHERE task_id = ?")
    .get(taskId);
  return !!row;
}

export function listTasks(
  category?: string,
  q?: string,
): TaskDefinitionSummary[] {
  const database = getDb();
  let sql = "SELECT * FROM task_definitions WHERE 1=1";
  const params: string[] = [];

  if (category && category !== "all") {
    sql += " AND category = ?";
    params.push(category);
  }
  if (q?.trim()) {
    sql += " AND (name LIKE ? OR description LIKE ?)";
    const like = `%${q.trim()}%`;
    params.push(like, like);
  }
  sql += " ORDER BY name ASC";

  const rows = database.prepare(sql).all(...params) as TaskRow[];
  return rows.map(rowToSummary);
}

export function getTaskById(id: string): TaskDetail | null {
  const database = getDb();
  const row = database
    .prepare("SELECT * FROM task_definitions WHERE id = ?")
    .get(id) as TaskRow | undefined;
  if (!row) return null;
  const def = rowToDefinition(row);
  return {
    ...def,
    isInstalled: isInstalled(database, id),
    isFavorite: isFavorite(database, id),
  };
}

export function installTask(
  id: string,
  config: Record<string, unknown> = {},
): boolean {
  const database = getDb();
  const exists = database
    .prepare("SELECT id FROM task_definitions WHERE id = ?")
    .get(id);
  if (!exists) return false;
  database
    .prepare(
      `INSERT INTO installed_tasks (task_id, config_json) VALUES (?, ?)
       ON CONFLICT(task_id) DO UPDATE SET config_json = excluded.config_json`,
    )
    .run(id, JSON.stringify(config));
  return true;
}

export function uninstallTask(id: string): boolean {
  const database = getDb();
  const result = database
    .prepare("DELETE FROM installed_tasks WHERE task_id = ?")
    .run(id);
  return result.changes > 0;
}

export function addFavorite(id: string): boolean {
  const database = getDb();
  const exists = database
    .prepare("SELECT id FROM task_definitions WHERE id = ?")
    .get(id);
  if (!exists) return false;
  database
    .prepare("INSERT OR IGNORE INTO favorites (task_id) VALUES (?)")
    .run(id);
  return true;
}

export function removeFavorite(id: string): boolean {
  const database = getDb();
  const result = database
    .prepare("DELETE FROM favorites WHERE task_id = ?")
    .run(id);
  return result.changes > 0;
}

export function getInstalledPayload(): InstalledPayload {
  const database = getDb();
  const installedRows = database
    .prepare(
      `SELECT i.task_id, i.config_json, i.installed_at, t.name, t.icon, t.category
       FROM installed_tasks i
       JOIN task_definitions t ON t.id = i.task_id
       ORDER BY i.installed_at DESC`,
    )
    .all() as {
    task_id: string;
    config_json: string;
    installed_at: string;
    name: string;
    icon: string;
    category: string;
  }[];

  const favoriteRows = database
    .prepare(
      `SELECT t.* FROM favorites f
       JOIN task_definitions t ON t.id = f.task_id
       ORDER BY f.created_at DESC`,
    )
    .all() as TaskRow[];

  return {
    installed: installedRows.map((r) => ({
      taskId: r.task_id,
      name: r.name,
      icon: r.icon,
      category: r.category as TaskCategory,
      installedAt: r.installed_at,
      config: JSON.parse(r.config_json) as Record<string, unknown>,
    })),
    favorites: favoriteRows.map(rowToSummary),
    recentlyUsed: [],
  };
}

export function getDashboardPayload(): DashboardPayload {
  const database = getDb();
  const featuredRows = database
    .prepare(
      "SELECT * FROM task_definitions WHERE featured = 1 ORDER BY name LIMIT 6",
    )
    .all() as TaskRow[];

  const favoriteRows = database
    .prepare(
      `SELECT t.* FROM favorites f
       JOIN task_definitions t ON t.id = f.task_id
       ORDER BY f.created_at DESC LIMIT 8`,
    )
    .all() as TaskRow[];

  const installedCount = (
    database.prepare("SELECT COUNT(*) AS c FROM installed_tasks").get() as {
      c: number;
    }
  ).c;
  const favoriteCount = (
    database.prepare("SELECT COUNT(*) AS c FROM favorites").get() as {
      c: number;
    }
  ).c;

  const categoryCounts = database
    .prepare(
      "SELECT category, COUNT(*) AS c FROM task_definitions GROUP BY category",
    )
    .all() as { category: string; c: number }[];
  const countMap = new Map(categoryCounts.map((r) => [r.category, r.c]));

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return {
    welcome: {
      greeting,
      subtitle: "Discover and run AI research tasks from your personal store.",
    },
    stats: { installedCount, favoriteCount },
    featured: featuredRows.map(rowToSummary),
    favourites: favoriteRows.map(rowToSummary),
    categories: STORE_CATEGORIES.map((c) => ({
      id: c.id,
      label: c.label,
      taskCount: countMap.get(c.id) ?? 0,
    })),
    recentlyExecuted: [],
    recentResults: [],
  };
}
