// @vitest-environment node
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOTS = ["src", "scripts", "e2e"];
const ALLOWED = ["scripts/db-test-lib.ts"];
const IGNORED = [
  "src/data/inventory-seed.ts",
  "src/data/inventory-seed.test.ts",
];

function walk(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return walk(full);
    return /\.(ts|tsx|mts|cts|js|jsx|mjs|cjs)$/.test(name) ? [full] : [];
  });
}

describe("inventory-seed", () => {
  it("chỉ scripts/db-test-lib.ts nhắc tới inventory-seed", () => {
    const importers = ROOTS.flatMap(walk)
      .filter((file) => !IGNORED.includes(file))
      .filter((file) => readFileSync(file, "utf8").includes("inventory-seed"));
    expect(importers).toEqual(ALLOWED);
  });
});
