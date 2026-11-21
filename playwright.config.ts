import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const TEST_DATABASE_NAME = "shoplite_test";

try {
  process.loadEnvFile(".env");
} catch {
  // Không có .env thì dựa vào biến môi trường của shell.
}

/** E2E chỉ được chạy trên shoplite_test (AD-30). Lỗi chỉ nêu tên biến, không in URL. */
function requireTestDatabaseUrl(): string {
  const url = process.env.TEST_DATABASE_URL;
  let databaseName: string | undefined;
  try {
    databaseName = url ? new URL(url).pathname.slice(1) : undefined;
  } catch {
    databaseName = undefined;
  }
  if (!url || databaseName !== TEST_DATABASE_NAME) {
    throw new Error(`TEST_DATABASE_URL khong tro toi database ${TEST_DATABASE_NAME}`);
  }
  return url;
}

const testDatabaseUrl = requireTestDatabaseUrl();

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // Reset và seed shoplite_test trước mỗi lần chạy; script tự kiểm current_database().
    command: `npm run db:test:prepare && npx next dev -p ${PORT} -H 127.0.0.1`,
    url: BASE_URL,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      DATABASE_URL: testDatabaseUrl,
      TEST_DATABASE_URL: testDatabaseUrl,
      TRUSTED_PROXY_HOPS: "1",
      NEXT_DIST_DIR: ".next-e2e",
    },
  },
});
