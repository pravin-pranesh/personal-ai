import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type {
  ResearchNewsCard,
  ResearchSession,
  ResearchSessionSummary,
  ResearchSource,
  ResearchThreadMessage,
} from "@personal-ai/shared";
import {
  buildFallbackStubFooter,
  buildGeminiDevStubFooter,
  buildWikiEnrichedResearch,
} from "../wikipediaResearch.js";
import { writeJsonAtomic } from "./atomicJsonFile.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DAILY_DIR = path.join(__dirname, "..", "..", "..", "data", "daily");
const RESEARCH_DIR = path.join(DAILY_DIR, "research");
const INDEX_PATH = path.join(RESEARCH_DIR, "index.json");

/** Sessions older than this (by `createdAt`) are removed on list and at startup. */
export const RESEARCH_RETENTION_DAYS = 7;

type ResearchIndex = {
  sessions: ResearchSessionSummary[];
};

<<<<<<< HEAD
export type ResearchContentInput = {
  summary: string;
  cards: ResearchNewsCard[];
  sourcesUsed: ResearchSource[];
};

function sessionJsonPath(id: string): string {
  return path.join(RESEARCH_DIR, `${id}.json`);
}

function normalizeSession(raw: ResearchSession): ResearchSession {
  const messages =
    Array.isArray(raw.messages) && raw.messages.length > 0
      ? raw.messages
      : messagesFromLegacySession(raw);
  const updatedAt =
    typeof raw.updatedAt === "string" && raw.updatedAt ? raw.updatedAt : raw.createdAt;
  return {
    ...raw,
    updatedAt,
    messages,
    sourcesUsed: raw.sourcesUsed ?? lastAssistantSources(messages),
  };
}

function messagesFromLegacySession(session: ResearchSession): ResearchThreadMessage[] {
  return [
    {
      id: `${session.id}-user-0`,
      role: "user",
      text: session.prompt,
      createdAt: session.createdAt,
    },
    {
      id: `${session.id}-assistant-0`,
      role: "assistant",
      text: session.summary,
      createdAt: session.createdAt,
      cards: session.cards ?? [],
      sourcesUsed: session.sourcesUsed ?? ["stub"],
    },
  ];
}

function lastAssistantSources(
  messages: ResearchThreadMessage[],
): ResearchSource[] | undefined {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role === "assistant") {
      return m.sourcesUsed;
    }
  }
  return undefined;
}

function readSessionFile(id: string): ResearchSession | null {
  const filePath = sessionJsonPath(id);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  const raw = JSON.parse(fs.readFileSync(filePath, "utf8")) as ResearchSession;
  if (!raw?.id) return null;
  return normalizeSession(raw);
}

function writeSessionFile(session: ResearchSession): void {
  writeJsonAtomic(sessionJsonPath(session.id), session);
}

function toSummary(session: ResearchSession): ResearchSessionSummary {
  return {
    id: session.id,
    prompt: session.prompt,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
  };
}
=======
let pruneLoggedThisProcess = false;
>>>>>>> a927a5dee6fa72b384b7732db0a01595ccb5b969

function ensureResearchDir(): void {
  fs.mkdirSync(RESEARCH_DIR, { recursive: true });
}

function readIndex(): ResearchIndex {
  ensureResearchDir();
  if (!fs.existsSync(INDEX_PATH)) {
    return { sessions: [] };
  }
  const raw = JSON.parse(fs.readFileSync(INDEX_PATH, "utf8")) as {
    sessions?: Array<ResearchSessionSummary | ResearchSession>;
  };
  if (!raw || !Array.isArray(raw.sessions)) {
    return { sessions: [] };
  }
  const summaries: ResearchSessionSummary[] = [];
  let migratedLegacy = false;
  for (const entry of raw.sessions) {
    if (!entry?.id || typeof entry.prompt !== "string") continue;
    const createdAt =
      typeof entry.createdAt === "string" ? entry.createdAt : new Date().toISOString();
    const updatedAt =
      typeof (entry as ResearchSession).updatedAt === "string"
        ? (entry as ResearchSession).updatedAt
        : createdAt;
    summaries.push({
      id: entry.id,
      prompt: entry.prompt,
      createdAt,
      updatedAt,
    });
    if ("summary" in entry && typeof entry.summary === "string") {
      migratedLegacy = true;
      const legacy = normalizeSession(entry as ResearchSession);
      if (!fs.existsSync(sessionJsonPath(legacy.id))) {
        writeSessionFile(legacy);
      }
    }
  }
  const index: ResearchIndex = { sessions: summaries };
  if (migratedLegacy) {
    saveIndex(index);
  }
  return index;
}

