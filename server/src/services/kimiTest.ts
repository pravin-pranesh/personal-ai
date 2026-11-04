import { getKimiConfig } from "./kimiConfig.js";
import { formatKimiError, kimiComplete } from "./kimiClient.js";
import { isGeminiDevStubEnabled } from "./settingsStore.js";

export type KimiTestResult =
  | { ok: true; mode: "live" }
  | { ok: false; error: string };

export async function testKimiConnection(): Promise<KimiTestResult> {
  if (isGeminiDevStubEnabled()) {
    return { ok: false, error: "Demo mode is on — disable offline demo to test Kimi live." };
  }

  const config = getKimiConfig();
  if (!config) {
    return { ok: false, error: "No Kimi API key saved on this server." };
  }

  try {
    await kimiComplete(config, "Hi");
    return { ok: true, mode: "live" };
  } catch (err) {
    return { ok: false, error: formatKimiError(err) };
  }
}
