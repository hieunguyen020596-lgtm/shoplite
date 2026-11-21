import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const CLIENT = "Program:has(> ExpressionStatement[directive='use client'])";
const clientRules = (rules) =>
  rules.map(([regex, message]) => ({
    selector: `${CLIENT} > :matches(ImportDeclaration, ExportNamedDeclaration, ExportAllDeclaration)[source.value=/${regex}/]`,
    message,
  }));

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // AD-1: ranh giới lớp.
  {
    files: ["src/app/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/db", "@/db/**", "**/db", "**/db/**"],
              message: "src/app không import src/db, hãy gọi service.",
            },
            {
              group: ["**/*.pg", "**/*.pg.ts"],
              message: "src/app không import *.pg, hãy gọi service.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/**/*.test.{ts,tsx}"],
    rules: {
      "no-restricted-syntax": [
        "error",
        ...clientRules([
          [String.raw`\.pg(\.ts)?$`, 'File "use client" không import *.pg.'],
          [
            String.raw`^(\.{1,2}\/|@\/)(.*\/)?server(\.ts)?$`,
            'File "use client" không import server.ts.',
          ],
          [
            String.raw`^(\.{1,2}\/|@\/)(.*\/)?db(\/.*)?$`,
            'File "use client" không import src/db.',
          ],
        ]),
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Generated output of tests and local storage
    "coverage/**",
    "storage/**",
    "playwright-report/**",
    "test-results/**",
  ]),
]);

export default eslintConfig;
