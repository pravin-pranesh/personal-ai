export type VoiceIntent =
  | { type: "search"; query: string }
  | { type: "maps"; query: string }
  | { type: "research"; prompt: string }
  | { type: "todo"; title: string; fireAt: Date }
  | { type: "reminder"; title: string; fireAt: Date }
  | { type: "alarm"; title: string; fireAt: Date }
  | { type: "open_files" }
  | { type: "rag"; query: string }
  | { type: "unknown"; raw: string };

function parseTimePhrase(text: string, base = new Date()): Date | null {
  const lower = text.toLowerCase();
  const atMatch = lower.match(/(?:at|for)\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (!atMatch) return null;
  let hour = Number.parseInt(atMatch[1], 10);
  const minute = atMatch[2] ? Number.parseInt(atMatch[2], 10) : 0;
  const ampm = atMatch[3]?.toLowerCase();
  if (ampm === "pm" && hour < 12) hour += 12;
  if (ampm === "am" && hour === 12) hour = 0;
  const d = new Date(base);
  if (lower.includes("tomorrow")) {
    d.setDate(d.getDate() + 1);
  }
  d.setHours(hour, minute, 0, 0);
  if (d.getTime() <= base.getTime() && !lower.includes("tomorrow")) {
    d.setDate(d.getDate() + 1);
  }
  return d;
}

export function parseCommand(raw: string): VoiceIntent {
  const text = raw.trim();
  const lower = text.toLowerCase();
  if (!text) return { type: "unknown", raw: text };

  if (/^(open|pick|choose)\s+(a\s+)?file/.test(lower) || lower.includes("document picker")) {
    return { type: "open_files" };
  }

  const searchMatch = text.match(/(?:google\s+search|search\s+for|search)\s+(.+)/i);
  if (searchMatch?.[1]) {
    return { type: "search", query: searchMatch[1].trim() };
  }

  const mapsMatch = text.match(
    /(?:open\s+maps|navigate\s+to|directions\s+to|maps)\s+(.+)/i,
  );
  if (mapsMatch?.[1]) {
    return { type: "maps", query: mapsMatch[1].trim() };
  }

  const researchMatch = text.match(/(?:research|look up|brief me on)\s+(.+)/i);
  if (researchMatch?.[1]) {
    return { type: "research", prompt: researchMatch[1].trim() };
  }

  const ragMatch = text.match(/(?:find in notes|search notes|rag)\s+(.+)/i);
  if (ragMatch?.[1]) {
    return { type: "rag", query: ragMatch[1].trim() };
  }

  if (lower.includes("set alarm") || lower.startsWith("alarm")) {
    const fireAt = parseTimePhrase(text) ?? new Date(Date.now() + 60_000);
    const title = text.replace(/set alarm/i, "").trim() || "Alarm";
    return { type: "alarm", title, fireAt };
  }

  if (lower.includes("remember to")) {
    const fireAt = parseTimePhrase(text) ?? new Date(Date.now() + 60 * 60_000);
    const title =
      text.replace(/remember to/i, "").replace(/at.+/i, "").trim() || "Task";
    return { type: "todo", title, fireAt };
  }

  if (lower.includes("remind me")) {
    const fireAt = parseTimePhrase(text) ?? new Date(Date.now() + 15 * 60_000);
    const title =
      text.replace(/remind me( to)?/i, "").replace(/at.+/i, "").trim() || "Reminder";
    return { type: "reminder", title, fireAt };
  }

  return { type: "unknown", raw: text };
}