function saveIndex(index: ResearchIndex): void {
  writeJsonAtomic(INDEX_PATH, index);
}

function slugify(text: string): string {
  const slug = text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return slug || "topic";
}

function dateStamp(iso: string): string {
  return iso.slice(0, 10);
}

export function stubCardsFromPrompt(prompt: string): ResearchNewsCard[] {
  const topic = prompt.trim();
  const label = topic.length > 60 ? `${topic.slice(0, 57)}…` : topic;
  const now = new Date();
  const hoursAgo = (h: number) =>
    new Date(now.getTime() - h * 60 * 60 * 1000).toISOString();

  return [
    {
      title: `Latest developments in ${label}`,
      snippet: `Wire desks flag fresh movement on “${topic}”: policy drafts, product roadmaps, and investor notes are circulating; primary sources still sparse—treat social clips as unverified until matched to a named outlet.`,
      source: "Reuters (sample)",
      publishedAt: hoursAgo(2),
    },
    {
      title: `${label}: what to watch this week`,
      snippet: `Week-ahead calendar for ${label}: scheduled hearings, earnings, and embargoed briefings could reset the narrative; watch for pre-announcement leaks versus confirmed agendas.`,
      source: "Associated Press (sample)",
      publishedAt: hoursAgo(8),
    },
    {
      title: `Background primer on ${label}`,
      snippet: `Longer explainers tie “${topic}” to adjacent sectors and historical precedents—useful baseline before comparing against today’s headline bullets in your saved session file.`,
      source: "BBC News (sample)",
      publishedAt: hoursAgo(26),
    },
  ];
}

function topicLabel(prompt: string): string {
  const topic = prompt.trim();
  return topic.length > 80 ? `${topic.slice(0, 77)}…` : topic;
}

/** Topic-aware markdown briefing (6–10 bullets) for stub/demo paths. */
export function buildTopicBulletBriefing(
  prompt: string,
  options?: { footer?: string },
): string {
  const topic = prompt.trim();
  const label = topicLabel(topic);
  const focus =
    topic.length > 0
      ? topic.replace(/\?+$/, "").trim()
      : "this topic";

  const lines: string[] = [
    `Briefing on **${label}**`,
    "",
    "### Key facts",
    `- **Scope:** Outlets and analysts are tracking “${focus}” across policy, product, and market channels; timelines vary by region and source.`,
    `- **Recent signal:** Early reporting points to shifting stakeholder positions and renewed public debate—details still consolidating in wire and trade coverage.`,
    `- **Context:** The topic intersects with broader trends (regulation, supply chain, or consumer demand) depending on which angle you asked about.`,
    `- **Data gap:** Stub mode uses illustrative facts; connect live Gemini or RSS collectors for verified quotes and dates.`,
    "",
    "### What to watch",
    `- **Near term:** Official statements, earnings or product announcements, and regulatory filings tied to ${focus}.`,
    `- **Narrative risk:** Social amplification can outpace primary sources—cross-check against named outlets before acting on a claim.`,
    `- **Follow-ups:** Ask for a deeper dive on one sub-angle (history, key players, or regional impact).`,
    "",
    "### Sources / context",
    `- **Headline cards below** mirror a typical wire/AP/BBC mix (sample titles until live feeds are wired).`,
    `- **Local copy:** This session is saved as markdown on your machine for offline review.`,
  ];

  if (options?.footer) {
    lines.push("", options.footer);
  }

  return lines.join("\n");
}

