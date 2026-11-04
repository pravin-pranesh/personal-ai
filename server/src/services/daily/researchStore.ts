import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { ResearchNewsCard, ResearchSession } from "@personal-ai/shared";
import { writeJsonAtomic } from "./atomicJsonFile.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DAILY_DIR = path.join(__dirname, "..", "..", "..", "data", "daily");
const RESEARCH_DIR = path.join(DAILY_DIR, "research");
const INDEX_PATH = path.join(RESEARCH_DIR, "index.json");

type ResearchIndex = {
  sessions: ResearchSession[];
};

function ensureResearchDir(): void {
  fs.mkdirSync(RESEARCH_DIR, { recursive: true });
}

function readIndex(): ResearchIndex {
  ensureResearchDir();
  if (!fs.existsSync(INDEX_PATH)) {
    return { sessions: [] };
  }
  const raw = JSON.parse(fs.readFileSync(INDEX_PATH, "utf8")) as ResearchIndex;
  if (!raw || !Array.isArray(raw.sessions)) {
    return { sessions: [] };
  }
  return raw;
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

function stubCardsFromPrompt(prompt: string): ResearchNewsCard[] {
  const topic = prompt.trim();
  const label = topic.length > 60 ? `${topic.slice(0, 57)}…` : topic;
  const now = new Date();
  const hoursAgo = (h: number) =>
    new Date(now.getTime() - h * 60 * 60 * 1000).toISOString();

  return [
    {
      title: `Latest developments in ${label}`,
      snippet: `Analysts and outlets are tracking fresh updates around “${topic}”, with early reports highlighting policy shifts, product moves, and community reaction across social channels.`,
      source: "Reuters (sample)",
      publishedAt: hoursAgo(2),
    },
    {
      title: `${label}: what to watch this week`,
      snippet: `Commentary focuses on timeline, key stakeholders, and open questions. This stub summary will be replaced by RSS and Wikipedia collectors in a later phase.`,
      source: "Associated Press (sample)",
      publishedAt: hoursAgo(8),
    },
    {
      title: `Background primer on ${label}`,
      snippet: `Context pieces explain how the topic fits into broader trends. Saved locally as markdown on your laptop for offline review.`,
      source: "BBC News (sample)",
      publishedAt: hoursAgo(26),
    },
  ];
}

function buildSummary(prompt: string, cards: ResearchNewsCard[]): string {
  const topic = prompt.trim();
  return (
    `Here’s a quick read on “${topic}”. I found ${cards.length} headline-style items ` +
    `(sample data for now — live RSS wiring comes in MA-6). Skim the cards below and ask a follow-up anytime.`
  );
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
    "## Headlines",
    "",
  ];

  for (const card of session.cards) {
    lines.push(`### ${card.title}`, "");
    lines.push(`- **Source:** ${card.source}`);
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

export function listResearchSessions(): ResearchSession[] {
  const index = readIndex();
  return [...index.sessions].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export function createResearchSession(prompt: string): ResearchSession {
  const trimmed = prompt.trim();
  if (!trimmed) {
    throw new Error("Prompt is required");
  }

  const createdAt = new Date().toISOString();
  const slug = slugify(trimmed);
  const id = crypto.randomUUID();
  const fileName = `${slug}-${dateStamp(createdAt)}.md`;
  const cards = stubCardsFromPrompt(trimmed);
  const summary = buildSummary(trimmed, cards);

  const session: ResearchSession = {
    id,
    prompt: trimmed,
    slug,
    fileName,
    createdAt,
    summary,
    cards,
  };

  writeMarkdownAtomic(fileName, buildMarkdown(session));

  const index = readIndex();
  index.sessions.unshift(session);
  saveIndex(index);

  return session;
}

export function clearResearchData(): void {
  ensureResearchDir();
  if (fs.existsSync(INDEX_PATH)) {
    saveIndex({ sessions: [] });
  }
  for (const name of fs.readdirSync(RESEARCH_DIR)) {
    if (name.endsWith(".md")) {
      fs.unlinkSync(path.join(RESEARCH_DIR, name));
    }
  }
}
