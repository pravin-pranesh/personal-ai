import * as BackgroundFetch from "expo-background-fetch";
import * as TaskManager from "expo-task-manager";
import { Platform } from "react-native";
import { syncAllScheduledNotifications } from "./scheduleNotifications";

const TASK_NAME = "personal-ai-reschedule-notifications";

TaskManager.defineTask(TASK_NAME, async () => {
  try {
    await syncAllScheduledNotifications();
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch {
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

/** Best-effort: Expo Go may reject background fetch; rescheduling always runs on app open. */
export async function registerBackgroundReschedule(): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    const status = await BackgroundFetch.getStatusAsync();
    if (
      status === BackgroundFetch.BackgroundFetchStatus.Restricted ||
      status === BackgroundFetch.BackgroundFetchStatus.Denied
    ) {
      return;
    }
    await BackgroundFetch.registerTaskAsync(TASK_NAME, {
      minimumInterval: 60 * 15,
    });
  } catch {
    /* Expo Go / missing native module */
  }
}
