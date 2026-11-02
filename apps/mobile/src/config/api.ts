const DEFAULT_API = "http://localhost:3001";

export function getApiBaseUrl(): string {
  const fromEnv =
    typeof process !== "undefined" && process.env?.EXPO_PUBLIC_API_URL
      ? process.env.EXPO_PUBLIC_API_URL
      : undefined;
  return (fromEnv ?? DEFAULT_API).replace(/\/$/, "");
}
