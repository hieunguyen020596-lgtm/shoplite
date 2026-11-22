// Tạo đơn hàng mẫu ở đủ các trạng thái để thử giao diện nhân viên.
// Cách dùng: npm run seed:orders        (thêm đơn mẫu, bỏ qua đơn đã có)
//            npm run seed:orders -- --reset   (xóa toàn bộ đơn rồi tạo lại)
// Ghi vào ORDERS_FILE (mặc định storage/orders.json). Chỉ dùng khi phát triển.
import { promises as fs } from "node:fs";
import path from "node:path";
import { products } from "../src/data/products.ts";

const file =
  process.env.ORDERS_FILE ?? path.join(process.cwd(), "storage", "orders.json");
const reset = process.argv.includes("--reset");

const HOUR = 3_600_000;
const now = Date.now();
const ago = (hours) => new Date(now - hours * HOUR).toISOString();

const find = (id) => products.find((p) => p.id === id);

function makeOrder({
  code,
  status,
  hoursAgo,
  updatedHoursAgo,
  customer,
  shippingMethod,
  paymentMethod,
  items,
}) {
  const lines = items.map(([productId, quantity]) => {
    const p = find(productId);
    return {
      productId,
      slug: p.slug,
      name: p.name,
      image: p.image,
      unitPrice: p.price,
      quantity,
      lineTotal: p.price * quantity,
    };
  });
  const subtotal = lines.reduce((sum, l) => sum + l.lineTotal, 0);
  const shippingFee =
    shippingMethod === "express" ? 60_000 : subtotal >= 500_000 ? 0 : 30_000;
  const created = new Date(now - hoursAgo * HOUR);
  const ymd = created.toISOString().slice(0, 10).replaceAll("-", "");
  return {
    id: `SL-${ymd}-${code}`,
    status,
    createdAt: created.toISOString(),
    updatedAt: ago(updatedHoursAgo ?? hoursAgo),
    customer,
    shippingMethod,
    paymentMethod,
    items: lines,
    subtotal,
    shippingFee,
    total: subtotal + shippingFee,
  };
}

const people = {
  an: {
    fullName: "Nguyễn Văn An",
    phone: "0912345678",
    email: "an@example.com",
    address: "12 Lê Lợi, Quận 1, TP. Hồ Chí Minh",
    note: "Gọi trước khi giao",
  },
  binh: {
    fullName: "Trần Thị Bình",
    phone: "0987654321",
    address: "45 Nguyễn Huệ, Hải Châu, Đà Nẵng",
  },
  chi: {
    fullName: "Lê Minh Chi",
    phone: "0356789012",
    email: "chi.le@example.com",
    address: "99 Hai Bà Trưng, TP. Huế",
  },
  dung: {
    fullName: "Phạm Quốc Dũng",
    phone: "0765432109",
    address: "7 Trần Phú, Nha Trang, Khánh Hòa",
    note: "Giao giờ hành chính",
  },
  em: {
    fullName: "Võ Thanh Em",
    phone: "0834567890",
    address: "210 Điện Biên Phủ, Bình Thạnh, TP. Hồ Chí Minh",
  },
  giang: {
    fullName: "Đặng Hương Giang",
    phone: "0903456789",
    email: "giang@example.com",
    address: "88 Cầu Giấy, Hà Nội",
  },
};

