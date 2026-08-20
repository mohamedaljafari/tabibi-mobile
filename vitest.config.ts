import { defineConfig } from "vitest/config";
import "dotenv/config";
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    env: {
      // Load app admin pin from the local env file when not already set.
      ADMIN_PIN: process.env.ADMIN_PIN || process.env.EXPO_PUBLIC_ADMIN_PIN || "",
    },
    setupFiles: ["./tests/vitest-setup.ts"],
  },
  resolve: {
    alias: {
      "react-native": require.resolve("./tests/__mocks__/react-native.ts"),
      "expo-crypto": require.resolve("./tests/__mocks__/expo-crypto.ts"),
      "expo-constants": require.resolve("./tests/vitest-setup.ts"),
    },
  },
});
