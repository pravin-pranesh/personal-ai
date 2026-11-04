export type TaskCategory =
  | "news"
  | "technology"
  | "ai-ml"
  | "research"
  | "business"
  | "learning"
  | "science"
  | "productivity";

export const STORE_CATEGORIES: { id: TaskCategory; label: string }[] = [
  { id: "news", label: "News" },
  { id: "technology", label: "Technology" },
  { id: "ai-ml", label: "AI & ML" },
  { id: "research", label: "Research" },
  { id: "business", label: "Business" },
  { id: "learning", label: "Learning" },
  { id: "science", label: "Science" },
  { id: "productivity", label: "Productivity" },
];

export type TaskInputField = {
  key: string;
  label: string;
  type: "text" | "number" | "select" | "multiline";
  required?: boolean;
  placeholder?: string;
  options?: string[];
};

export type TaskDataSource = {
  type: "rss" | "wikipedia" | "links";
  label: string;
  config?: Record<string, string>;
};

export type AiRequirements = {
  optional: boolean;
  capability?: "summarize" | "structured";
  preferredProvider?: "ollama" | "openai" | "anthropic";
};

export type TaskDefinition = {
  id: string;
  name: string;
  icon: string;
  category: TaskCategory;
  description: string;
  features: string[];
  requiredInputs: TaskInputField[];
  dataSources: TaskDataSource[];
  aiRequirements: AiRequirements | null;
  runnerKey: string;
  featured?: boolean;
};

export type TaskDefinitionSummary = Pick<
  TaskDefinition,
  "id" | "name" | "icon" | "category" | "description" | "featured"
>;

export type TaskDetail = TaskDefinition & {
  isInstalled: boolean;
  isFavorite: boolean;
};

export type InstalledTaskRow = {
  taskId: string;
  name: string;
  icon: string;
  category: TaskCategory;
  installedAt: string;
  config: Record<string, unknown>;
};

export type DashboardPayload = {
  welcome: { greeting: string; subtitle: string };
  stats: { installedCount: number; favoriteCount: number };
  featured: TaskDefinitionSummary[];
  favourites: TaskDefinitionSummary[];
  categories: { id: TaskCategory; label: string; taskCount: number }[];
  recentlyExecuted: {
    id: string;
    taskName: string;
    icon: string;
    completedAt: string;
  }[];
  recentResults: {
    id: string;
    title: string;
    taskName: string;
    preview: string;
    createdAt: string;
  }[];
};

export type InstalledPayload = {
  installed: InstalledTaskRow[];
  favorites: TaskDefinitionSummary[];
  recentlyUsed: InstalledTaskRow[];
};

export type DailyTodo = {
  id: string;
  title: string;
  done: boolean;
  createdAt: string;
};

export type DailyTodosPayload = {
  items: DailyTodo[];
};

export type ResearchNewsCard = {
  title: string;
  snippet: string;
  source: string;
  publishedAt?: string;
};

export type ResearchSession = {
  id: string;
  prompt: string;
  slug: string;
  fileName: string;
  createdAt: string;
  summary: string;
  cards: ResearchNewsCard[];
};

export type ResearchListPayload = {
  sessions: ResearchSession[];
};

export type ResearchCreateResponse = ResearchSession;

export type ClearLocalDataResponse = {
  ok: boolean;
  cleared: ("todos" | "research")[];
};

export type SettingsPublic = {
  geminiConfigured: boolean;
  geminiModel?: string;
  geminiKeyPreview?: string;
};

export type SettingsUpdateBody = {
  geminiApiKey?: string;
  geminiModel?: string;
};
