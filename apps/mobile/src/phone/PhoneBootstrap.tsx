import { useEffect } from "react";
import { AppState, Platform } from "react-native";
import { isPhoneLocalMode } from "../config/api";
import { processEngineQueueLocal, tickDailyTasksLocalOps, tickMcpScheduleLocal } from "../api/client";
import { registerBackgroundReschedule } from "../notifications/backgroundReschedule";
import {
  listenForNotificationDelivery,
  syncAllScheduledNotifications,
} from "../notifications/scheduleNotifications";
import { useMascotOverlay } from "../mascot/MascotOverlayContext";

export function PhoneBootstrap() {
  const { speakCue } = useMascotOverlay();

  useEffect(() => {
    if (Platform.OS === "web") return;

    const onFire = (payload: { title: string; kind: string }) => {
      speakCue({
        message: payload.title,
        reason: payload.kind === "todo" ? "Todo due" : payload.kind === "daily" ? "Schedule" : "Reminder",
      });
    };

    void registerBackgroundReschedule();
    const syncAll = () => {
      void syncAllScheduledNotifications(onFire);
      if (isPhoneLocalMode()) void tickDailyTasksLocalOps();
      if (isPhoneLocalMode()) void tickMcpScheduleLocal();
      if (isPhoneLocalMode()) void processEngineQueueLocal();
    };
    syncAll();
    const unsub = listenForNotificationDelivery(onFire);

    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") syncAll();
    });

    const interval = setInterval(syncAll, 60_000);

    return () => {
      unsub();
      sub.remove();
      clearInterval(interval);
    };
  }, [speakCue]);

  return null;
}
