import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { ResearchRagHit } from "@personal-ai/shared";
import { listResearchSessions } from "./daily/researchStore.js";
import { checkOllamaReachable, getOllamaUrl } from "./ollamaHealth.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RESEARCH_DIR = path.join(__dirname, "..", "..", "data", "daily", "research");

function keywordScore(text: string, terms: string[]): number {
  const lower = text.toLowerCase();
  let score = 0;
  for (const term of terms) {
    if (!term) continue;
    const matches = lower.split(term).length - 1;
    score += matches * 2;
    if (lower.includes(term)) score += 1;
  }
  return score;
}

function snippetAround(text: string, term: string): string {
  const idx = text.toLowerCase().indexOf(term.toLowerCase());
  if (idx < 0) return text.slice(0, 180).trim();
  const start = Math.max(0, idx - 60);
  return `${start > 0 ? "…" : ""}${text.slice(start, start + 200).trim()}…`;
}

export async function searchSavedResearch(query: string): Promise<ResearchRagHit[]> {
  const q = query.trim();
  if (!q) return [];

  const terms = q
    .toLowerCase()
    .split(/\W+/)
    .filter((t) => t.length > 2);

  const sessions = listResearchSessions();
  const hits: ResearchRagHit[] = [];

  for (const session of sessions) {
    const filePath = path.join(RESEARCH_DIR, session.fileName);
    let body = "";
    if (fs.existsSync(filePath)) {
      body = fs.readFileSync(filePath, "utf8");
    } else {
      body = `${session.summary}\n${session.briefingMarkdown ?? ""}`;
    }
    const score = keywordScore(body, terms);
    if (score <= 0) continue;
    hits.push({
      sessionId: session.id,
      prompt: session.prompt,
      fileName: session.fileName,
      snippet: snippetAround(body, terms[0] ?? q),
      score,
    });
  }

  hits.sort((a, b) => b.score - a.score);

  if (hits.length === 0 && (await checkOllamaReachable())) {
    try {
      const base = getOllamaUrl();
      const res = await fetch(`${base}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "llama3.2",
          prompt: `List filenames or topics from notes matching: ${q}. One line.`,
          stream: false,
        }),
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) {
        const json = (await res.json()) as { response?: string };
        if (json.response?.trim()) {
          hits.push({
            sessionId: "ollama-hint",
            prompt: q,
            fileName: "ollama",
            snippet: json.response.trim().slice(0, 200),
            score: 0.5,
          });
        }
      }
    } catch {
      /* keyword-only fallback */
    }
  }

  return hits.slice(0, 8);
}
