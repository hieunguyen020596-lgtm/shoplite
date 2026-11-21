import pg from "pg";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("Thieu bien moi truong: DATABASE_URL");
  process.exit(1);
}

const TABLES = [
  "orders",
  "order_items",
  "order_status_history",
  "inventory",
] as const;
let failures = 0;

function report(name: string, ok: boolean, detail = "") {
  if (!ok) failures += 1;
  console.log(
    `${ok ? "DAT " : "LOI "} ${name}${detail ? ` -- ${detail}` : ""}`,
  );
}

async function counts(client: pg.Client) {
  const result: Record<string, number> = {};
  for (const table of TABLES) {
    const r = await client.query(`SELECT count(*)::int AS n FROM ${table}`);
    result[table] = r.rows[0].n;
  }
  return result;
}

async function expectRejected(
  client: pg.Client,
  name: string,
  sql: string,
  params: unknown[] = [],
  state?: string,
  constraint?: string,
) {
  await client.query("SAVEPOINT s");
  try {
    await client.query(sql, params);
    report(name, false, "khong bi tu choi");
  } catch (error) {
    const code = (error as { code?: string }).code;
    const name2 = (error as { constraint?: string }).constraint;
    const ok =
      (state ? code === state : true) &&
      (constraint ? name2 === constraint : true);
    report(name, ok, `sqlState ${code}${name2 ? ` ${name2}` : ""}`);
  }
  await client.query("ROLLBACK TO SAVEPOINT s");
}

async function expectOk(
  client: pg.Client,
  name: string,
  sql: string,
  params: unknown[] = [],
) {
  await client.query("SAVEPOINT s");
  try {
    await client.query(sql, params);
    report(name, true);
  } catch (error) {
    report(name, false, `sqlState ${(error as { code?: string }).code}`);
  }
  await client.query("ROLLBACK TO SAVEPOINT s");
}

