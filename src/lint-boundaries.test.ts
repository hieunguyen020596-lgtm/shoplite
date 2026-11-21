// @vitest-environment node
import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";

const eslint = new ESLint({ cwd: process.cwd() });

async function lint(filePath: string, code: string) {
  const [result] = await eslint.lintText(code, { filePath });
  return result.messages.filter((m) => m.severity === 2);
}

describe("ranh giới lớp (AD-1)", () => {
  it("src/app import src/db bị chặn", async () => {
    expect(
      await lint(
        "src/app/x/route.ts",
        'import { getDb } from "@/db/client";\nexport const a = getDb;\n',
      ),
    ).not.toHaveLength(0);
  });

  it("src/app import *.pg bị chặn", async () => {
    expect(
      await lint(
        "src/app/x/route.ts",
        'import { f } from "@/features/orders/order.pg";\nexport const a = f;\n',
      ),
    ).not.toHaveLength(0);
  });

  it('"use client" import *.pg hoặc server.ts bị chặn', async () => {
    const pg =
      '"use client";\nimport { f } from "@/features/orders/order.pg";\nexport const a = f;\n';
    const srv =
      '"use client";\nimport { s } from "@/features/orders/server";\nexport const a = s;\n';
    expect(
      await lint("src/features/orders/components/x.tsx", pg),
    ).not.toHaveLength(0);
    expect(
      await lint("src/features/orders/components/x.tsx", srv),
    ).not.toHaveLength(0);
  });

  it('"use client" import db hoặc re-export bị chặn, đúng rule', async () => {
    const f = "src/features/orders/components/x.tsx";
    const cases = [
      '"use client";\nimport { a } from "@/db/client";\nexport const b = a;\n',
      '"use client";\nimport { a } from "../../db/schema";\nexport const b = a;\n',
      '"use client";\nexport { a } from "@/features/orders/order.pg";\n',
      '"use client";\nexport * from "./server.ts";\n',
      '"use client";\nexport { a } from "@/db";\n',
    ];
    for (const code of cases) {
      const msgs = await lint(f, code);
      expect(msgs.map((m) => m.ruleId)).toEqual(["no-restricted-syntax"]);
    }
  });

  it('"use client" import next/server, react-dom/server vẫn hợp lệ', async () => {
    const code =
      '"use client";\nimport { NextResponse } from "next/server";\nimport { renderToString } from "react-dom/server";\nexport const a = [NextResponse, renderToString];\n';
    expect(await lint("src/features/x/components/x.tsx", code)).toHaveLength(0);
  });

  it.each([
    "@/features/orders/order.pg",
    "@/features/orders/order.pg.ts",
    "./order.pg.ts",
  ])("src/app import %s bị chặn đúng rule", async (source) => {
    const msgs = await lint(
      "src/app/x/route.ts",
      `import { f } from "${source}";\nexport const a = f;\n`,
    );
    expect(msgs.map((m) => m.ruleId)).toEqual(["no-restricted-imports"]);
  });

  it("import hợp lệ không bị chặn", async () => {
    expect(
      await lint(
        "src/app/x/route.ts",
        'import { orderService } from "@/features/orders/server";\nexport const a = orderService;\n',
      ),
    ).toHaveLength(0);
    expect(
      await lint(
        "src/features/x.tsx",
        'import { f } from "@/features/orders/order.pg";\nexport const a = f;\n',
      ),
    ).toHaveLength(0);
  });
});
