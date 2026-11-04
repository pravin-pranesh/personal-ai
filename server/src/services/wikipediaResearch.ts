import type { ResearchNewsCard } from "@personal-ai/shared";

export type WikipediaSummary = {
  title: string;
  extract: string;
  description: string;
  pageUrl: string;
};

type RestSummaryResponse = {
  title?: string;
  extract?: string;
  description?: string;
  content_urls?: { desktop?: { page?: string } };
};

const RESEARCH_PREFIX =
  /^(?:please\s+)?(?:(?:do|run)\s+)?(?:a\s+)?research(?:\s+(?:on|about|into|for))?\s+(?:on|about|into|for)?\s*|^(?:please\s+)?(?:tell me about|learn about|what is|what are)\s+/i;

export function extractTopicFromPrompt(prompt: string): string {
  let topic = prompt.trim();
  topic = topic.replace(RESEARCH_PREFIX, "").trim();
  topic = topic.replace(/\?+$/, "").trim();
  return topic || prompt.trim();
}

function toWikiTitleCase(topic: string): string {
  return topic
    .split(/\s+/)
    .map((word) => {
      if (!word) return word;
      if (/^[A-Z0-9]/.test(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join("_");
}

function splitSentences(text: string): string[] {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 12);
}

async function fetchRestSummary(title: string): Promise<WikipediaSummary | null> {
  const encoded = encodeURIComponent(title.replace(/ /g, "_"));
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encoded}`;
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as RestSummaryResponse;
  const extract = typeof data.extract === "string" ? data.extract.trim() : "";
  const pageUrl = data.content_urls?.desktop?.page;
  if (!extract || !pageUrl || !data.title) return null;
  return {
    title: data.title,
    extract,
    description: typeof data.description === "string" ? data.description.trim() : "",
    pageUrl,
  };
}

async function searchWikipediaTitle(query: string): Promise<string | null> {
  const params = new URLSearchParams({
    action: "query",
    list: "search",
    srsearch: query,
    format: "json",
    origin: "*",
    srlimit: "1",
  });
  const res = await fetch(`https://en.wikipedia.org/w/api.php?${params}`);
  if (!res.ok) return null;
  const data = (await res.json()) as {
    query?: { search?: { title?: string }[] };
  };
  const title = data.query?.search?.[0]?.title;
  return typeof title === "string" ? title : null;
}

export async function fetchWikipediaSummary(
  prompt: string,
): Promise<WikipediaSummary | null> {
  const topic = extractTopicFromPrompt(prompt);
  if (!topic) return null;

  const directTitle = toWikiTitleCase(topic);
  const direct = await fetchRestSummary(directTitle);
  if (direct) return direct;

  const searched = await searchWikipediaTitle(topic);
  if (!searched) return null;
  return fetchRestSummary(searched.replace(/ /g, "_"));
}

export function cardsFromWikipediaSummary(wiki: WikipediaSummary): ResearchNewsCard[] {
  const sentences = splitSentences(wiki.extract);
  const snippets =
    sentences.length >= 2
      ? [sentences[0], sentences.slice(1, 3).join(" "), sentences.slice(3, 5).join(" ")].filter(
          (s) => s.length > 0,
        )
      : [wiki.extract];

  const cards: ResearchNewsCard[] = snippets.slice(0, 3).map((snippet, i) => ({
    title: i === 0 ? wiki.title : `${wiki.title} — overview`,
    snippet: snippet.length > 320 ? `${snippet.slice(0, 317)}…` : snippet,
    source: "Wikipedia",
    url: wiki.pageUrl,
  }));

  if (cards.length === 0) {
    cards.push({
      title: wiki.title,
      snippet: wiki.extract.slice(0, 320),
      source: "Wikipedia",
      url: wiki.pageUrl,
    });
  }

  return cards;
}

export function buildBriefingFromWikipedia(
  prompt: string,
  wiki: WikipediaSummary,
): string {
  const label = extractTopicFromPrompt(prompt) || wiki.title;
  const sentences = splitSentences(wiki.extract);
  const desc = wiki.description.trim();

  const keyFacts: string[] = [];
  const used = new Set<string>();
  const remember = (s: string) => {
    const key = s.toLowerCase();
    if (used.has(key)) return;
    used.add(key);
    keyFacts.push(s);
  };

  if (desc) {
    remember(desc.endsWith(".") ? desc : `${desc}.`);
  }
  for (const s of sentences) {
    if (keyFacts.length >= 3) break;
    remember(s);
  }

  const watch: string[] = [];
  for (const s of sentences) {
    if (watch.length >= 3) break;
    if (used.has(s.toLowerCase())) continue;
    used.add(s.toLowerCase());
    watch.push(s);
  }
  if (watch.length === 0 && sentences.length > 0) {
    watch.push(
      `See the full Wikipedia article for range, behavior, and conservation status of ${wiki.title}.`,
    );
  }

  const lines: string[] = [
    `Briefing on **${label}**`,
    "",
    "### Key facts",
    ...keyFacts.map((s) => `- ${s}`),
    "",
    "### What to watch",
    ...watch.map((s) => `- ${s}`),
    "",
    "### Sources / context",
    `- **Wikipedia:** [${wiki.title}](${wiki.pageUrl}) — summary used for this demo briefing.`,
    `- **Note:** Live topic summary from Wikipedia (demo). Add a Gemini key in Settings for AI-grounded research with news-style cards.`,
  ];

  return lines.join("\n");
}

export function buildGeminiDevStubFooter(wikiUsed: boolean): string {
  if (wikiUsed) {
    return "_Live topic summary from Wikipedia (demo). Add an AI Studio key in Settings for live Gemini research._";
  }
  return "_Demo stub — add an AI Studio key in Settings for live Gemini research with grounded cards._";
}

export function buildFallbackStubFooter(wikiUsed: boolean): string {
  if (wikiUsed) {
    return "_Live topic summary from Wikipedia (demo). Connect Gemini for richer, news-style research._";
  }
  return "_Sample headlines below — live RSS wiring arrives in a later phase. Ask a follow-up anytime._";
}

export async function buildWikiEnrichedResearch(
  prompt: string,
): Promise<{ summary: string; cards: ResearchNewsCard[]; wikiUsed: true } | null> {
  const wiki = await fetchWikipediaSummary(prompt);
  if (!wiki) return null;
  return {
    summary: buildBriefingFromWikipedia(prompt, wiki),
    cards: cardsFromWikipediaSummary(wiki),
    wikiUsed: true,
  };
}
