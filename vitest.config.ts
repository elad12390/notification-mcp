import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/**/*.ts"],
      exclude: [
        "src/index.ts",          // Entry point — stdio transport wiring, not unit testable
        "src/setup.ts",          // Standalone download script — requires network
        "src/types/index.ts",    // Type-only re-exports — no executable code
        "src/types/tool.ts",     // Type definitions — no executable code
        "src/utils/index.ts",    // Re-export barrel — no executable code
        "src/metrics/index.ts",  // Type-only re-exports — no executable code
      ],
    },
    testTimeout: 30000, // Real TTS tests (say engine) may take several seconds
  },
});
