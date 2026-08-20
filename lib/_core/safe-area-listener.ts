/**
 * Safe-area listener (web-only). Replaces the removed Manus runtime listener.
 * On web, listens to window resize and dispatches the computed insets/frame
 * (assumes a full-viewport single-screen layout).
 */
import { Platform } from "react-native";
import type { Metrics } from "react-native-safe-area-context";

export type SafeAreaCallback = (metrics: Metrics) => void;

let safeAreaCallback: SafeAreaCallback | null = null;

function computeMetrics(): Metrics {
  const insets = { top: 0, right: 0, bottom: 0, left: 0 };
  const frame = { x: 0, y: 0, width: 0, height: 0 };
  if (Platform.OS === "web" && typeof window !== "undefined") {
    frame.width = window.innerWidth;
    frame.height = window.innerHeight;
  }
  return { insets, frame };
}

export function subscribeSafeAreaInsets(callback: SafeAreaCallback): () => void {
  safeAreaCallback = callback;
  if (Platform.OS === "web" && typeof window !== "undefined") {
    const onResize = () => safeAreaCallback?.(computeMetrics());
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      if (safeAreaCallback === callback) safeAreaCallback = null;
    };
  }
  return () => {
    if (safeAreaCallback === callback) safeAreaCallback = null;
  };
}
