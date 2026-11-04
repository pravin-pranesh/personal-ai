export function getLocalDateTimeParts(
  timeZone: string,
  date: Date = new Date(),
): { localDate: string; minutesOfDay: number } {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(date).map((p) => [p.type, p.value]),
  ) as Record<string, string>;
  const localDate = `${parts.year}-${parts.month}-${parts.day}`;
  const hour = Number.parseInt(parts.hour ?? "0", 10);
  const minute = Number.parseInt(parts.minute ?? "0", 10);
  return { localDate, minutesOfDay: hour * 60 + minute };
}

export function parseRunTimeLocal(runTimeLocal: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(runTimeLocal.trim());
  if (!match) return null;
  const hour = Number.parseInt(match[1], 10);
  const minute = Number.parseInt(match[2], 10);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return hour * 60 + minute;
}

export function normalizeRunTimeLocal(runTimeLocal: string): string {
  const minutes = parseRunTimeLocal(runTimeLocal);
  if (minutes === null) throw new Error("runTimeLocal must be HH:MM");
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
