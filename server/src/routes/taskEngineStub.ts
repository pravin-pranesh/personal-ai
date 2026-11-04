import { Router } from "express";

/** MA-5 — full catalog task engine deferred; Daily uses research pipeline directly. */
export const taskEngineStubRouter = Router();

taskEngineStubRouter.get("/api/tasks/engine/status", (_req, res) => {
  res.json({
    ready: false,
    message:
      "Task execution engine (MA-5) is not implemented. Daily research and scheduled topics use /api/daily/research.",
  });
});