export function buildStubSummary(
  prompt: string,
  _cards: ResearchNewsCard[],
  wikiUsed = false,
): string {
  return buildTopicBulletBriefing(prompt, {
    footer: buildFallbackStubFooter(wikiUsed),
  });
}

export function buildGeminiDevStubSummary(
  prompt: string,
  _cards: ResearchNewsCard[],
  wikiUsed = false,
): string {
  return buildTopicBulletBriefing(prompt, {
    footer: buildGeminiDevStubFooter(wikiUsed),
  });
}

export async function resolveDemoResearchContent(
  prompt: string,
  mode: "dev-stub" | "fallback",
): Promise<{ summary: string; cards: ResearchNewsCard[]; sourcesUsed: ResearchSource[] }> {
  const wiki = await buildWikiEnrichedResearch(prompt);
  if (wiki) {
    return { summary: wiki.summary, cards: wiki.cards, sourcesUsed: ["wikipedia"] };
  }
  const cards = stubCardsFromPrompt(prompt);
  const summary =
    mode === "dev-stub"
      ? buildGeminiDevStubSummary(prompt, cards, false)
      : buildStubSummary(prompt, cards, false);
  return { summary, cards, sourcesUsed: ["stub"] };
}

function buildMarkdown(session: ResearchSession): string {
  const lines: string[] = [
    `# Research: ${session.prompt}`,
    "",
    `- **Created:** ${session.createdAt}`,
    `- **Session ID:** ${session.id}`,
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
    lines.push(`### ${card.title}`, "");
    lines.push(`- **Source:** ${card.source}`);
    if (card.url) {
      lines.push(`- **Link:** ${card.url}`);
    }
    if (card.publishedAt) {
      lines.push(`- **Published:** ${card.publishedAt}`);
    }
    lines.push("", card.snippet, "");
  }

  return `${lines.join("\n").trim()}\n`;
}

function writeMarkdownAtomic(fileName: string, content: string): void {
  ensureResearchDir();
  const filePath = path.join(RESEARCH_DIR, fileName);
  const tmp = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmp, content, "utf8");
  fs.renameSync(tmp, filePath);
}

