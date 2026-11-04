import { Linking } from "react-native";
import { createResearchSessionLocal } from "../researchStore";
import { createReminderLocal } from "../remindersLocal";
import { createTodoLocal } from "../todosLocal";
import { tickDailyTasksLocal } from "../dailyTasksLocal";
import { invokeMcpTool } from "../mcp/client";
import { enqueueEngineTask, nextPendingTask, updateEngineTask } from "./queue";

let processing = false;

async function runTask(task: Awaited<ReturnType<typeof nextPendingTask>> & object): Promise<void> {
  if (!task) return;
  await updateEngineTask(task.id, {
    status: "running",
    startedAt: new Date().toISOString(),
  });

  try {
    let result: Record<string, unknown> = {};
    switch (task.type) {
      case "research": {
        const prompt = String(task.payload.prompt ?? "");
        const session = await createResearchSessionLocal(prompt);
        result = { sessionId: session.id };
        break;
      }
      case "todo": {
        const title = String(task.payload.title ?? "");
        const item = await createTodoLocal(title, {
          dueTime: task.payload.dueTime ? String(task.payload.dueTime) : undefined,
          dueDate: task.payload.dueDate ? String(task.payload.dueDate) : undefined,
        });
        result = { todoId: item.id };
        break;
      }
      case "reminder": {
        const item = await createReminderLocal({
          title: String(task.payload.title ?? "Reminder"),
          fireAt: String(task.payload.fireAt ?? new Date().toISOString()),
          kind: task.payload.kind === "alarm" ? "alarm" : "reminder",
        });
        result = { reminderId: item.id };
        break;
      }
      case "open_url": {
        const url = String(task.payload.url ?? "");
        await Linking.openURL(url);
        result = { url };
        break;
      }
      case "scheduled_daily": {
        const payload = await tickDailyTasksLocal();
        result = { runCount: payload.todayRuns.length };
        break;
      }
      case "mcp_call": {
        const out = await invokeMcpTool({
          serverId: String(task.payload.serverId ?? ""),
          toolName: String(task.payload.toolName ?? "default"),
          arguments: (task.payload.arguments as Record<string, unknown>) ?? {},
        });
        result = out;
        break;
      }
      default:
        throw new Error(`Unknown task type`);
    }
    await updateEngineTask(task.id, {
      status: "done",
      completedAt: new Date().toISOString(),
      result,
    });
  } catch (e) {
    await updateEngineTask(task.id, {
      status: "error",
      completedAt: new Date().toISOString(),
      error: e instanceof Error ? e.message : "Task failed",
    });
  }
}

export async function processEngineQueue(maxTasks = 2): Promise<void> {
  if (processing) return;
  processing = true;
  try {
    for (let i = 0; i < maxTasks; i += 1) {
      const task = await nextPendingTask();
      if (!task) break;
      await runTask(task);
    }
  } finally {
    processing = false;
  }
}

export async function runEngineNow(type?: string): Promise<void> {
  if (type === "scheduled_daily") {
    await enqueueEngineTask("scheduled_daily", {});
  }
  await processEngineQueue(3);
}
