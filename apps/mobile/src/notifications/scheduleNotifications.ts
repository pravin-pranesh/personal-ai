import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import {
  ackReminder,
  fetchDailyTasks,
  fetchDueReminders,
  fetchDueTodos,
  fetchDailyTodos,
  fetchReminders,
  updateDailyTodo,
} from "../api/client";

export const CHANNEL_REMINDERS = "personal-ai-reminders";
export const CHANNEL_TODOS = "personal-ai-todos";
export const CHANNEL_DAILY = "personal-ai-daily";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function ensureNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  const { status } = await Notifications.getPermissionsAsync();
  if (status === "granted") return true;
  const req = await Notifications.requestPermissionsAsync();
  return req.status === "granted";
}

async function setupAndroidChannels(): Promise<void> {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync(CHANNEL_REMINDERS, {
    name: "Reminders & alarms",
    importance: Notifications.AndroidImportance.HIGH,
    sound: "default",
  });
  await Notifications.setNotificationChannelAsync(CHANNEL_TODOS, {
    name: "Todo due times",
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: "default",
  });
  await Notifications.setNotificationChannelAsync(CHANNEL_DAILY, {
    name: "Daily research schedule",
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: "default",
  });
}

function parseDailyTime(runTimeLocal: string): { hour: number; minute: number } | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(runTimeLocal.trim());
  if (!match) return null;
  return {
    hour: Number.parseInt(match[1], 10),
    minute: Number.parseInt(match[2], 10),
  };
}

export type NotificationFireHandler = (payload: {
  title: string;
  kind: "reminder" | "todo" | "daily";
  id?: string;
}) => void;

export async function syncAllScheduledNotifications(
  onFire?: NotificationFireHandler,
): Promise<void> {
  if (Platform.OS === "web") return;
  const ok = await ensureNotificationPermissions();
  if (!ok) return;

  await setupAndroidChannels();
  await Notifications.cancelAllScheduledNotificationsAsync();

  const now = Date.now();

  const { items: reminders } = await fetchReminders();
  for (const item of reminders) {
    const fireMs = new Date(item.fireAt).getTime();
    if (fireMs <= now || item.notified) continue;
    await Notifications.scheduleNotificationAsync({
      content: {
        title: item.kind === "alarm" ? "Alarm" : "Reminder",
        body: item.title,
        data: { kind: "reminder", reminderId: item.id },
        ...(Platform.OS === "android" ? { channelId: CHANNEL_REMINDERS } : {}),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(fireMs),
      },
    });
  }

  const { items: todos } = await fetchDailyTodos();
  for (const todo of todos) {
    if (todo.done || !todo.dueTime) continue;
    const date = todo.dueDate ?? todo.createdAt.slice(0, 10);
    const parts = parseDailyTime(todo.dueTime);
    if (!parts) continue;
    const fireMs = new Date(
      `${date}T${String(parts.hour).padStart(2, "0")}:${String(parts.minute).padStart(2, "0")}:00`,
    ).getTime();
    if (fireMs <= now) continue;
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Todo due",
        body: todo.title,
        data: { kind: "todo", todoId: todo.id },
        ...(Platform.OS === "android" ? { channelId: CHANNEL_TODOS } : {}),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(fireMs),
      },
    });
  }

  try {
    const daily = await fetchDailyTasks();
    const t = parseDailyTime(daily.schedule.runTimeLocal);
    if (t && daily.topics.length > 0) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Daily research",
          body: `${daily.topics.length} topic(s) scheduled — open Schedule tab.`,
          data: { kind: "daily" },
          ...(Platform.OS === "android" ? { channelId: CHANNEL_DAILY } : {}),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: t.hour,
          minute: t.minute,
        },
      });
    }
  } catch {
    /* server offline */
  }

  const dueReminders = await fetchDueReminders();
  for (const item of dueReminders.items) {
    onFire?.({ title: item.title, kind: "reminder", id: item.id });
    await ackReminder(item.id);
  }

  try {
    const due = await fetchDueTodos();
    for (const todo of due.items) {
      onFire?.({ title: `Todo due: ${todo.title}`, kind: "todo", id: todo.id });
      await updateDailyTodo(todo.id, { dueNotified: true });
    }
  } catch {
    /* offline */
  }
}

export function listenForNotificationDelivery(onFire: NotificationFireHandler): () => void {
  const sub = Notifications.addNotificationReceivedListener((n) => {
    const data = n.request.content.data ?? {};
    const kind = data.kind as "reminder" | "todo" | "daily" | undefined;
    const title = n.request.content.body ?? n.request.content.title ?? "Notification";
    if (kind === "reminder" && typeof data.reminderId === "string") {
      void ackReminder(data.reminderId);
      onFire({ title, kind: "reminder", id: data.reminderId });
    } else if (kind === "todo") {
      onFire({ title, kind: "todo", id: typeof data.todoId === "string" ? data.todoId : undefined });
    } else if (kind === "daily") {
      onFire({ title, kind: "daily" });
    }
  });
  return () => sub.remove();
}

/** @deprecated use scheduleNotifications */
export { syncAllScheduledNotifications as syncRemindersToDevice };
