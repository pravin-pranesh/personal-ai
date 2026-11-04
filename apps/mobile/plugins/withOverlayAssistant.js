const {
  withAndroidManifest,
  AndroidConfig,
} = require("@expo/config-plugins");

const OVERLAY_PERMISSIONS = [
  "android.permission.SYSTEM_ALERT_WINDOW",
  "android.permission.FOREGROUND_SERVICE",
  "android.permission.FOREGROUND_SERVICE_MICROPHONE",
  "android.permission.FOREGROUND_SERVICE_SPECIAL_USE",
  "android.permission.WAKE_LOCK",
  "android.permission.RECORD_AUDIO",
  "android.permission.POST_NOTIFICATIONS",
];

const SERVICE_CLASS =
  "expo.modules.overlayassistant.OverlayAssistantService";

function ensurePermission(manifest, name) {
  if (!manifest["uses-permission"]) {
    manifest["uses-permission"] = [];
  }
  const list = manifest["uses-permission"];
  if (!list.some((p) => p.$?.["android:name"] === name)) {
    list.push({ $: { "android:name": name } });
  }
}

function withOverlayAssistant(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;
    for (const perm of OVERLAY_PERMISSIONS) {
      ensurePermission(manifest, perm);
    }

    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(cfg.modResults);
    if (!app.service) {
      app.service = [];
    }
    const exists = app.service.some((s) => s.$?.["android:name"] === SERVICE_CLASS);
    if (!exists) {
      app.service.push({
        $: {
          "android:name": SERVICE_CLASS,
          "android:exported": "false",
          "android:foregroundServiceType": "microphone|specialUse",
        },
      });
    }

    return cfg;
  });
}

module.exports = withOverlayAssistant;
