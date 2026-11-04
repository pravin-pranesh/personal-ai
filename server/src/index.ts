import cors from "cors";
import express from "express";
import { getDb } from "./db/database.js";
import { dailyResearchRouter } from "./routes/dailyResearch.js";
import { dailyResetRouter } from "./routes/dailyReset.js";
import { dailyTasksRouter } from "./routes/dailyTasks.js";
import { settingsRouter } from "./routes/settings.js";
import { dailyTodosRouter } from "./routes/dailyTodos.js";
import { tasksRouter } from "./routes/tasks.js";
import { pruneOldResearchSessions } from "./services/daily/researchStore.js";
import { tickDailyTasks } from "./services/daily/dailyTasksScheduler.js";

const PORT = Number(process.env.PORT ?? 3001);
const HOST = process.env.HOST ?? "0.0.0.0";

getDb();

const app = express();
app.use(cors());
app.use(express.json());
app.use(tasksRouter);
app.use(dailyTodosRouter);
app.use(dailyResearchRouter);
app.use(dailyTasksRouter);
app.use(dailyResetRouter);
app.use(settingsRouter);

pruneOldResearchSessions({ log: true });

const DAILY_TASK_TICK_MS = 60_000;
setInterval(() => {
  try {
    tickDailyTasks();
  } catch (e) {
    console.warn("[daily-tasks] tick failed:", e instanceof Error ? e.message : e);
  }
}, DAILY_TASK_TICK_MS);

app.listen(PORT, HOST, () => {
  console.log(`Personal AI API listening on http://${HOST}:${PORT}`);
});
