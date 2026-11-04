import {
  addOverlayListenListener,
  canDrawOverlays,
  isOverlayNativeModuleAvailable,
  openOverlayPermissionSettings,
  startNativeOverlay,
  stopNativeOverlay,
} from "../../modules/overlay-assistant";

export type OverlayRuntimeMode = "native" | "in-app" | "off";

export async function resolveOverlayRuntimeMode(
  enabled: boolean,
): Promise<OverlayRuntimeMode> {
  if (!enabled) return "off";
  if (isOverlayNativeModuleAvailable() && (await canDrawOverlays())) {
    return "native";
  }
  return "in-app";
}

export async function enableOverlayAssistant(assistantName: string): Promise<{
  mode: OverlayRuntimeMode;
  needsPermission: boolean;
}> {
  if (isOverlayNativeModuleAvailable()) {
    const allowed = await canDrawOverlays();
    if (!allowed) {
      return { mode: "in-app", needsPermission: true };
    }
    await startNativeOverlay(assistantName);
    return { mode: "native", needsPermission: false };
  }
  return { mode: "in-app", needsPermission: false };
}

export async function disableOverlayAssistant(): Promise<void> {
  await stopNativeOverlay();
}

export { openOverlayPermissionSettings, addOverlayListenListener };
