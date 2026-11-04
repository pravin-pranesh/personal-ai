import { GoogleGenerativeAI } from "@google/generative-ai";
import { getGeminiKey, getLocalSettingsPublic } from "../local/settingsSecure";
import { parseCommand, type VoiceIntent } from "./commandRouter";

type LlmIntent = {
  intent:
    | "search"
    | "maps"
    | "file"
    | "research"
    | "reminder"
    | "alarm"
    | "todo"
    | "daily"
    | "unknown";
  query?: string;
  title?: string;
  fireAtIso?: string;
  prompt?: string;
};

function llmToVoice(parsed: LlmIntent, raw: string): VoiceIntent {
  switch (parsed.intent) {
    case "search":
      return { type: "search", query: parsed.query ?? raw, inApp: true };
    case "maps":
      return { type: "maps", query: parsed.query ?? raw, inApp: true };
    case "file":
      return { type: "open_files" };
    case "research":
      return { type: "research", prompt: parsed.prompt ?? parsed.query ?? raw };
    case "todo":
      return {
        type: "todo",
        title: parsed.title ?? raw,
        fireAt: parsed.fireAtIso ? new Date(parsed.fireAtIso) : new Date(Date.now() + 3600000),
      };
    case "reminder":
      return {
        type: "reminder",
        title: parsed.title ?? "Reminder",
        fireAt: parsed.fireAtIso ? new Date(parsed.fireAtIso) : new Date(Date.now() + 900000),
      };
    case "alarm":
      return {
        type: "alarm",
        title: parsed.title ?? "Alarm",
        fireAt: parsed.fireAtIso ? new Date(parsed.fireAtIso) : new Date(Date.now() + 3600000),
      };
    case "daily":
      return { type: "daily" };
    default:
      return { type: "unknown", raw };
  }
}

export async function parseCommandWithLlm(raw: string): Promise<VoiceIntent> {
  const trimmed = raw.trim();
  if (!trimmed) return { type: "unknown", raw: trimmed };

  const settings = await getLocalSettingsPublic();
  const key = await getGeminiKey();
  if (!settings.geminiConfigured || !key || settings.demoMode) {
    return parseCommand(trimmed);
  }

  try {
    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({ model: settings.geminiModel ?? "gemini-2.0-flash" });
    const instruction = [
      "Parse the user utterance into JSON only:",
      '{"intent":"search|maps|file|research|reminder|alarm|todo|daily|unknown","query":"","title":"","fireAtIso":"","prompt":""}',
      "Use ISO-8601 for fireAtIso when time mentioned.",
      `Utterance: ${trimmed}`,
    ].join("\n");
    const result = await model.generateContent(instruction);
    const text = result.response.text().trim();
    const json = text.match(/\{[\s\S]*\}/)?.[0];
    if (!json) return parseCommand(trimmed);
    const parsed = JSON.parse(json) as LlmIntent;
    return llmToVoice(parsed, trimmed);
  } catch {
    return parseCommand(trimmed);
  }
}
