declare const dbTxBrand: unique symbol;

/** Transaction đang mở. Kiểu branded nên tầng ngoài `src/db` không dùng được như client Drizzle. */
export type DbTx = { readonly [dbTxBrand]: true };

export type RunInTransaction = <T>(
  work: (tx: DbTx) => Promise<T>,
) => Promise<T>;
