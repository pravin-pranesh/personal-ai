import type { ResearchNewsCard } from "@personal-ai/shared";

/** BBC News top stories — free RSS (MA-6). */
const BBC_RSS = "https://feeds.bbci.co.uk/news/rss.xml";

function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<!\[CDATA\[([\s\S]*?)]]>/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseRssItems(xml: string, limit: number): { title: string; description: string }[] {
  const items: { title: string; description: string }[] = [];
  const itemBlocks = xml.match(/<item[\s\S]*?<\/item>/gi) ?? [];
  for (const block of itemBlocks.slice(0, limit)) {
    const title = decodeEntities(block.match(/<title>([\s\S]*?)<\/title>/i)?.[1] ?? "");
    const description = decodeEntities(
      block.match(/<description>([\s\S]*?)<\/description>/i)?.[1] ?? "",
    );
    if (title) {
      items.push({ title, description: description || title });
    }
  }
  return items;
}

function topicMatches(topic: string, headline: string): boolean {
  const words = topic
    .toLowerCase()
    .split(/\W+/)
    .filter((w) => w.length > 3);
  if (words.length === 0) return true;
  const hay = headline.toLowerCase();
  return words.some((w) => hay.includes(w));
}

export async function fetchRssCards(topic: string, max = 3): Promise<ResearchNewsCard[]> {
  try {
    const res = await fetch(BBC_RSS, { headers: { "User-Agent": "PersonalAI/1.0" } });
    const xml = await res.text();
    const items = parseRssItems(xml, 12);
    const matched = items.filter((i) => topicMatches(topic, i.title));
    const picked = (matched.length ? matched : items).slice(0, max);
    const now = Date.now();
    return picked.map((item, idx) => ({
      title: item.title,
      snippet: item.description.slice(0, 280),
      source: "BBC News (RSS)",
      publishedAt: new Date(now - idx * 3_600_000).toISOString(),
    }));
  } catch {
    return [];
  }
}
