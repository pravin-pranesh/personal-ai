import type { ResearchNewsCard, ResearchSession } from "@personal-ai/shared";
import * as FileSystem from "expo-file-system/legacy";
import { LOCAL_ROOT, ensureDir, newId, readJsonFile, writeJsonFile } from "./fsJson";
import { collectResearchOnDevice } from "./researchCollect";

const RESEARCH_DIR = `${LOCAL_ROOT}/daily/research`;
const INDEX_PATH = `${RESEARCH_DIR}/index.json`;
const RETENTION_DAYS = 7;

type Index = { sessions: ResearchSession[] };

function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "topic"
  );
}

function buildMarkdown(session: ResearchSession): string {
  const lines = [
    `# Research: ${session.prompt}`,
    "",
    `- **Created:** ${session.createdAt}`,
    "",
    "## Summary",
    "",
    session.summary,
    "",
  ];
  if (session.briefingMarkdown?.trim()) {
    lines.push("## Briefing", "", session.briefingMarkdown.trim(), "");
  }
  lines.push("## Headlines", "");
  for (const card of session.cards) {
    lines.push(`### ${card.title}`, "", card.snippet, "");
  }
  return `${lines.join("\n").trim()}\n`;
}

async function readIndex(): Promise<Index> {
  return readJsonFile<Index>(INDEX_PATH, { sessions: [] });
}

async function saveIndex(index: Index): Promise<void> {
  await writeJsonFile(INDEX_PATH, index);
}

export async function pruneResearchSessions(): Promise<void> {
  const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
  const index = await readIndex();
  const keep: ResearchSession[] = [];
  for (const s of index.sessions) {
    if (new Date(s.createdAt).getTime() < cutoff) {
      const md = `${RESEARCH_DIR}/${s.fileName}`;
      const info = await FileSystem.getInfoAsync(md);
      if (info.exists) await FileSystem.deleteAsync(md, { idempotent: true });
    } else {
      keep.push(s);
    }
  }
  if (keep.length !== index.sessions.length) {
    await saveIndex({ sessions: keep });
  }
}

export async function listResearchSessionsLocal(): Promise<ResearchSession[]> {
  await pruneResearchSessions();
  const index = await readIndex();
  return [...index.sessions].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export async function getResearchSessionLocal(id: string): Promise<ResearchSession | null> {
  await pruneResearchSessions();
  return (await readIndex()).sessions.find((s) => s.id === id) ?? null;
}

export async function createResearchSessionLocal(prompt: string): Promise<ResearchSession> {
  const trimmed = prompt.trim();
  if (!trimmed) throw new Error("Prompt is required");
  const content = await collectResearchOnDevice(trimmed);
  const createdAt = new Date().toISOString();
  const id = newId();
  const fileName = `${slugify(trimmed)}-${createdAt.slice(0, 10)}.md`;
  const session: ResearchSession = {
    id,
    prompt: trimmed,
    slug: slugify(trimmed),
    fileName,
    createdAt,
    summary: content.summary,
    cards: content.cards,
    ...(content.briefingMarkdown ? { briefingMarkdown: content.briefingMarkdown } : {}),
  };
  await ensureDir(RESEARCH_DIR);
  await FileSystem.writeAsStringAsync(`${RESEARCH_DIR}/${fileName}`, buildMarkdown(session));
  const index = await readIndex();
  index.sessions.unshift(session);
  await saveIndex(index);
  return session;
}

export async function deleteResearchSessionLocal(id: string): Promise<boolean> {
  const index = await readIndex();
  const session = index.sessions.find((s) => s.id === id);
  if (!session) return false;
  const md = `${RESEARCH_DIR}/${session.fileName}`;
  const info = await FileSystem.getInfoAsync(md);
  if (info.exists) await FileSystem.deleteAsync(md, { idempotent: true });
  await saveIndex({ sessions: index.sessions.filter((s) => s.id !== id) });
  return true;
}

export async function clearResearchLocal(): Promise<void> {
  const index = await readIndex();
  for (const s of index.sessions) {
    const md = `${RESEARCH_DIR}/${s.fileName}`;
    const info = await FileSystem.getInfoAsync(md);
    if (info.exists) await FileSystem.deleteAsync(md, { idempotent: true });
  }
  await saveIndex({ sessions: [] });
}

export async function searchResearchRagLocal(query: string): Promise<{
  query: string;
  hits: { sessionId: string; prompt: string; fileName: string; snippet: string; score: number }[];
}> {
  const q = query.trim().toLowerCase();
  const terms = q.split(/\W+/).filter((t) => t.length > 2);
  const sessions = await listResearchSessionsLocal();
  const hits = sessions
    .map((s) => {
      const body = `${s.summary}\n${s.briefingMarkdown ?? ""}\n${s.cards.map((c) => c.title).join(" ")}`;
      let score = 0;
      for (const t of terms) {
        if (body.toLowerCase().includes(t)) score += 2;
      }
      return {
        sessionId: s.id,
        prompt: s.prompt,
        fileName: s.fileName,
        snippet: body.slice(0, 180),
        score,
      };
    })
    .filter((h) => h.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);
  return { query, hits };
}

export type { ResearchNewsCard };
