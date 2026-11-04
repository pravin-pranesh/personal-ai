/** Empty / unset = phone-local mode (default). Set only for dev/web against laptop server. */
export function getApiBaseUrl(): string | null {
  const fromEnv =
    typeof process !== "undefined" && process.env?.EXPO_PUBLIC_API_URL
      ? process.env.EXPO_PUBLIC_API_URL.trim()
      : "";
  if (!fromEnv) return null;
  return fromEnv.replace(/\/$/, "");
}

export function isPhoneLocalMode(): boolean {
  return getApiBaseUrl() === null;
}
