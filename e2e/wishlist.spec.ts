import { expect, test } from "@playwright/test";

const KEYPRO = "Bàn phím cơ KeyPro 75%";
const PODCAST = "Micro thu âm PodCast USB";

test("thích sản phẩm, giữ sau khi tải lại, thêm vào giỏ từ trang yêu thích rồi bỏ thích", async ({
  page,
}) => {
  await page.goto("/products?q=keypro");
  const card = page.getByTestId("product-card").filter({ hasText: KEYPRO });
  const heart = card.getByRole("button", { name: `Yêu thích ${KEYPRO}` });

  await heart.click();
  await expect(heart).toHaveAttribute("aria-pressed", "true");
  await expect(page).toHaveURL(/\/products\?q=keypro/); // không điều hướng sang trang chi tiết
  await expect(page.getByTestId("wishlist-count")).toHaveText("1");

  await page.reload();
  await expect(page.getByTestId("wishlist-count")).toHaveText("1");
  await expect(heart).toHaveAttribute("aria-pressed", "true");

  await page.getByRole("link", { name: /Yêu thích \(1 sản phẩm\)/ }).click();
  await expect(page).toHaveURL(/\/wishlist$/);
  const row = page.getByTestId("wishlist-item").filter({ hasText: KEYPRO });
  await row.getByRole("button", { name: "Thêm vào giỏ" }).click();
  await expect(page.getByTestId("cart-count")).toHaveText("1");
  await expect(row).toBeVisible();

  await row.getByRole("button", { name: `Bỏ thích ${KEYPRO}` }).click();
  await expect(page.getByText("Bạn chưa có sản phẩm yêu thích nào")).toBeVisible();
  await expect(page.getByTestId("wishlist-count")).toHaveCount(0);
});

test("thích và bỏ thích ở trang chi tiết sản phẩm", async ({ page }) => {
  await page.goto("/products/ban-phim-co-keypro-75");
  const heart = page.getByRole("button", { name: `Yêu thích ${KEYPRO}` });
  await expect(
    page.getByTestId("purchase-panel").getByRole("button", { name: /Yêu thích/ }),
  ).toHaveCount(0);

  await heart.click();
  await expect(heart).toHaveAttribute("aria-pressed", "true");
  await expect(heart).toContainText("Đã thích");
  await expect(page.getByTestId("wishlist-count")).toHaveText("1");

  await heart.click();
  await expect(heart).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByTestId("wishlist-count")).toHaveCount(0);
});

test("sản phẩm hết hàng vẫn nằm trong danh sách nhưng không thêm vào giỏ được", async ({
  page,
}) => {
  await page.goto("/products?q=podcast");
  await page
    .getByTestId("product-card")
    .filter({ hasText: PODCAST })
    .getByRole("button", { name: `Yêu thích ${PODCAST}` })
    .click();

  await page.goto("/wishlist");
  const row = page.getByTestId("wishlist-item").filter({ hasText: PODCAST });
  await expect(row.getByRole("button", { name: "Hết hàng" })).toBeDisabled();
});

test("đồng bộ danh sách yêu thích giữa hai tab", async ({ context }) => {
  const tab1 = await context.newPage();
  const tab2 = await context.newPage();
  await tab1.goto("/products?q=keypro");
  await tab2.goto("/");
  await expect(tab2.getByTestId("wishlist-count")).toHaveCount(0);

  await tab1.getByRole("button", { name: `Yêu thích ${KEYPRO}` }).click();
  await expect(tab2.getByTestId("wishlist-count")).toHaveText("1");
});

test("dữ liệu yêu thích hỏng trong localStorage không làm crash trang", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => window.localStorage.setItem("shoplite:wishlist", "abc"));
  await page.goto("/wishlist");
  await expect(page.getByText("Bạn chưa có sản phẩm yêu thích nào")).toBeVisible();
});

test("header không vỡ ở màn hình 390px và vẫn bấm được nút trái tim", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/products?q=keypro");

  const wishlistLink = page.getByRole("link", { name: /^Yêu thích/ });
  const cartLink = page.getByRole("link", { name: /Giỏ hàng/ });
  await expect(wishlistLink).toBeInViewport();
  await expect(cartLink).toBeInViewport();
  // Liệt kê phần tử trong header tràn khỏi màn hình (rỗng = không vỡ bố cục).
  const overflowing = await page.getByRole("banner").evaluate((header) => {
    const viewportWidth = document.documentElement.clientWidth;
    return [header, ...header.querySelectorAll("*")]
      .filter((el) => el.getBoundingClientRect().right > viewportWidth + 1)
      .map(
        (el) =>
          `${el.tagName.toLowerCase()} ${el.getAttribute("aria-label") ?? el.textContent?.trim().slice(0, 20)}`,
      );
  });
  expect(overflowing).toEqual([]);
  // Không link điều hướng nào bị cắt (nav không phải cuộn ngang).
  const navClipped = await page
    .getByRole("banner")
    .getByRole("navigation")
    .evaluate((nav) => nav.scrollWidth > nav.clientWidth);
  expect(navClipped).toBe(false);

  await page.getByRole("button", { name: `Yêu thích ${KEYPRO}` }).click();
  await expect(page.getByTestId("wishlist-count")).toHaveText("1");
});
