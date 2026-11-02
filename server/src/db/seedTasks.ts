import type { TaskDefinition } from "@personal-ai/shared";

export const CATALOG_SEED: TaskDefinition[] = [
  {
    id: "daily-news-research",
    name: "Daily News Research",
    icon: "📰",
    category: "news",
    description:
      "Collect headlines from RSS feeds by category and optionally summarize trends for your morning brief.",
    features: [
      "RSS category filters",
      "Daily digest layout",
      "Optional AI summary",
    ],
    requiredInputs: [
      {
        key: "categories",
        label: "News categories",
        type: "text",
        required: true,
        placeholder: "e.g. world, tech, business",
      },
    ],
    dataSources: [
      { type: "rss", label: "Configured RSS feeds" },
    ],
    aiRequirements: {
      optional: true,
      capability: "summarize",
      preferredProvider: "ollama",
    },
    runnerKey: "daily-news",
    featured: true,
  },
  {
    id: "ai-tech-research",
    name: "AI Technology Research",
    icon: "🤖",
    category: "ai-ml",
    description:
      "Track AI and ML news from tech RSS sources with optional bullet summaries.",
    features: ["Tech RSS bundles", "Trend highlights", "Source links"],
    requiredInputs: [
      {
        key: "focus",
        label: "Focus area",
        type: "select",
        options: ["LLMs", "Robotics", "Open source", "General"],
        required: true,
      },
    ],
    dataSources: [{ type: "rss", label: "AI/tech RSS feeds" }],
    aiRequirements: {
      optional: true,
      capability: "summarize",
      preferredProvider: "ollama",
    },
    runnerKey: "ai-tech",
    featured: true,
  },
  {
    id: "topic-research",
    name: "Topic Research",
    icon: "🔍",
    category: "research",
    description:
      "Deep-dive a topic using Wikipedia plus related RSS search results.",
    features: ["Wikipedia overview", "Related articles", "Structured notes"],
    requiredInputs: [
      {
        key: "topic",
        label: "Topic",
        type: "text",
        required: true,
        placeholder: "e.g. quantum computing",
      },
    ],
    dataSources: [
      { type: "wikipedia", label: "Wikipedia API" },
      { type: "rss", label: "Topic RSS search" },
    ],
    aiRequirements: {
      optional: true,
      capability: "structured",
      preferredProvider: "ollama",
    },
    runnerKey: "topic-research",
    featured: true,
  },
  {
    id: "business-research",
    name: "Business Research",
    icon: "📊",
    category: "business",
    description:
      "Build a structured company or market report with public links and filing references.",
    features: ["Report template", "Public link collection", "Section headings"],
    requiredInputs: [
      {
        key: "companyOrMarket",
        label: "Company or market",
        type: "text",
        required: true,
      },
    ],
    dataSources: [{ type: "links", label: "Public company pages & filings" }],
    aiRequirements: {
      optional: true,
      capability: "structured",
      preferredProvider: "ollama",
    },
    runnerKey: "business-research",
    featured: false,
  },
  {
    id: "learning-assistant",
    name: "Learning Assistant",
    icon: "📚",
    category: "learning",
    description:
      "Organize study notes with headings and bullets from your topic and sources.",
    features: ["Outline layout", "Bullet summaries", "Export-friendly format"],
    requiredInputs: [
      {
        key: "subject",
        label: "Subject",
        type: "text",
        required: true,
      },
      {
        key: "goals",
        label: "Learning goals",
        type: "multiline",
        required: false,
      },
    ],
    dataSources: [{ type: "wikipedia", label: "Reference material" }],
    aiRequirements: {
      optional: true,
      capability: "structured",
      preferredProvider: "ollama",
    },
    runnerKey: "learning-assistant",
    featured: true,
  },
];
