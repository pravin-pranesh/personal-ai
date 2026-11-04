import { DeviceEventEmitter, Platform } from "react-native";
import { requireNativeModule } from "expo-modules-core";

type OverlayNative = {
  canDrawOverlays: () => Promise<boolean>;
  openOverlaySettings: () => Promise<void>;
  startOverlay: (assistantName: string) => Promise<void>;
  stopOverlay: () => Promise<void>;
};

let native: OverlayNative | null = null;
try {
  native = requireNativeModule<OverlayNative>("OverlayAssistant");
} catch {
  native = null;
}

const LISTEN_EVENT = "onOverlayListenRequested";

export function isOverlayNativeModuleAvailable(): boolean {
  return Platform.OS === "android" && native != null;
}

export async function canDrawOverlays(): Promise<boolean> {
  if (!native) return false;
  return native.canDrawOverlays();
}

export async function openOverlayPermissionSettings(): Promise<void> {
  if (!native) {
    throw new Error("Overlay module requires an EAS Android dev/production build.");
  }
  await native.openOverlaySettings();
}

export async function startNativeOverlay(assistantName: string): Promise<void> {
  if (!native) {
    throw new Error("Overlay module requires an EAS Android dev/production build.");
  }
  await native.startOverlay(assistantName);
}

export async function stopNativeOverlay(): Promise<void> {
  if (!native) return;
  await native.stopOverlay();
}

/** Listens for native overlay bubble tap → start mic (EAS Android builds). */
export function addOverlayListenListener(
  handler: () => void,
): { remove: () => void } | null {
  if (!native) return null;
  const sub = DeviceEventEmitter.addListener(LISTEN_EVENT, handler);
  return { remove: () => sub.remove() };
}
