import { defineConfig } from "vitest/config";
import "dotenv/config";
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "react-native": require.resolve("./tests/__mocks__/react-native.ts"),
      "expo-crypto": require.resolve("./tests/__mocks__/expo-crypto.ts"),
      "expo-constants": require.resolve("./tests/__mocks__/expo-constants.ts"),
    },
  },
});
