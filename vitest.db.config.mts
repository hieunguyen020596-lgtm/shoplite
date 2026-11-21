import path from "node:path";
import { defineConfig } from "vitest/config";

try {
  process.loadEnvFile(".env");
} catch {
  // Không có .env thì dựa vào biến môi trường của shell.
}

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "server-only": path.resolve(
        import.meta.dirname,
        "vitest.server-only-stub.ts",
      ),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.db.test.ts"],
    fileParallelism: false,
    globalSetup: ["./vitest.db.setup.ts"],
    env: { DATABASE_URL: process.env.TEST_DATABASE_URL ?? "" },
  },
});
