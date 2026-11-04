import { GoogleGenerativeAI } from "@google/generative-ai";
import { getGeminiConfig } from "./geminiConfig.js";

export async function testGeminiConnection(): Promise<{ ok: true } | { ok: false; error: string }> {
  const config = getGeminiConfig();
  if (!config) {
    return { ok: false, error: "No Gemini API key saved on this server." };
  }

  try {
    const genAI = new GoogleGenerativeAI(config.apiKey);
    const model = genAI.getGenerativeModel({ model: config.model });
    await model.generateContent({
      contents: [{ role: "user", parts: [{ text: "Reply with exactly: ok" }] }],
    });
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gemini request failed";
    return { ok: false, error: message };
  }
}
