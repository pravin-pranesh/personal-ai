import { enqueueEngineTask } from "../engine/queue";
import { getLocalSettingsPublic } from "../settingsSecure";
import { getLocalDateTimeParts, parseRunTimeLocal } from "../timezoneLocal";
import { LOCAL_ROOT, readJsonFile, writeJsonFile } from "../fsJson";

const STATE_PATH = `${LOCAL_ROOT}/daily/mcp-scheduler-state.json`;

type State = { lastIntervalMs?: number; lastDailyDate?: string };

async function readState(): Promise<State> {
  return readJsonFile<State>(STATE_PATH, {});
}

async function writeState(state: State): Promise<void> {
  await writeJsonFile(STATE_PATH, state);
}

export async function tickMcpSchedule(): Promise<void> {
  const settings = await getLocalSettingsPublic();
  if (!settings.mcpEnabled || !settings.mcpSchedule.enabled) return;
  const schedule = settings.mcpSchedule;
  if (!schedule.serverId) return;

  const state = await readState();
  const now = Date.now();

  if (schedule.mode === "interval" && schedule.intervalMinutes) {
    const intervalMs = schedule.intervalMinutes * 60_000;
    if (!state.lastIntervalMs || now - state.lastIntervalMs >= intervalMs) {
      await enqueueEngineTask("mcp_call", {
        serverId: schedule.serverId,
        toolName: schedule.toolName ?? "default",
        arguments: schedule.arguments ?? {},
      });
      await writeState({ ...state, lastIntervalMs: now });
    }
    return;
  }

  if (schedule.mode === "daily" && schedule.runTimeLocal) {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    const { localDate, minutesOfDay } = getLocalDateTimeParts(tz);
    const target = parseRunTimeLocal(schedule.runTimeLocal);
    if (target !== null && minutesOfDay >= target && state.lastDailyDate !== localDate) {
      await enqueueEngineTask("mcp_call", {
        serverId: schedule.serverId,
        toolName: schedule.toolName ?? "default",
        arguments: schedule.arguments ?? {},
      });
      await writeState({ ...state, lastDailyDate: localDate });
    }
  }
}
