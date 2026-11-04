import type { McpRunRecord } from "@personal-ai/shared";
import { LOCAL_ROOT, newId, readJsonFile, writeJsonFile } from "../fsJson";
import { getLocalSettingsPublic } from "../settingsSecure";

const RUNS_PATH = `${LOCAL_ROOT}/daily/mcp-runs.json`;

type RunsFile = { runs: McpRunRecord[] };

async function appendRun(run: McpRunRecord): Promise<void> {
  const file = await readJsonFile<RunsFile>(RUNS_PATH, { runs: [] });
  file.runs.unshift(run);
  await writeJsonFile(RUNS_PATH, { runs: file.runs.slice(0, 100) });
}

export async function listMcpRuns(): Promise<McpRunRecord[]> {
  const file = await readJsonFile<RunsFile>(RUNS_PATH, { runs: [] });
  return file.runs;
}

export async function invokeMcpTool(input: {
  serverId: string;
  toolName: string;
  arguments: Record<string, unknown>;
}): Promise<Record<string, unknown>> {
  const settings = await getLocalSettingsPublic();
  const server = settings.mcpServers.find((s) => s.id === input.serverId);
  if (!server) {
    throw new Error("MCP server not found in Settings");
  }

  const base = server.url.replace(/\/$/, "");
  const path = server.toolPath?.trim() || "/";
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;

  const startedAt = new Date().toISOString();
  const body = {
    jsonrpc: "2.0",
    id: newId(),
    method: "tools/call",
    params: {
      name: input.toolName,
      arguments: input.arguments,
    },
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(25_000),
    });
    const text = await res.text();
    const preview = text.slice(0, 500);
    if (!res.ok) {
      await appendRun({
        id: newId(),
        serverId: server.id,
        toolName: input.toolName,
        startedAt,
        completedAt: new Date().toISOString(),
        ok: false,
        error: `HTTP ${res.status}`,
        responsePreview: preview,
      });
      throw new Error(`MCP HTTP ${res.status}`);
    }
    await appendRun({
      id: newId(),
      serverId: server.id,
      toolName: input.toolName,
      startedAt,
      completedAt: new Date().toISOString(),
      ok: true,
      responsePreview: preview,
    });
    try {
      return JSON.parse(text) as Record<string, unknown>;
    } catch {
      return { raw: preview };
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : "MCP call failed";
    await appendRun({
      id: newId(),
      serverId: server.id,
      toolName: input.toolName,
      startedAt,
      completedAt: new Date().toISOString(),
      ok: false,
      error: message,
    });
    throw e;
  }
}
