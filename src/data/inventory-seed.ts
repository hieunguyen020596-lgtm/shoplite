/** Tồn kho ban đầu cho mọi sản phẩm trong catalog. Không import products. */
export const inventorySeed: ReadonlyArray<{
  productId: string;
  stock: number;
}> = [
  { productId: "p001", stock: 25 },
  { productId: "p002", stock: 40 },
  { productId: "p003", stock: 8 },
  { productId: "p004", stock: 0 },
  { productId: "p005", stock: 15 },
  { productId: "p006", stock: 60 },
  { productId: "p007", stock: 100 },
  { productId: "p008", stock: 35 },
  { productId: "p009", stock: 22 },
  { productId: "p010", stock: 200 },
  { productId: "p011", stock: 3 },
  { productId: "p012", stock: 12 },
  { productId: "p013", stock: 0 },
  { productId: "p014", stock: 5 },
  { productId: "p015", stock: 18 },
  { productId: "p016", stock: 7 },
];
