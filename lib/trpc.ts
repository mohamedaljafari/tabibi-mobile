import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import type { AppRouter } from "@/server/routers";
import { getApiBaseUrl } from "@/constants/oauth";
import * as Auth from "@/lib/_core/auth";
import { Platform } from "react-native";

/**
 * tRPC React client for type-safe API calls.
 *
 * IMPORTANT (tRPC v11): The `transformer` must be inside `httpBatchLink`,
 * NOT at the root createClient level. This ensures client and server
 * use the same serialization format (superjson).
 *
 * NATIVE SAFETY: On native platforms (Android/iOS) the app runs fully
 * offline using local storage (AsyncStorage/SecureStore). There is no
 * backend server bundled with the standalone APK, so the tRPC client is
 * configured with a local-safe stub URL. Any tRPC call on native would
 * simply fail gracefully instead of crashing the app at startup.
 * All real API interactions only occur on the web platform.
 */
export const trpc = createTRPCReact<AppRouter>();

/** Local-safe URL used when no backend is available (native offline mode). */
const NATIVE_STUB_URL = "https://localhost:0/api/trpc";

/**
 * Creates the tRPC client with proper configuration.
 * Call this once in your app's root layout.
 */
export function createTRPCClient() {
  // On native, the API server is not bundled in the standalone build,
  // so derive the URL only when it is actually provided (web hosted mode).
  const apiUrl = getApiBaseUrl() ? `${getApiBaseUrl()}/api/trpc` : NATIVE_STUB_URL;

  return trpc.createClient({
    links: [
      httpBatchLink({
        url: apiUrl,
        // tRPC v11: transformer MUST be inside httpBatchLink, not at root
        transformer: superjson,
        async headers() {
          const token = await Auth.getSessionToken();
          return token ? { Authorization: `Bearer ${token}` } : {};
        },
        // Custom fetch to include credentials for cookie-based auth
        fetch(url, options) {
          return fetch(url, {
            ...options,
            credentials: "include",
          });
        },
      }),
    ],
  });
}
