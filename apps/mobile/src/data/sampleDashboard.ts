import type { DashboardPayload } from "@personal-ai/shared";

/** Offline fallback for runs/results sections when API is unreachable. */
export const sampleDashboardFallback: Pick<
  DashboardPayload,
  "recentlyExecuted" | "recentResults"
> = {
  recentlyExecuted: [
    {
      id: "sample-run-1",
      taskName: "Daily News Research",
      icon: "📰",
      completedAt: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: "sample-run-2",
      taskName: "Topic Research",
      icon: "🔍",
      completedAt: new Date(Date.now() - 172800000).toISOString(),
    },
  ],
  recentResults: [
    {
      id: "sample-result-1",
      title: "Morning tech headlines",
      taskName: "AI Technology Research",
      preview: "Sample offline preview — connect the API for live data.",
      createdAt: new Date(Date.now() - 3600000).toISOString(),
    },
  ],
};
