import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import { Linking, Platform } from "react-native";
import type { VoiceIntent } from "../voice/commandRouter";
import { createReminder, createResearchSession, searchResearchRag } from "../api/client";

export async function executeVoiceIntent(intent: VoiceIntent): Promise<string> {
  switch (intent.type) {
    case "search": {
      const url = `https://www.google.com/search?q=${encodeURIComponent(intent.query)}`;
      await Linking.openURL(url);
      return `Opening Google Search for ${intent.query}`;
    }
    case "maps": {
      const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(intent.query)}`;
      await Linking.openURL(url);
      return `Opening Maps for ${intent.query}`;
    }
    case "research": {
      await createResearchSession(intent.prompt);
      return `Research started for ${intent.prompt}. Check the Research tab.`;
    }
    case "rag": {
      const hits = await searchResearchRag(intent.query);
      if (!hits.hits.length) return "No matching notes in saved research.";
      return `Found ${hits.hits.length} note(s). Top: ${hits.hits[0].prompt}`;
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
