import { parseCommandWithLlm } from "../voice/geminiIntent";
import { parseCommand } from "../voice/commandRouter";
import { executeVoiceIntent } from "../phone/phoneActions";

/** Strip wake name; returns null if name required but missing (phrase mode). */
export function extractCommandAfterName(raw: string, assistantName: string): string | null {
  const trimmed = raw.trim();
  const name = assistantName.trim();
  if (!name) return trimmed;
  const lower = trimmed.toLowerCase();
  const needle = name.toLowerCase();
  const idx = lower.indexOf(needle);
  if (idx === -1) return null;
  const rest = trimmed.slice(idx + name.length).trim().replace(/^[,.\s]+/, "");
  return rest.length > 0 ? rest : trimmed;
}

export async function handleOverlayUtterance(
  raw: string,
  assistantName: string,
  options: { pushToTalk?: boolean },
): Promise<string> {
  const commandText = options.pushToTalk
    ? raw.trim()
    : (extractCommandAfterName(raw, assistantName) ?? raw.trim());

  if (!commandText) {
    return `Say "${assistantName}, …" or tap the mic and speak your command.`;
  }

  const intent = await parseCommandWithLlm(commandText);
  if (intent.type === "unknown") {
    const fallback = parseCommand(commandText);
    if (fallback.type !== "unknown") {
      return executeVoiceIntent(fallback);
    }
  }
  return executeVoiceIntent(intent);
}

export function greetingForAssistant(assistantName: string): string {
  const name = assistantName.trim() || "Assistant";
  return `Hi, I'm ${name}. Tap the mic when you're ready.`;
}
