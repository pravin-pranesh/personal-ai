import { useEffect } from "react";
import { AppState, Platform } from "react-native";
import { listenForNotificationResponses, syncRemindersToDevice } from "../notifications/reminderSync";
import { useMascotOverlay } from "../mascot/MascotOverlayContext";

export function PhoneBootstrap() {
  const { speakCue } = useMascotOverlay();

  useEffect(() => {
    if (Platform.OS === "web") return;

    const onFire = (title: string) => {
      speakCue({
        message: title,
        reason: "Reminder",
      });
    };

    void syncRemindersToDevice(onFire);
    const unsub = listenForNotificationResponses((title) => onFire(title));

    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        void syncRemindersToDevice(onFire);
      }
    });

    const interval = setInterval(() => {
      void syncRemindersToDevice(onFire);
    }, 60_000);

    return () => {
      unsub();
      sub.remove();
      clearInterval(interval);
    };
  }, [speakCue]);

  return null;
}
