import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import {
  ackReminder,
  fetchDueReminders,
  fetchReminders,
} from "../api/client";

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

export async function syncRemindersToDevice(
  onFire?: (title: string, id: string) => void,
): Promise<void> {
  if (Platform.OS === "web") return;
  const ok = await ensureNotificationPermissions();
  if (!ok) return;

  await Notifications.cancelAllScheduledNotificationsAsync();
  const { items } = await fetchReminders();
  const now = Date.now();

  for (const item of items) {
    const fireMs = new Date(item.fireAt).getTime();
    if (fireMs <= now || item.notified) continue;
    await Notifications.scheduleNotificationAsync({
      content: {
        title: item.kind === "alarm" ? "Alarm" : "Reminder",
        body: item.title,
        data: { reminderId: item.id },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(fireMs),
      },
    });
  }

  const due = await fetchDueReminders();
  for (const item of due.items) {
    onFire?.(item.title, item.id);
    await ackReminder(item.id);
  }
}

export function listenForNotificationResponses(
  onFire: (title: string, reminderId: string) => void,
): () => void {
  const sub = Notifications.addNotificationReceivedListener((n) => {
    const id = n.request.content.data?.reminderId;
    const title = n.request.content.body ?? "Reminder";
    if (typeof id === "string") {
      void ackReminder(id);
      onFire(title, id);
    }
  });
  return () => sub.remove();
}
