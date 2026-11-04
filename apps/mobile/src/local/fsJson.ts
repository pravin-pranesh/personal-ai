import * as FileSystem from "expo-file-system/legacy";

export const LOCAL_ROOT = `${FileSystem.documentDirectory ?? ""}personal-ai`;

export async function ensureDir(path: string): Promise<void> {
  const info = await FileSystem.getInfoAsync(path);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(path, { intermediates: true });
  }
}

export async function readJsonFile<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const info = await FileSystem.getInfoAsync(filePath);
    if (!info.exists) return fallback;
    const raw = await FileSystem.readAsStringAsync(filePath);
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function writeJsonFile<T>(filePath: string, data: T): Promise<void> {
  const dir = filePath.slice(0, filePath.lastIndexOf("/"));
  await ensureDir(dir);
  const tmp = `${filePath}.${Date.now()}.tmp`;
  await FileSystem.writeAsStringAsync(tmp, JSON.stringify(data, null, 2));
  await FileSystem.moveAsync({ from: tmp, to: filePath });
}

export function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
