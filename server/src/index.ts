import cors from "cors";
import express from "express";
import { getDb } from "./db/database.js";
import { dailyResearchRouter } from "./routes/dailyResearch.js";
import { dailyResetRouter } from "./routes/dailyReset.js";
import { settingsRouter } from "./routes/settings.js";
import { dailyTodosRouter } from "./routes/dailyTodos.js";
import { tasksRouter } from "./routes/tasks.js";

const PORT = Number(process.env.PORT ?? 3001);
const HOST = process.env.HOST ?? "0.0.0.0";

getDb();

const app = express();
app.use(cors());
app.use(express.json());
app.use(tasksRouter);
app.use(dailyTodosRouter);
app.use(dailyResearchRouter);
app.use(dailyResetRouter);
app.use(settingsRouter);

app.listen(PORT, HOST, () => {
  console.log(`Personal AI API listening on http://${HOST}:${PORT}`);
});
