import type { DashboardPayload } from "@personal-ai/shared";

/** Offline fallback when the API is unreachable. */
export const sampleDashboardFallback: Pick<DashboardPayload, "recentResults"> = {
  recentResults: [
    {
      id: "sample-result-1",
      title: "Morning tech headlines",
      taskName: "Research",
      preview: "Sample offline preview — connect the API for live data.",
      createdAt: new Date(Date.now() - 3600000).toISOString(),
    },
  ],
};
