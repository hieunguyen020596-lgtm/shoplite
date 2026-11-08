import { expect, test } from "@playwright/test";

test("khách hàng tương tác với danh sách yêu thích và thêm vào giỏ", async ({ page }) => {
  // 1. Vào trang sản phẩm
  await page.goto("/products");

  // 2. Thích sản phẩm "Bàn phím cơ KeyPro 75%"
  const keyproCard = page.getByTestId("product-card").filter({ hasText: "Bàn phím cơ KeyPro 75%" });
  const keyproHeart = keyproCard.getByRole("button", { name: /Thêm Bàn phím cơ KeyPro 75%/ });
  await keyproHeart.click();

  // Kiểm tra nút chuyển sang trạng thái đã thích và badge Header hiển thị 1
  await expect(keyproCard.getByRole("button", { name: /Bỏ thích Bàn phím cơ KeyPro 75%/ })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.getByTestId("wishlist-count")).toHaveText("1");

  // 3. Thích thêm sản phẩm "Tai nghe không dây SoundMax Pro"
  const soundmaxCard = page.getByTestId("product-card").filter({ hasText: "Tai nghe không dây SoundMax Pro" });
  await soundmaxCard.getByRole("button", { name: /Thêm Tai nghe không dây SoundMax Pro/ }).click();
  await expect(page.getByTestId("wishlist-count")).toHaveText("2");

  // 4. Bấm vào biểu tượng Wishlist trên Header để tới trang /wishlist
  await page.getByTestId("wishlist-badge").click();
  await expect(page).toHaveURL("/wishlist");

  // Kiểm tra cả 2 sản phẩm hiển thị trên trang /wishlist
  await expect(page.getByTestId("wishlist-item")).toHaveCount(2);
  await expect(page.getByText("Bàn phím cơ KeyPro 75%")).toBeVisible();
  await expect(page.getByText("Tai nghe không dây SoundMax Pro")).toBeVisible();

  // 5. Thêm sản phẩm vào giỏ từ wishlist
  const soundmaxRow = page.getByTestId("wishlist-item").filter({ hasText: "Tai nghe không dây SoundMax Pro" });
  await soundmaxRow.getByRole("button", { name: "Thêm vào giỏ" }).click();
  await expect(page.getByTestId("cart-count")).toHaveText("1");

  // 6. Xóa sản phẩm khỏi wishlist
  await soundmaxRow.getByRole("button", { name: /Xóa Tai nghe không dây SoundMax Pro khỏi danh sách yêu thích/ }).click();
  await expect(page.getByTestId("wishlist-item")).toHaveCount(1);
  await expect(page.getByTestId("wishlist-count")).toHaveText("1");

  // 7. Xóa nốt sản phẩm còn lại
  const keyproRow = page.getByTestId("wishlist-item").filter({ hasText: "Bàn phím cơ KeyPro 75%" });
  await keyproRow.getByRole("button", { name: /Xóa Bàn phím cơ KeyPro 75% khỏi danh sách yêu thích/ }).click();

  // Kiểm tra hiển thị trạng thái rỗng
  await expect(page.getByText("Danh sách yêu thích trống")).toBeVisible();
  await expect(page.getByTestId("wishlist-count")).toHaveCount(0);
});
