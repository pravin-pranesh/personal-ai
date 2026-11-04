import type { ResearchNewsCard } from "@personal-ai/shared";
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  getGeminiKey,
  getKimiKey,
  getLocalSettingsPublic,
} from "./settingsSecure";

export type ResearchContent = {
  summary: string;
  cards: ResearchNewsCard[];
  briefingMarkdown?: string;
};

function stubCards(prompt: string): ResearchNewsCard[] {
  const topic = prompt.trim();
  const now = Date.now();
  return [
    {
      title: `Latest on ${topic}`,
      snippet: `Sample headline about “${topic}” (offline demo).`,
      source: "Demo",
      publishedAt: new Date(now).toISOString(),
    },
    {
      title: `${topic}: context`,
      snippet: "Connect Gemini or turn off demo mode for live briefings.",
      source: "Demo",
      publishedAt: new Date(now - 3600000).toISOString(),
    },
  ];
}

async function fetchWikipedia(topic: string): Promise<ResearchContent | null> {
  const searchUrl = new URL("https://en.wikipedia.org/w/api.php");
  searchUrl.searchParams.set("action", "query");
  searchUrl.searchParams.set("list", "search");
  searchUrl.searchParams.set("srsearch", topic);
  searchUrl.searchParams.set("format", "json");
  searchUrl.searchParams.set("origin", "*");
  const searchRes = await fetch(searchUrl.toString());
  const searchJson = (await searchRes.json()) as {
    query?: { search?: { title: string }[] };
  };
  const pageTitle = searchJson.query?.search?.[0]?.title;
  if (!pageTitle) return null;

  const summaryUrl = new URL("https://en.wikipedia.org/w/api.php");
  summaryUrl.searchParams.set("action", "query");
  summaryUrl.searchParams.set("prop", "extracts|info");
  summaryUrl.searchParams.set("exintro", "1");
  summaryUrl.searchParams.set("explaintext", "1");
  summaryUrl.searchParams.set("inprop", "url");
  summaryUrl.searchParams.set("titles", pageTitle);
  summaryUrl.searchParams.set("format", "json");
  summaryUrl.searchParams.set("origin", "*");
  const summaryRes = await fetch(summaryUrl.toString());
  const summaryJson = (await summaryRes.json()) as {
    query?: { pages?: Record<string, { title?: string; extract?: string; fullurl?: string }> };
  };
  const page = Object.values(summaryJson.query?.pages ?? {})[0];
  const extract = page?.extract?.trim();
  if (!extract) return null;
  const title = page?.title ?? pageTitle;
  const url = page?.fullurl ?? `https://en.wikipedia.org/wiki/${encodeURIComponent(title)}`;
  const summary = extract.length > 400 ? `${extract.slice(0, 397)}…` : extract;
  return {
    summary: `Wikipedia: ${title}`,
    briefingMarkdown: `## ${title}\n\n${extract.split(/(?<=[.!?])\s+/).slice(0, 5).map((s) => `- ${s}`).join("\n")}\n\n[Read more](${url})`,
    cards: [{ title, snippet: summary, source: "Wikipedia", publishedAt: new Date().toISOString() }],
  };
}

async function fetchBbcRss(topic: string, max = 2): Promise<ResearchNewsCard[]> {
  try {
    const res = await fetch("https://feeds.bbci.co.uk/news/rss.xml");
    const xml = await res.text();
    const items = xml.match(/<item[\s\S]*?<\/item>/gi) ?? [];
    const words = topic.toLowerCase().split(/\W+/).filter((w) => w.length > 3);
    const cards: ResearchNewsCard[] = [];
    for (const block of items.slice(0, 10)) {
      const title = block.match(/<title>([\s\S]*?)<\/title>/i)?.[1]?.replace(/<!\[CDATA\[|\]\]>/g, "") ?? "";
      const desc = block.match(/<description>([\s\S]*?)<\/description>/i)?.[1]?.replace(/<[^>]+>/g, " ") ?? "";
      if (!title) continue;
      const match = words.length === 0 || words.some((w) => title.toLowerCase().includes(w));
      if (!match && cards.length >= max) continue;
      cards.push({
        title: title.trim(),
        snippet: desc.trim().slice(0, 240),
        source: "BBC News (RSS)",
        publishedAt: new Date().toISOString(),
      });
      if (cards.length >= max) break;
    }
    return cards;
  } catch {
    return [];
  }
}

function parseJsonResearch(text: string): ResearchContent | null {
  const jsonBlock = text.trim().match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]?.trim();
  const candidate = jsonBlock ?? text.trim();
  try {
    const parsed = JSON.parse(candidate) as ResearchContent & { briefing?: string };
    if (!parsed?.summary || !Array.isArray(parsed.cards)) return null;
    return {
      summary: parsed.summary.trim(),
      briefingMarkdown:
        typeof parsed.briefingMarkdown === "string"
          ? parsed.briefingMarkdown.trim()
          : typeof parsed.briefing === "string"
            ? parsed.briefing.trim()
            : undefined,
      cards: parsed.cards.slice(0, 6),
    };
  } catch {
    return null;
  }
}

async function geminiResearch(prompt: string, apiKey: string, model: string): Promise<ResearchContent | null> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const m = genAI.getGenerativeModel({ model });
  const instruction = [
    "Research assistant. JSON only:",
    '{"summary":"...","briefingMarkdown":"## ...","cards":[{"title","snippet","source","publishedAt?"}]}',
    `Topic: ${prompt}`,
  ].join("\n");
  const result = await m.generateContent(instruction);
  return parseJsonResearch(result.response.text());
}

async function kimiResearch(prompt: string, apiKey: string, model: string): Promise<ResearchContent | null> {
  const res = await fetch("https://api.moonshot.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "user",
          content: `JSON research briefing for: ${prompt}. Shape: {"summary","briefingMarkdown","cards":[]}`,
        },
      ],
    }),
  });
  if (!res.ok) return null;
  const body = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return parseJsonResearch(body.choices?.[0]?.message?.content ?? "");
}

export async function collectResearchOnDevice(prompt: string): Promise<ResearchContent> {
  const settings = await getLocalSettingsPublic();
  const trimmed = prompt.trim();

  if (settings.demoMode) {
    const cards = stubCards(trimmed);
    return {
      summary: `[Demo] Quick read on “${trimmed}”.`,
      briefingMarkdown: `## Demo\n\n- Offline template only.\n- Turn off demo in Settings for live sources.`,
      cards,
    };
  }

  const provider = settings.researchProvider ?? "auto";

  if (provider === "gemini" || provider === "auto") {
    const key = await getGeminiKey();
    if (key) {
      const g = await geminiResearch(trimmed, key, settings.geminiModel ?? "gemini-2.0-flash");
      if (g) return g;
    }
  }

  if (provider === "kimi" || provider === "auto") {
    const key = await getKimiKey();
    if (key) {
      const k = await kimiResearch(trimmed, key, settings.kimiModel ?? "moonshot-v1-8k");
      if (k) return k;
    }
  }

  const wiki = await fetchWikipedia(trimmed);
  if (wiki) {
    const rss = await fetchBbcRss(trimmed, 2);
    return { ...wiki, cards: [...wiki.cards, ...rss].slice(0, 6) };
  }

  const rss = await fetchBbcRss(trimmed, 3);
  if (rss.length) {
    return {
      summary: `Headlines for “${trimmed}”.`,
      briefingMarkdown: rss.map((c) => `- **${c.title}**`).join("\n"),
      cards: rss,
    };
  }

  const cards = stubCards(trimmed);
  return { summary: `Stub briefing for “${trimmed}”.`, cards };
}
