CREATE TABLE IF NOT EXISTS schema_migrations (
  id TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS task_definitions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  features_json TEXT NOT NULL DEFAULT '[]',
  required_inputs_json TEXT NOT NULL DEFAULT '[]',
  data_sources_json TEXT NOT NULL DEFAULT '[]',
  ai_requirements_json TEXT,
  runner_key TEXT NOT NULL,
  featured INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS installed_tasks (
  task_id TEXT PRIMARY KEY REFERENCES task_definitions(id) ON DELETE CASCADE,
  config_json TEXT NOT NULL DEFAULT '{}',
  installed_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS favorites (
  task_id TEXT PRIMARY KEY REFERENCES task_definitions(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
