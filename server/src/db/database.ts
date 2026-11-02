import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import { CATALOG_SEED } from "./seedTasks.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DATA_DIR = path.join(__dirname, "..", "..", "data");
const DB_PATH = path.join(DATA_DIR, "app.db");

let db: Database.Database | null = null;

function runMigrations(database: Database.Database): void {
  const migrationsDir = path.join(__dirname, "migrations");
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  database.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const applied = new Set(
    database
      .prepare("SELECT id FROM schema_migrations")
      .all()
      .map((row) => (row as { id: string }).id),
  );

  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
    database.exec(sql);
    database.prepare("INSERT INTO schema_migrations (id) VALUES (?)").run(file);
  }
}

function seedCatalog(database: Database.Database): void {
  const count = database
    .prepare("SELECT COUNT(*) AS c FROM task_definitions")
    .get() as { c: number };
  if (count.c > 0) return;

  const insert = database.prepare(`
    INSERT INTO task_definitions (
      id, name, icon, category, description,
      features_json, required_inputs_json, data_sources_json,
      ai_requirements_json, runner_key, featured
    ) VALUES (
      @id, @name, @icon, @category, @description,
      @features_json, @required_inputs_json, @data_sources_json,
      @ai_requirements_json, @runner_key, @featured
    )
  `);

  const tx = database.transaction(() => {
    for (const task of CATALOG_SEED) {
      insert.run({
        id: task.id,
        name: task.name,
        icon: task.icon,
        category: task.category,
        description: task.description,
        features_json: JSON.stringify(task.features),
        required_inputs_json: JSON.stringify(task.requiredInputs),
        data_sources_json: JSON.stringify(task.dataSources),
        ai_requirements_json: task.aiRequirements
          ? JSON.stringify(task.aiRequirements)
          : null,
        runner_key: task.runnerKey,
        featured: task.featured ? 1 : 0,
      });
    }
  });
  tx();
}

export function getDb(): Database.Database {
  if (db) return db;
  fs.mkdirSync(DATA_DIR, { recursive: true });
  db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  runMigrations(db);
  seedCatalog(db);
  return db;
}
