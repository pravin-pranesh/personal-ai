import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import type { ResearchSession } from "@personal-ai/shared";
import { LOCAL_ROOT } from "./fsJson";
import { listResearchSessionsLocal } from "./researchStore";

const RESEARCH_DIR = `${LOCAL_ROOT}/daily/research`;

export async function exportSessionMarkdown(session: ResearchSession): Promise<void> {
  const path = `${RESEARCH_DIR}/${session.fileName}`;
  const info = await FileSystem.getInfoAsync(path);
  if (!info.exists) {
    throw new Error("Markdown file missing");
  }
  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) throw new Error("Sharing not available on this platform");
  await Sharing.shareAsync(path, { mimeType: "text/markdown" });
}

export async function exportAllResearch(): Promise<void> {
  const sessions = await listResearchSessionsLocal();
  const exportDir = `${LOCAL_ROOT}/exports`;
  await FileSystem.makeDirectoryAsync(exportDir, { intermediates: true });
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  const mdPath = `${exportDir}/research-export-${stamp}.md`;
  const jsonPath = `${exportDir}/research-export-${stamp}.json`;

  const parts: string[] = ["# Personal AI research export", ""];
  for (const s of sessions) {
    const file = `${RESEARCH_DIR}/${s.fileName}`;
    const info = await FileSystem.getInfoAsync(file);
    if (info.exists) {
      const body = await FileSystem.readAsStringAsync(file);
      parts.push(body, "\n---\n");
    }
  }
  await FileSystem.writeAsStringAsync(mdPath, parts.join("\n"));
  await FileSystem.writeAsStringAsync(jsonPath, JSON.stringify({ sessions }, null, 2));

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) throw new Error("Sharing not available");
  await Sharing.shareAsync(mdPath, { mimeType: "text/markdown" });
}
