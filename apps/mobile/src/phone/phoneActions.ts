import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import { Linking, Platform } from "react-native";
import { router } from "expo-router";
import type { VoiceIntent } from "../voice/commandRouter";
import {
  createDailyTodo,
  createReminder,
  createResearchSession,
  enqueueEngineTask,
  runEngineNow,
  searchResearchRag,
} from "../api/client";

export async function executeVoiceIntent(intent: VoiceIntent): Promise<string> {
  switch (intent.type) {
    case "search": {
      if (intent.inApp !== false) {
        router.push({ pathname: "/in-app/search", params: { q: intent.query } });
        return `Showing search results for ${intent.query}`;
      }
      await Linking.openURL(`https://www.google.com/search?q=${encodeURIComponent(intent.query)}`);
      return `Opening Google Search for ${intent.query}`;
    }
    case "maps": {
      if (intent.inApp !== false) {
        router.push({ pathname: "/in-app/map", params: { q: intent.query } });
        return `Showing map for ${intent.query}`;
      }
      await Linking.openURL(
        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(intent.query)}`,
      );
      return `Opening Maps for ${intent.query}`;
    }
    case "research": {
      await enqueueEngineTask("research", { prompt: intent.prompt });
      await runEngineNow();
      return `Research queued for ${intent.prompt}. Check the Research tab.`;
    }
    case "rag": {
      const hits = await searchResearchRag(intent.query);
      if (!hits.hits.length) return "No matching notes in saved research.";
      return `Found ${hits.hits.length} note(s) (${hits.mode}). Top: ${hits.hits[0].prompt}`;
    }
    case "daily": {
      await enqueueEngineTask("scheduled_daily", {});
      await runEngineNow();
      return "Daily schedule run queued.";
    }
    case "todo": {
      const dueTime = `${String(intent.fireAt.getHours()).padStart(2, "0")}:${String(intent.fireAt.getMinutes()).padStart(2, "0")}`;
      const dueDate = intent.fireAt.toISOString().slice(0, 10);
      await createDailyTodo(intent.title, { dueTime, dueDate });
      return `Saved todo “${intent.title}” for ${intent.fireAt.toLocaleString()} on this phone.`;
    }
    case "reminder":
    case "alarm": {
      await createReminder({
        title: intent.title,
        fireAt: intent.fireAt.toISOString(),
        kind: intent.type,
      });
      return `${intent.type === "alarm" ? "Alarm" : "Reminder"} set for ${intent.fireAt.toLocaleString()}`;
    }
    case "open_files": {
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled) return "File picker cancelled.";
      const asset = result.assets?.[0];
      if (!asset?.uri) return "No file selected.";
      if (Platform.OS === "android" || Platform.OS === "ios") {
        const info = await FileSystem.getInfoAsync(asset.uri);
        return `Selected ${asset.name ?? "file"} (${info.exists ? "cached" : "unknown"}).`;
      }
      return `Selected ${asset.name ?? asset.uri}`;
    }
    default:
      return `I didn't understand "${intent.raw}". Try "search for …", "navigate to …", or "research …".`;
  }
}
