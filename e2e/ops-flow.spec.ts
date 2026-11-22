import { expect, test } from "@playwright/test";

const ADMIN_PASSCODE = process.env.ADMIN_PASSCODE ?? "e2e-admin-passcode";

test("luồng Epics 2-4 E2E: đặt hàng trừ kho, timeline 4 bước, admin duyệt/hủy/hoàn kho và responsive 390px", async ({
  page,
  request,
}) => {
  // 1. Bảo vệ route /admin/orders khi chưa đăng nhập
  await page.goto("/admin/orders");
  await expect(page).toHaveURL(/\/admin\/login$/);
  await expect(
    page.getByRole("heading", { name: "Đăng nhập quản trị" }),
  ).toBeVisible();

  // 2. Lấy tồn kho ban đầu của p001 và đặt 1 đơn để tự hủy + kiểm tra hoàn kho
  const initialProduct = await (
    await request.get("/api/products/ban-phim-co-keypro-75")
  ).json();
  const initialStock = initialProduct.stock as number;
  expect(initialStock).toBeGreaterThan(2);

  await page.goto("/products/ban-phim-co-keypro-75");
  await page
    .getByTestId("purchase-panel")
    .getByRole("button", { name: "Mua ngay" })
    .click();
  await expect(page).toHaveURL(/\/checkout$/, { timeout: 15_000 });

  await page.getByLabel(/Họ và tên/).fill("Trần E2E Khách");
  await page.getByLabel(/Số điện thoại/).fill("0912345678");
  await page.getByLabel(/Địa chỉ giao hàng/).fill("10 Lê Lợi, Quận 1, TP.HCM");
  await page.getByRole("button", { name: "Đặt hàng" }).click();

  await expect(page).toHaveURL(/\/orders\/SL-\d{8}-[0-9A-F]{6}\?placed=1/, {
    timeout: 15_000,
  });
  const firstOrderId = page.url().match(/SL-\d{8}-[0-9A-F]{6}/)![0];

  await expect(
    page.getByRole("region", { name: "Tiến trình đơn hàng" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Làm mới trạng thái" }),
  ).toBeVisible();

  // Tồn kho p001 đã giảm initialStock -> initialStock - 1
  const afterOrderProducts = await (
    await request.get("/api/products/ban-phim-co-keypro-75")
  ).json();
  expect(afterOrderProducts.stock).toBe(initialStock - 1);

  // Khách tự hủy ở pending -> Timeline chuyển hủy bởi Khách hàng & hoàn kho về initialStock
  await page.getByRole("button", { name: "Hủy đơn hàng" }).click();
  await page.getByRole("button", { name: "Xác nhận hủy" }).click();
  await expect(page.getByText("Đơn hàng đã bị hủy bởi Khách hàng")).toBeVisible(
    { timeout: 15_000 },
  );

  const afterCustomerCancel = await (
    await request.get("/api/products/ban-phim-co-keypro-75")
  ).json();
  expect(afterCustomerCancel.stock).toBe(initialStock);

  // 3. Khách tạo đơn thứ 2 để admin duyệt -> bàn giao vận chuyển -> hủy từ shipping -> xác nhận nhận hàng hoàn (+kho)
  await page.goto("/products/ban-phim-co-keypro-75");
  await page
    .getByTestId("purchase-panel")
    .getByRole("button", { name: "Mua ngay" })
    .click();
  await page.getByLabel(/Họ và tên/).fill("Nguyễn Vận Hành");
  await page.getByLabel(/Số điện thoại/).fill("0988777666");
  await page.getByLabel(/Địa chỉ giao hàng/).fill("25 Nguyễn Trãi, Hà Nội");
  await page.getByRole("button", { name: "Đặt hàng" }).click();

  await expect(page).toHaveURL(/\/orders\/SL-\d{8}-[0-9A-F]{6}\?placed=1/, {
    timeout: 15_000,
  });
  const secondOrderId = page.url().match(/SL-\d{8}-[0-9A-F]{6}/)![0];
  expect(secondOrderId).not.toBe(firstOrderId);

  // 4. Đăng nhập Admin (sai mật khẩu -> đúng mật khẩu)
  await page.goto("/admin/login");
  await page.getByLabel("Mật khẩu quản trị").fill("sai-mat-khau");
  await page.getByRole("button", { name: "Đăng nhập vận hành" }).click();
  await expect(page.getByRole("alert")).toBeVisible();

  await page.getByLabel("Mật khẩu quản trị").fill(ADMIN_PASSCODE);
  await page.getByRole("button", { name: "Đăng nhập vận hành" }).click();
  await expect(page).toHaveURL(/\/admin\/orders/, { timeout: 15_000 });

  // 5. Kiểm tra mobile 390px không tràn ngang trên /admin/orders
  await page.setViewportSize({ width: 390, height: 844 });
  const adminCard = page.locator("article", { hasText: secondOrderId });
  await expect(adminCard).toBeVisible();
  await expect(adminCard.getByRole("status")).toContainText(
    "Đã giữ 1 cho đơn này",
  );
  await expect(adminCard.getByRole("status")).toContainText(
    `Còn cho đơn mới: ${initialStock - 1}`,
  );

  const mobileOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(mobileOverflow).toBe(false);

  // 6. Duyệt 1 bước -> Bàn giao giao hàng kèm mã vận đơn -> Hủy từ shipping -> Hoàn kho thủ công
  await adminCard.getByRole("button", { name: "Xác nhận đơn" }).click();
  await expect(
    adminCard.getByRole("button", { name: "Bàn giao giao hàng" }),
  ).toBeVisible();

  await adminCard
    .getByLabel("Ghi chú vận chuyển / mã vận đơn (tùy chọn)")
    .fill("GHN-E2E-8899");
  await adminCard.getByRole("button", { name: "Bàn giao giao hàng" }).click();
  await expect(adminCard.getByText("Ghi chú: GHN-E2E-8899")).toBeVisible();

  // Mở hộp thoại hủy đơn đang giao -> cảnh báo vàng -> chọn chip + xác nhận hủy
  await adminCard.getByRole("button", { name: "Hủy đơn" }).click();
  const cancelDialog = page.getByRole("dialog");
  await expect(cancelDialog).toContainText(
    "Hủy đơn đang giao sẽ không tự động cộng lại tồn kho",
  );
  await cancelDialog
    .getByRole("button", { name: "Giao hàng thất bại / Khách không nhận" })
    .click();
  await cancelDialog.getByRole("button", { name: "Xác nhận hủy đơn" }).click();

  await expect(adminCard.getByTestId("restock-pending-badge")).toBeVisible();
  // Trước khi bấm hoàn kho, tồn kho vẫn là initialStock - 1
  const beforeRestock = await (
    await request.get("/api/products/ban-phim-co-keypro-75")
  ).json();
  expect(beforeRestock.stock).toBe(initialStock - 1);

  await adminCard
    .getByRole("button", { name: "Xác nhận đã nhận hàng hoàn (+kho)" })
    .click();
  await expect(adminCard.getByTestId("restocked-badge")).toBeVisible();

  // Sau khi hoàn kho, tồn kho trở lại initialStock
  const afterRestock = await (
    await request.get("/api/products/ban-phim-co-keypro-75")
  ).json();
  expect(afterRestock.stock).toBe(initialStock);

  // 7. Khách xem lại /orders/[id] trên mobile 390px -> thấy trạng thái hủy bởi Cửa hàng + lý do + không tràn ngang
  await page.goto(`/orders/${secondOrderId}`);
  await expect(page.getByText("Đơn hàng đã bị hủy bởi Cửa hàng")).toBeVisible();
  await expect(
    page.getByText(/Lý do: Giao hàng thất bại \/ Khách không nhận/),
  ).toBeVisible();
  const detailOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(detailOverflow).toBe(false);
});
