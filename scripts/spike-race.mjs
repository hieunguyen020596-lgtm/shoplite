// Spike Story 1.2: chứng minh trừ kho nguyên tử trên shoplite_dev.
// Chạy: node --env-file=.env scripts/spike-race.mjs  (cần `npm run dev` ở BASE_URL)
import pg from "pg";

const BASE_URL = process.env.SPIKE_BASE_URL ?? "http://localhost:3100";
const PRODUCT_ID = "__spike__";
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
let failures = 0;

function check(name, ok, detail = "") {
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` (${detail})` : ""}`);
}

async function call(body) {
  const res = await fetch(`${BASE_URL}/api/spike/reserve`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, code: json?.error?.code };
}

async function setStock(stock) {
  await client.query(
    "INSERT INTO inventory (product_id, stock) VALUES ($1, $2) ON CONFLICT (product_id) DO UPDATE SET stock = $2",
    [PRODUCT_ID, stock],
  );
}

async function getStock() {
  const r = await client.query(
    "SELECT stock FROM inventory WHERE product_id = $1",
    [PRODUCT_ID],
  );
  return r.rows[0]?.stock;
}

try {
  await client.connect();
  const db = (await client.query("SELECT current_database() AS db")).rows[0].db;
  if (db !== "shoplite_dev") {
    throw new Error(`Từ chối chạy: database là ${db}, cần shoplite_dev`);
  }

  await setStock(2);
  let r = await call({ productId: PRODUCT_ID, quantity: 1 });
  check(
    "trừ kho đủ",
    r.status === 200 && (await getStock()) === 1,
    `status ${r.status}`,
  );

  await setStock(0);
  r = await call({ productId: PRODUCT_ID, quantity: 1 });
  check(
    "thiếu hàng",
    r.status === 409 &&
      r.code === "INSUFFICIENT_STOCK" &&
      (await getStock()) === 0,
    `status ${r.status}`,
  );

  await setStock(1);
  const results = await Promise.all(
    Array.from({ length: 20 }, () =>
      call({ productId: PRODUCT_ID, quantity: 1 }),
    ),
  );
  const ok = results.filter((x) => x.status === 200).length;
  const conflict = results.filter((x) => x.status === 409).length;
  check(
    "race 20 request",
    ok === 1 && conflict === 19 && (await getStock()) === 0,
    `200=${ok} 409=${conflict}`,
  );

  await setStock(1);
  r = await call({ productId: PRODUCT_ID, quantity: 1, failAfterUpdate: true });
  check(
    "rollback giữa chừng",
    r.status === 500 && (await getStock()) === 1,
    `status ${r.status}`,
  );

  for (const [label, body] of [
    ["thiếu productId", { quantity: 1 }],
    ["quantity < 1", { productId: PRODUCT_ID, quantity: 0 }],
  ]) {
    await setStock(1);
    r = await call(body);
    check(
      `input sai: ${label}`,
      r.status === 400 &&
        r.code === "VALIDATION_ERROR" &&
        (await getStock()) === 1,
      `status ${r.status}`,
    );
  }
} catch (error) {
  failures++;
  console.log(
    `FAIL lỗi script: ${error instanceof Error ? error.message : "không rõ"}`,
  );
} finally {
  try {
    const db = (await client.query("SELECT current_database() AS db")).rows[0]
      .db;
    if (db === "shoplite_dev") {
      await client.query("DELETE FROM inventory WHERE product_id = $1", [
        PRODUCT_ID,
      ]);
    }
  } catch {}
  await client.end().catch(() => {});
}

console.log(failures === 0 ? "CỔNG ĐẠT" : `CỔNG CHƯA ĐẠT (${failures} lỗi)`);
process.exit(failures === 0 ? 0 : 1);
