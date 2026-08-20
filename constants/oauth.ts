import * as ReactNative from "react-native";

/**
 * API base URL resolution (OAuth/Manus references removed).
 * Metro runs on 8081, API server runs on 3000.
 * URL pattern: https://PORT-sandboxid.region.domain
 */
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? "";

export function getApiBaseUrl(): string {
  // If API_BASE_URL is set, use it
  if (API_BASE_URL) {
    return API_BASE_URL.replace(/\/$/, "");
  }

  // On web, derive from current hostname by replacing port 8081 with 3000
  if (ReactNative.Platform.OS === "web" && typeof window !== "undefined" && window.location) {
    const { protocol, hostname } = window.location;
    // Pattern: 8081-sandboxid.region.domain -> 3000-sandboxid.region.domain
    const apiHostname = hostname.replace(/^8081-/, "3000-");
    if (apiHostname !== hostname) {
      return `${protocol}//${apiHostname}`;
    }
  }

  // Fallback to empty (will use relative URL)
  return "";
}

/** Local storage key for the tabibi Bearer session token. */
export const SESSION_TOKEN_KEY = "tabibi.session-token.v1";