<<<<<<< HEAD
export function listResearchSessions(): ResearchSessionSummary[] {
=======
function retentionCutoffMs(): number {
  return Date.now() - RESEARCH_RETENTION_DAYS * 24 * 60 * 60 * 1000;
}

/**
 * Drop index entries and markdown files with `createdAt` before the retention window.
 * Cutoff uses UTC milliseconds (ISO `createdAt` timestamps).
 */
export function pruneOldResearchSessions(options?: { log?: boolean }): number {
  const cutoff = retentionCutoffMs();
  const index = readIndex();
  const keep: ResearchSession[] = [];
  const remove: ResearchSession[] = [];

  for (const session of index.sessions) {
    const created = new Date(session.createdAt).getTime();
    if (Number.isNaN(created) || created < cutoff) {
      remove.push(session);
    } else {
      keep.push(session);
    }
  }

  if (remove.length === 0) {
    return 0;
  }

  for (const session of remove) {
    const filePath = path.join(RESEARCH_DIR, session.fileName);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  saveIndex({ sessions: keep });

  if (options?.log && !pruneLoggedThisProcess) {
    console.log(
      `[research] pruned ${remove.length} session(s) older than ${RESEARCH_RETENTION_DAYS} days (UTC cutoff)`,
    );
    pruneLoggedThisProcess = true;
  }

  return remove.length;
}

export function getResearchSessionById(id: string): ResearchSession | null {
  pruneOldResearchSessions();
  const index = readIndex();
  return index.sessions.find((s) => s.id === id) ?? null;
}

export function listResearchSessions(): ResearchSession[] {
  pruneOldResearchSessions();
>>>>>>> a927a5dee6fa72b384b7732db0a01595ccb5b969
  const index = readIndex();
  return [...index.sessions].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

export function getResearchSession(id: string): ResearchSession | null {
  const fromFile = readSessionFile(id);
  if (fromFile) return fromFile;
  readIndex();
  return readSessionFile(id);
}

function appendTurnMessages(
  sessionId: string,
  prompt: string,
<<<<<<< HEAD
  at: string,
  content: ResearchContentInput,
): ResearchThreadMessage[] {
  const turn = Math.floor(Date.now() % 100000);
  return [
    {
      id: `${sessionId}-user-${turn}`,
      role: "user",
      text: prompt,
      createdAt: at,
    },
    {
      id: `${sessionId}-assistant-${turn}`,
      role: "assistant",
      text: content.summary,
      createdAt: at,
      cards: content.cards,
      sourcesUsed: content.sourcesUsed,
    },
  ];
}

export async function createResearchSession(
  prompt: string,
  content?: ResearchContentInput,
  threadId?: string,
): Promise<ResearchSession> {
=======
  content?: { summary: string; cards: ResearchNewsCard[]; briefingMarkdown?: string },
): ResearchSession {
>>>>>>> a927a5dee6fa72b384b7732db0a01595ccb5b969
  const trimmed = prompt.trim();
  if (!trimmed) {
    throw new Error("Prompt is required");
  }

  const resolved =
    content ?? (await resolveDemoResearchContent(trimmed, "fallback"));
  const now = new Date().toISOString();

  if (threadId) {
    const existing = readSessionFile(threadId);
    if (existing) {
      const turn = appendTurnMessages(threadId, trimmed, now, resolved);
      const session: ResearchSession = {
        ...existing,
        updatedAt: now,
        summary: resolved.summary,
        cards: resolved.cards,
        sourcesUsed: resolved.sourcesUsed,
        messages: [...existing.messages, ...turn],
      };
      writeMarkdownAtomic(session.fileName, buildMarkdown(session));
      writeSessionFile(session);
      const index = readIndex();
      const idx = index.sessions.findIndex((s) => s.id === threadId);
      const summary = toSummary(session);
      if (idx >= 0) {
        index.sessions[idx] = summary;
      } else {
        index.sessions.unshift(summary);
      }
      saveIndex(index);
      return session;
    }
  }

  const slug = slugify(trimmed);
  const id = crypto.randomUUID();
  const fileName = `${slug}-${dateStamp(now)}.md`;
  const turn = appendTurnMessages(id, trimmed, now, resolved);

  const session: ResearchSession = {
    id,
    prompt: trimmed,
    slug,
    fileName,
<<<<<<< HEAD
    createdAt: now,
    updatedAt: now,
    summary: resolved.summary,
    cards: resolved.cards,
    sourcesUsed: resolved.sourcesUsed,
    messages: turn,
=======
    createdAt,
    summary,
    cards,
    ...(content?.briefingMarkdown?.trim()
      ? { briefingMarkdown: content.briefingMarkdown.trim() }
      : {}),
>>>>>>> a927a5dee6fa72b384b7732db0a01595ccb5b969
  };

  writeMarkdownAtomic(fileName, buildMarkdown(session));
  writeSessionFile(session);

  const index = readIndex();
  index.sessions.unshift(toSummary(session));
  saveIndex(index);

  return session;
}

export function deleteResearchSession(id: string): boolean {
  pruneOldResearchSessions();
  const index = readIndex();
  const session = index.sessions.find((s) => s.id === id);
  if (!session) return false;

  const filePath = path.join(RESEARCH_DIR, session.fileName);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  saveIndex({ sessions: index.sessions.filter((s) => s.id !== id) });
  return true;
}

export function clearResearchData(): void {
  ensureResearchDir();
  if (fs.existsSync(INDEX_PATH)) {
    saveIndex({ sessions: [] });
  }
  for (const name of fs.readdirSync(RESEARCH_DIR)) {
    if (name.endsWith(".md") || name.endsWith(".json")) {
      if (name !== "index.json") {
        fs.unlinkSync(path.join(RESEARCH_DIR, name));
      }
    }
  }
}

