import type { ResearchNewsCard } from "@personal-ai/shared";

type WikiResult = {
  summary: string;
  briefingMarkdown: string;
  cards: ResearchNewsCard[];
};

function buildBriefing(title: string, extract: string, url: string): string {
  const trimmed = extract.trim();
  const bullets = trimmed
    .split(/(?<=[.!?])\s+/)
    .slice(0, 5)
    .map((s) => `- ${s.trim()}`)
    .join("\n");
  return [`## ${title}`, "", bullets, "", `[Read on Wikipedia](${url})`].join("\n");
}

export async function fetchWikipediaResearch(topic: string): Promise<WikiResult | null> {
  const q = topic.trim();
  if (!q) return null;

  const searchUrl = new URL("https://en.wikipedia.org/w/api.php");
  searchUrl.searchParams.set("action", "query");
  searchUrl.searchParams.set("list", "search");
  searchUrl.searchParams.set("srsearch", q);
  searchUrl.searchParams.set("format", "json");
  searchUrl.searchParams.set("origin", "*");

  let pageTitle: string | null = null;
  try {
    const searchRes = await fetch(searchUrl.toString());
    const searchJson = (await searchRes.json()) as {
      query?: { search?: { title: string }[] };
    };
    pageTitle = searchJson.query?.search?.[0]?.title ?? null;
  } catch {
    return null;
  }

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

  try {
    const summaryRes = await fetch(summaryUrl.toString());
    const summaryJson = (await summaryRes.json()) as {
      query?: { pages?: Record<string, { title?: string; extract?: string; fullurl?: string }> };
    };
    const page = Object.values(summaryJson.query?.pages ?? {})[0];
    const extract = page?.extract?.trim();
    const title = page?.title ?? pageTitle;
    const url = page?.fullurl ?? `https://en.wikipedia.org/wiki/${encodeURIComponent(title)}`;
    if (!extract) return null;

    const summary =
      extract.length > 420 ? `${extract.slice(0, 417).trim()}…` : extract;

    const cards: ResearchNewsCard[] = [
      {
        title,
        snippet: summary,
        source: "Wikipedia",
        publishedAt: new Date().toISOString(),
      },
    ];

    return {
      summary: `Wikipedia overview of “${title}”.`,
      briefingMarkdown: buildBriefing(title, extract, url),
      cards,
    };
  } catch {
    return null;
  }
}
