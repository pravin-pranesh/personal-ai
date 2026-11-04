import type { ResearchSession } from "@personal-ai/shared";
import { LOCAL_ROOT, readJsonFile, writeJsonFile } from "../fsJson";
import { getLocalSettingsPublic } from "../settingsSecure";

const EMBED_PATH = `${LOCAL_ROOT}/daily/research/embeddings.json`;

export type EmbeddingRecord = {
  sessionId: string;
  prompt: string;
  vector: number[];
  updatedAt: string;
};

type EmbedFile = { records: EmbeddingRecord[] };

async function readEmbeds(): Promise<EmbedFile> {
  return readJsonFile<EmbedFile>(EMBED_PATH, { records: [] });
}

async function saveEmbeds(records: EmbeddingRecord[]): Promise<void> {
  await writeJsonFile(EMBED_PATH, { records });
}

function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i += 1) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

async function embedText(text: string, ollamaUrl: string): Promise<number[] | null> {
  try {
    const res = await fetch(`${ollamaUrl.replace(/\/$/, "")}/api/embeddings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: "nomic-embed-text", prompt: text.slice(0, 8000) }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { embedding?: number[] };
    return body.embedding ?? null;
  } catch {
    return null;
  }
}

export async function indexSessionEmbedding(session: ResearchSession): Promise<boolean> {
  const settings = await getLocalSettingsPublic();
  if (!settings.ollamaReachable) return false;
  const text = `${session.prompt}\n${session.summary}\n${session.briefingMarkdown ?? ""}`;
  const vector = await embedText(text, settings.ollamaUrl);
  if (!vector) return false;
  const file = await readEmbeds();
  const next = file.records.filter((r) => r.sessionId !== session.id);
  next.unshift({
    sessionId: session.id,
    prompt: session.prompt,
    vector,
    updatedAt: new Date().toISOString(),
  });
  await saveEmbeds(next.slice(0, 500));
  return true;
}

export async function semanticSearch(
  query: string,
  limit = 8,
): Promise<{ sessionId: string; prompt: string; score: number }[]> {
  const settings = await getLocalSettingsPublic();
  const qVec = settings.ollamaReachable
    ? await embedText(query, settings.ollamaUrl)
    : null;
  if (!qVec) return [];
  const file = await readEmbeds();
  return file.records
    .map((r) => ({ sessionId: r.sessionId, prompt: r.prompt, score: cosine(qVec, r.vector) }))
    .filter((h) => h.score > 0.2)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export async function hasEmbeddings(): Promise<boolean> {
  const file = await readEmbeds();
  return file.records.length > 0;
}
