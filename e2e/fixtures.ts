import { randomInt } from "node:crypto";
import {
  test as base,
  expect,
  type APIRequestContext,
  type Page,
} from "@playwright/test";
import pg from "pg";

/** Khách hàng hợp lệ theo checkout-schema (họ tên ≥ 2 ký tự, địa chỉ ≥ 10 ký tự). SĐT sinh riêng cho mỗi test. */
export const KHACH_MAU = {
  fullName: "Khách E2E",
  address: "12 Nguyễn Huệ, Quận 1, TP.HCM",
};

export type KhachHang = typeof KHACH_MAU & { phone: string };

/** SĐT riêng để không chạm giới hạn 3 đơn "Chờ xác nhận" trên mỗi số. */
export function soDienThoaiMoi(): string {
  return `09${String(randomInt(0, 100_000_000)).padStart(8, "0")}`;
}

/** IP riêng để không chạm giới hạn 10 đơn mỗi giờ trên mỗi IP. */
function ipMoi(): string {
  return `10.${randomInt(1, 255)}.${randomInt(1, 255)}.${randomInt(1, 255)}`;
}

export interface ShopHelpers {
  /** Mở trang chi tiết sản phẩm, chọn số lượng và bấm "Thêm vào giỏ" - đi qua giao diện như khách thật. */
  addToCart(slug: string, quantity?: number): Promise<void>;
  /** Điền form thanh toán bằng khách của test này, ghi đè từng trường nếu cần. */
  fillCheckout(customer?: Partial<KhachHang>): Promise<void>;
  /** Bấm "Đặt hàng", chờ trang chi tiết đơn và trả về mã đơn (SL-YYYYMMDD-XXXXXX). */
  placeOrder(): Promise<string>;
}

export interface KhoHelpers {
  /** Đặt Tồn kho thật trong shoplite_test. Fixture tự trả lại số cũ khi test kết thúc. */
  datTon(productId: string, stock: number): Promise<void>;
  docTon(productId: string): Promise<number>;
}

function createShopHelpers(page: Page, khach: KhachHang): ShopHelpers {
  return {
    async addToCart(slug, quantity = 1) {
      await page.goto(`/products/${slug}`);
      const panel = page.getByTestId("purchase-panel");
      for (let i = 1; i < quantity; i++) {
        await panel.getByRole("button", { name: "Tăng số lượng" }).click();
      }
      await expect(
        panel.getByRole("spinbutton", { name: "Số lượng" }),
      ).toHaveValue(String(quantity));
      await panel.getByRole("button", { name: "Thêm vào giỏ" }).click();
      await expect(
        panel.getByRole("button", { name: "Đã thêm" }),
      ).toBeVisible();
    },

    async fillCheckout(customer = {}) {
      const data = { ...khach, ...customer };
      await page.getByLabel(/Họ và tên/).fill(data.fullName);
      await page.getByLabel(/Số điện thoại/).fill(data.phone);
      await page.getByLabel(/Địa chỉ giao hàng/).fill(data.address);
    },

    async placeOrder() {
      await page.getByRole("button", { name: "Đặt hàng" }).click();
      await expect(page).toHaveURL(/\/orders\/SL-\d{8}-[0-9A-F]{6}\?placed=1/);
      return page.url().match(/SL-\d{8}-[0-9A-F]{6}/)![0];
    },
  };
}

/** Tạo sẵn một đơn "Chờ xác nhận" (1 × Cáp USB-C) qua API, trả về mã đơn. */
export async function createPendingOrder(
  request: APIRequestContext,
  phone = soDienThoaiMoi(),
): Promise<string> {
  const response = await request.post("/api/orders", {
    data: {
      customer: { ...KHACH_MAU, phone },
      shippingMethod: "standard",
      paymentMethod: "cod",
      items: [{ productId: "p010", quantity: 1 }],
    },
  });
  expect(response.status()).toBe(201);
  return ((await response.json()) as { id: string }).id;
}

// Tham số thứ hai của fixture đặt tên `provide` thay vì `use` như tài liệu Playwright:
// ESLint của Next (react-hooks/rules-of-hooks) nhầm `use(...)` là React hook.
export const test = base.extend<{
  khach: KhachHang;
  shop: ShopHelpers;
  kho: KhoHelpers;
}>({
  // Cả trình duyệt và fixture `request` của test này cùng mang một IP riêng (config đặt TRUSTED_PROXY_HOPS=1).
  extraHTTPHeaders: async ({}, provide) => {
    await provide({ "x-forwarded-for": ipMoi() });
  },

  khach: async ({}, provide) => {
    await provide({ ...KHACH_MAU, phone: soDienThoaiMoi() });
  },

  shop: async ({ page, khach }, provide) => {
    await provide(createShopHelpers(page, khach));
  },

  kho: async ({}, provide) => {
    const client = new pg.Client({
      connectionString: process.env.TEST_DATABASE_URL,
    });
    await client.connect();
    const goc = new Map<string, number>();
    const docTon = async (productId: string) => {
      const { rows } = await client.query<{ stock: number }>(
        "SELECT stock FROM inventory WHERE product_id = $1",
        [productId],
      );
      return rows[0].stock;
    };
    try {
      const { rows } = await client.query<{ name: string }>(
        "SELECT current_database() AS name",
      );
      if (rows[0].name !== "shoplite_test") {
        throw new Error("Fixture kho chỉ được chạy trên shoplite_test");
      }
      await provide({
        docTon,
        async datTon(productId, stock) {
          if (!goc.has(productId)) goc.set(productId, await docTon(productId));
          await client.query(
            "UPDATE inventory SET stock = $1 WHERE product_id = $2",
            [stock, productId],
          );
        },
      });
      for (const [productId, stock] of goc) {
        await client.query(
          "UPDATE inventory SET stock = $1 WHERE product_id = $2",
          [stock, productId],
        );
      }
    } finally {
      await client.end();
    }
  },
});

export { expect };
