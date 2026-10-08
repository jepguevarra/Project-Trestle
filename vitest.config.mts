import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const alias = { "@": fileURLToPath(new URL(".", import.meta.url)) };

export default defineConfig({
  test: {
    projects: [
      {
        resolve: { alias },
        test: { name: "unit", include: ["tests/unit/**/*.test.ts"], environment: "node" },
      },
      {
        // The RLS isolation suite. It must never be skipped: without TEST_DATABASE_URL it fails.
        resolve: { alias },
        test: {
          name: "rls",
          include: ["tests/rls/**/*.test.ts"],
          environment: "node",
          globalSetup: ["tests/rls/global-setup.ts"],
          fileParallelism: false,
          testTimeout: 20_000,
          hookTimeout: 60_000,
        },
      },
    ],
  },
});