const orders = [
  // Chờ xác nhận: nhiều đơn, mới/cũ khác nhau (đơn cũ nhất ở trên cùng của Hàng đợi)
  {
    code: "A1B2C3",
    status: "pending",
    hoursAgo: 22,
    customer: people.an,
    shippingMethod: "standard",
    paymentMethod: "cod",
    items: [
      ["p001", 1],
      ["p007", 2],
    ],
  },
  {
    code: "D4E5F6",
    status: "pending",
    hoursAgo: 9,
    customer: people.binh,
    shippingMethod: "express",
    paymentMethod: "bank_transfer",
    items: [["p005", 1]],
  },
  {
    code: "G7H8J9",
    status: "pending",
    hoursAgo: 3,
    customer: people.chi,
    shippingMethod: "standard",
    paymentMethod: "cod",
    items: [["p010", 3]],
  },
  {
    code: "K1L2M3",
    status: "pending",
    hoursAgo: 0.5,
    customer: people.dung,
    shippingMethod: "standard",
    paymentMethod: "bank_transfer",
    items: [
      ["p006", 1],
      ["p008", 1],
    ],
  },
  // Đã xác nhận
  {
    code: "N4P5Q6",
    status: "confirmed",
    hoursAgo: 30,
    updatedHoursAgo: 26,
    customer: people.em,
    shippingMethod: "standard",
    paymentMethod: "cod",
    items: [["p002", 1]],
  },
  {
    code: "R7S8T9",
    status: "confirmed",
    hoursAgo: 12,
    updatedHoursAgo: 10,
    customer: people.giang,
    shippingMethod: "express",
    paymentMethod: "bank_transfer",
    items: [["p003", 1]],
  },
  // Đang giao
  {
    code: "U1V2W3",
    status: "shipping",
    hoursAgo: 48,
    updatedHoursAgo: 20,
    customer: people.an,
    shippingMethod: "standard",
    paymentMethod: "cod",
    items: [["p009", 2]],
  },
  {
    code: "X4Y5Z6",
    status: "shipping",
    hoursAgo: 36,
    updatedHoursAgo: 8,
    customer: people.binh,
    shippingMethod: "express",
    paymentMethod: "cod",
    items: [
      ["p001", 1],
      ["p010", 2],
    ],
  },
  // Đã giao
  {
    code: "B7C8D9",
    status: "delivered",
    hoursAgo: 120,
    updatedHoursAgo: 72,
    customer: people.chi,
    shippingMethod: "standard",
    paymentMethod: "bank_transfer",
    items: [
      ["p005", 1],
      ["p007", 1],
    ],
  },
  {
    code: "E1F2G3",
    status: "delivered",
    hoursAgo: 200,
    updatedHoursAgo: 150,
    customer: people.dung,
    shippingMethod: "standard",
    paymentMethod: "cod",
    items: [["p008", 2]],
  },
  // Đã hủy
  {
    code: "H4J5K6",
    status: "cancelled",
    hoursAgo: 60,
    updatedHoursAgo: 58,
    customer: people.em,
    shippingMethod: "standard",
    paymentMethod: "cod",
    items: [["p006", 1]],
  },
  // Giao thất bại
  {
    code: "L7M8N9",
    status: "failed",
    hoursAgo: 96,
    updatedHoursAgo: 50,
    customer: people.giang,
    shippingMethod: "express",
    paymentMethod: "cod",
    items: [["p002", 2]],
  },
].map(makeOrder);

let existing = [];
if (!reset) {
  try {
    const data = JSON.parse(await fs.readFile(file, "utf8"));
    if (Array.isArray(data)) existing = data;
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

const known = new Set(existing.map((o) => o.id));
const fresh = orders.filter((o) => !known.has(o.id));
// Mã đơn gắn với ngày tạo, nên qua ngày mới sẽ sinh mã mới; tránh trùng 6 ký tự cuối.
const suffixes = new Set(existing.map((o) => o.id.slice(-6)));
const toAdd = fresh.filter((o) => !suffixes.has(o.id.slice(-6)));

await fs.mkdir(path.dirname(file), { recursive: true });
const tmp = `${file}.tmp`;
await fs.writeFile(
  tmp,
  JSON.stringify([...existing, ...toAdd], null, 2),
  "utf8",
);
await fs.rename(tmp, file);

console.log(
  `Đã thêm ${toAdd.length} đơn mẫu vào ${path.relative(process.cwd(), file)} (tổng ${existing.length + toAdd.length}).`,
);
const byStatus = Object.groupBy(toAdd, (o) => o.status);
for (const [status, list] of Object.entries(byStatus)) {
  console.log(`  ${status}: ${list.map((o) => o.id).join(", ")}`);
}
console.log(
  "SĐT khách mẫu: 0912345678, 0987654321, 0356789012, 0765432109, 0834567890, 0903456789",
);
