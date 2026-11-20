import { expect, test } from "@playwright/test";

const KEYBOARD = "Bàn phím cơ KeyPro 75%";
const WISHLIST_STORAGE_KEY = "shoplite:wishlist";

test("khách thích sản phẩm, giữ sau khi tải lại, thêm vào giỏ từ /wishlist rồi bỏ thích", async ({
  page,
}) => {
  await page.goto("/products?q=ban+phim+co");
  const card = page.getByTestId("product-card").filter({ hasText: KEYBOARD });

  // Thích trên thẻ sản phẩm -> badge header = 1
  await card.getByRole("button", { name: `Thêm ${KEYBOARD} vào danh sách yêu thích` }).click();
  await expect(
    card.getByRole("button", { name: `Bỏ ${KEYBOARD} khỏi danh sách yêu thích` }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("wishlist-count")).toHaveText("1");

  // Tải lại trang vẫn còn
  await page.reload();
  await expect(page.getByTestId("wishlist-count")).toHaveText("1");

  // Vào /wishlist, thêm vào giỏ -> badge giỏ tăng, sản phẩm vẫn trong danh sách
  await page.getByRole("link", { name: /Danh sách yêu thích/ }).click();
  await expect(page).toHaveURL(/\/wishlist$/);
  const row = page.getByTestId("wishlist-item").filter({ hasText: KEYBOARD });
  await row.getByRole("button", { name: "Thêm vào giỏ" }).click();
  await expect(page.getByTestId("cart-count")).toHaveText("1");
  await expect(row).toBeVisible();

  // Bỏ thích -> trạng thái trống, badge mất
  await row.getByRole("button", { name: `Bỏ ${KEYBOARD} khỏi danh sách yêu thích` }).click();
  await expect(page.getByText("Danh sách yêu thích đang trống")).toBeVisible();
  await expect(page.getByTestId("wishlist-count")).toHaveCount(0);
});

test("dữ liệu wishlist hỏng trong localStorage không làm crash trang", async ({ page }) => {
  await page.goto("/wishlist");
  await page.evaluate((key) => window.localStorage.setItem(key, "abc"), WISHLIST_STORAGE_KEY);
  await page.reload();

  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Danh sách yêu thích");
  await expect(page.getByText("Danh sách yêu thích đang trống")).toBeVisible();
  await expect(page.getByTestId("wishlist-count")).toHaveCount(0);
});