const client = new pg.Client({ connectionString: url });
await client.connect();
try {
  const db = (await client.query("SELECT current_database() AS d")).rows[0].d;
  if (db !== "shoplite_dev") {
    console.error(`Tu choi: database la ${db}, can shoplite_dev`);
    process.exit(1);
  }

  const before = await counts(client);

  // Catalog: bang, index, trigger, precision.
  const tables = await client.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema='public'",
  );
  const have = new Set(tables.rows.map((r) => r.table_name));
  report(
    "co du 4 bang",
    TABLES.every((t) => have.has(t)),
  );

  const idx = await client.query(
    "SELECT indexname FROM pg_indexes WHERE schemaname='public'",
  );
  const idxNames = new Set(idx.rows.map((r) => r.indexname));
  const wantIdx = [
    "orders_phone_status_idx",
    "orders_status_created_idx",
    "orders_status_updated_id_idx",
    "orders_refund_created_idx",
    "order_status_history_order_id_idx",
  ];
  report(
    "co du index",
    wantIdx.every((i) => idxNames.has(i)),
  );

  const trg = await client.query(
    `SELECT tgtype FROM pg_trigger WHERE tgname='order_status_history_append_only'
       AND tgrelid='public.order_status_history'::regclass AND NOT tgisinternal`,
  );
  // bit 1 = ROW, bit 2 = BEFORE, bit 8 = DELETE, bit 16 = UPDATE
  const t = trg.rows[0]?.tgtype ?? 0;
  report(
    "trigger BEFORE UPDATE OR DELETE ton tai",
    (t & 1) !== 0 && (t & 2) !== 0 && (t & 8) !== 0 && (t & 16) !== 0,
  );

  const cols = await client.query(
    `SELECT table_name, column_name, datetime_precision FROM information_schema.columns
      WHERE table_schema='public' AND data_type='timestamp with time zone'`,
  );
  report(
    "cot thoi gian deu timestamptz(3)",
    [
      "orders.created_at",
      "orders.updated_at",
      "order_status_history.created_at",
    ].every((c) =>
      cols.rows.some((r) => `${r.table_name}.${r.column_name}` === c),
    ) && cols.rows.every((r) => r.datetime_precision === 3),
    `${cols.rows.length} cot`,
  );

  const checks = await client.query(
    `SELECT conname FROM pg_constraint WHERE contype='c' AND connamespace='public'::regnamespace`,
  );
  const checkNames = new Set(checks.rows.map((r) => r.conname));
  report(
    "co du CHECK",
    [
      "inventory_stock_non_negative",
      "orders_refund_required_valid",
      "osh_event_shape",
      "osh_staff_actor_required",
    ].every((c) => checkNames.has(c)),
  );

  const def = await client.query(
    `SELECT column_default FROM information_schema.columns
      WHERE table_name='order_status_history' AND column_name='created_at'`,
  );
  report(
    "created_at mac dinh clock_timestamp()",
    String(def.rows[0]?.column_default).includes("clock_timestamp"),
  );

  // Hành vi: mọi thứ trong transaction rồi ROLLBACK.
  await client.query("BEGIN");
  try {
    await expectRejected(
      client,
      "ton am bi CHECK tu choi",
      "INSERT INTO inventory VALUES ('smoke-neg', -1)",
      [],
      "23514",
    );
    await client.query("INSERT INTO inventory VALUES ('smoke-p', 5)");

    const orderSql = `INSERT INTO orders (id, status, customer_name, phone_normalized, address,
      shipping_method, payment_method, subtotal, shipping_fee, total, refund_required)
      VALUES ($1, $2, 'A', '0900000000', 'B', 'standard', $3, 100, 0, 100, $4)`;
    await expectRejected(
      client,
      "refund_required voi pending bi tu choi",
      orderSql,
      ["smoke-o1", "pending", "bank_transfer", true],
      "23514",
    );
    await expectRejected(
      client,
      "refund_required voi cancelled+cod bi tu choi",
      orderSql,
      ["smoke-o1", "cancelled", "cod", true],
      "23514",
    );
    await expectOk(
      client,
      "refund_required voi cancelled+bank_transfer hop le",
      orderSql,
      ["smoke-o1", "cancelled", "bank_transfer", true],
    );

    await client.query(orderSql, ["smoke-o2", "pending", "cod", false]);
    const ver = await client.query(
      "SELECT version FROM orders WHERE id='smoke-o2'",
    );
    report("orders.version mac dinh 0", ver.rows[0].version === 0);

    await expectRejected(
      client,
      "order_items.product_id phai co trong inventory",
      `INSERT INTO order_items VALUES ('smoke-o2','khong-co','n','s','{}',1,1,1)`,
      [],
      "23503",
    );
    await client.query(
      `INSERT INTO order_items VALUES ('smoke-o2','smoke-p','n','s','{}',1,1,1)`,
    );

    const badOrder = (
      name: string,
      status: string,
      ship: string,
      pay: string,
      constraint: string,
    ) =>
      expectRejected(
        client,
        name,
        `INSERT INTO orders (id, status, customer_name, phone_normalized, address, shipping_method, payment_method, subtotal, shipping_fee, total)
         VALUES ('smoke-bad', $1, 'A', '0900000000', 'B', $2, $3, 1, 0, 1)`,
        [status, ship, pay],
        "23514",
        constraint,
      );
    await badOrder(
      "orders.status sai bi tu choi",
      "zzz",
      "standard",
      "cod",
      "orders_status_valid",
    );
    await badOrder(
      "orders.shipping_method sai bi tu choi",
      "pending",
      "zzz",
      "cod",
      "orders_shipping_method_valid",
    );
    await badOrder(
      "orders.payment_method sai bi tu choi",
      "pending",
      "standard",
      "zzz",
      "orders_payment_method_valid",
    );
    await expectRejected(
      client,
      "order_items.quantity = 0 bi tu choi",
      `INSERT INTO order_items VALUES ('smoke-o2','smoke-p','n','s','{}',1,0,0)`,
      [],
      "23514",
      "order_items_quantity_positive",
    );
    await expectRejected(
      client,
      "order_items.order_id khong ton tai bi tu choi",
      `INSERT INTO order_items VALUES ('khong-co','smoke-p','n','s','{}',1,1,1)`,
      [],
      "23503",
      "order_items_order_id_fk",
    );

    await expectRejected(
      client,
      "xoa inventory dang duoc dung bi RESTRICT",
      "DELETE FROM inventory WHERE product_id='smoke-p'",
      [],
      "23503",
    );

    const hist = `INSERT INTO order_status_history
      (order_id, event_type, from_status, to_status, reason_code, reason_text, refund_outcome, actor_type, actor_staff_id, actor_name)
      VALUES ('smoke-o2', $1, $2, $3, $4, $5, $6, $7, $8, $9)`;
    const created = [
      "order_created",
      null,
      "pending",
      null,
      null,
      null,
      "customer",
      null,
      "Khách hàng",
    ];
    await expectOk(client, "order_created hop le", hist, created);
    await expectRejected(
      client,
      "order_created co from_status bi tu choi",
      hist,
      [
        "order_created",
        "pending",
        "pending",
        "c",
        "t",
        null,
        "customer",
        null,
        "Khách hàng",
      ],
      "23514",
    );
    await expectRejected(
      client,
      "order_created co reason_code bi tu choi",
      hist,
      [
        "order_created",
        null,
        "pending",
        "c",
        null,
        null,
        "customer",
        null,
        "Khách hàng",
      ],
      "23514",
    );
    await expectRejected(
      client,
      "order_created co reason_text bi tu choi",
      hist,
      [
        "order_created",
        null,
        "pending",
        null,
        "t",
        null,
        "customer",
        null,
        "Khách hàng",
      ],
      "23514",
    );
    await expectRejected(
      client,
      "order_created actor staff bi tu choi",
      hist,
      [
        "order_created",
        null,
        "pending",
        "c",
        "t",
        null,
        "staff",
        1,
        "Nhan vien",
      ],
      "23514",
    );
    await expectRejected(
      client,
      "status_changed actor customer bi tu choi",
      hist,
      [
        "status_changed",
        "pending",
        "confirmed",
        null,
        null,
        null,
        "customer",
        null,
        "Khách hàng",
      ],
      "23514",
    );
    await expectRejected(
      client,
      "status_changed thieu from_status bi tu choi",
      hist,
      ["status_changed", null, "confirmed", null, null, null, "staff", 1, "NV"],
      "23514",
    );
    await expectRejected(
      client,
      "dong staff thieu actor_staff_id bi tu choi",
      hist,
      [
        "status_changed",
        "pending",
        "confirmed",
        null,
        null,
        null,
        "staff",
        null,
        "NV",
      ],
      "23514",
    );
    await expectOk(client, "status_changed hop le", hist, [
      "status_changed",
      "pending",
      "confirmed",
      null,
      null,
      null,
      "staff",
      1,
      "NV",
    ]);
    await expectRejected(
      client,
      "refund_outcome_recorded co reason_code bi tu choi",
      hist,
      [
        "refund_outcome_recorded",
        "cancelled",
        "cancelled",
        "x",
        null,
        "refunded",
        "staff",
        1,
        "NV",
      ],
      "23514",
    );
    await expectOk(client, "refund_outcome_recorded hop le", hist, [
      "refund_outcome_recorded",
      "cancelled",
      "cancelled",
      null,
      null,
      "refunded",
      "staff",
      1,
      "NV",
    ]);

    await expectRejected(
      client,
      "event_type sai bi tu choi",
      hist,
      ["zzz", "pending", "confirmed", null, null, null, "staff", 1, "NV"],
      "23514",
    );
    await expectRejected(
      client,
      "actor_type sai bi tu choi",
      hist,
      [
        "status_changed",
        "pending",
        "confirmed",
        null,
        null,
        null,
        "zzz",
        1,
        "NV",
      ],
      "23514",
      "osh_actor_type_valid",
    );
    await expectRejected(
      client,
      "from_status sai bi tu choi",
      hist,
      [
        "status_changed",
        "zzz",
        "confirmed",
        null,
        null,
        null,
        "staff",
        1,
        "NV",
      ],
      "23514",
      "osh_from_status_valid",
    );
    await expectRejected(
      client,
      "to_status sai bi tu choi",
      hist,
      ["status_changed", "pending", "zzz", null, null, null, "staff", 1, "NV"],
      "23514",
      "osh_to_status_valid",
    );
    await expectRejected(
      client,
      "refund_outcome sai bi tu choi",
      hist,
      [
        "refund_outcome_recorded",
        "cancelled",
        "cancelled",
        null,
        null,
        "zzz",
        "staff",
        1,
        "NV",
      ],
      "23514",
      "osh_refund_outcome_valid",
    );
    await expectRejected(
      client,
      "status_changed co refund_outcome bi tu choi",
      hist,
      [
        "status_changed",
        "pending",
        "confirmed",
        null,
        null,
        "refunded",
        "staff",
        1,
        "NV",
      ],
      "23514",
      "osh_event_shape",
    );
    await expectRejected(
      client,
      "refund_outcome_recorded actor customer bi tu choi",
      hist,
      [
        "refund_outcome_recorded",
        "cancelled",
        "cancelled",
        null,
        null,
        "refunded",
        "customer",
        null,
        "Khách hàng",
      ],
      "23514",
      "osh_event_shape",
    );
    await expectRejected(
      client,
      "history.order_id khong ton tai bi tu choi",
      hist.replace("'smoke-o2'", "'khong-co'"),
      [
        "status_changed",
        "pending",
        "confirmed",
        null,
        null,
        null,
        "staff",
        1,
        "NV",
      ],
      "23503",
    );

    await client.query(hist, created);
    await expectRejected(
      client,
      "UPDATE Lich su bi trigger tu choi",
      "UPDATE order_status_history SET reason_text='x'",
      [],
      "23000",
    );
    await expectRejected(
      client,
      "DELETE Lich su bi trigger tu choi",
      "DELETE FROM order_status_history",
      [],
      "23000",
    );
  } finally {
    await client.query("ROLLBACK");
  }

  const after = await counts(client);
  report(
    "so dong khong doi",
    TABLES.every((t) => before[t] === after[t]),
    JSON.stringify(after),
  );
} finally {
  await client.end().catch(() => {});
}

if (failures > 0) {
  console.error(`${failures} ca loi`);
  process.exit(1);
}
console.log("Moi ca dat.");
