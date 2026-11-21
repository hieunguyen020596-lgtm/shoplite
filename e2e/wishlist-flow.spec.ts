import { expect, test } from "@playwright/test";

test("khách hàng tương tác với danh sách yêu thích và thêm vào giỏ", async ({
  page,
}) => {
  // 1. Vào trang sản phẩm
  await page.goto("/products");

  // 2. Thích sản phẩm "Bàn phím cơ KeyPro 75%"
  const keyproCard = page
    .getByTestId("product-card")
    .filter({ hasText: "Bàn phím cơ KeyPro 75%" });
  const keyproHeart = keyproCard.getByRole("button", {
    name: /Thêm Bàn phím cơ KeyPro 75%/,
  });
  await keyproHeart.click();

  // Kiểm tra nút chuyển sang trạng thái đã thích và badge Header hiển thị 1
  const keyproHeartActive = keyproCard.getByRole("button", {
    name: /Bỏ thích Bàn phím cơ KeyPro 75%/,
  });
  await expect(keyproHeartActive).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("wishlist-count")).toHaveText("1");

  // 2b. Bấm lại ♡ đó -> bỏ thích và badge biến mất
  await keyproHeartActive.click();
  await expect(page.getByTestId("wishlist-count")).toHaveCount(0);
  await expect(keyproHeart).toHaveAttribute("aria-pressed", "false");

  // Thích lại để tiếp tục luồng
  await keyproHeart.click();
  await expect(page.getByTestId("wishlist-count")).toHaveText("1");

  // 3. Thích thêm sản phẩm "Tai nghe không dây SoundMax Pro"
  const soundmaxCard = page
    .getByTestId("product-card")
    .filter({ hasText: "Tai nghe không dây SoundMax Pro" });
  await soundmaxCard
    .getByRole("button", { name: /Thêm Tai nghe không dây SoundMax Pro/ })
    .click();
  await expect(page.getByTestId("wishlist-count")).toHaveText("2");

  // 4. Bấm vào biểu tượng Wishlist trên Header để tới trang /wishlist
  await page.getByTestId("wishlist-badge").click();
  await expect(page).toHaveURL("/wishlist");

  // Kiểm tra cả 2 sản phẩm hiển thị trên trang /wishlist
  await expect(page.getByTestId("wishlist-item")).toHaveCount(2);
  await expect(page.getByText("Bàn phím cơ KeyPro 75%")).toBeVisible();
  await expect(page.getByText("Tai nghe không dây SoundMax Pro")).toBeVisible();

  // 5. Thêm sản phẩm vào giỏ từ wishlist
  const soundmaxRow = page
    .getByTestId("wishlist-item")
    .filter({ hasText: "Tai nghe không dây SoundMax Pro" });
  await soundmaxRow.getByRole("button", { name: "Thêm vào giỏ" }).click();
  await expect(page.getByTestId("cart-count")).toHaveText("1");

  // 6. Xóa sản phẩm khỏi wishlist
  await soundmaxRow
    .getByRole("button", {
      name: /Xóa Tai nghe không dây SoundMax Pro khỏi danh sách yêu thích/,
    })
    .click();
  await expect(page.getByTestId("wishlist-item")).toHaveCount(1);
  await expect(page.getByTestId("wishlist-count")).toHaveText("1");

  // 7. Xóa nốt sản phẩm còn lại
  const keyproRow = page
    .getByTestId("wishlist-item")
    .filter({ hasText: "Bàn phím cơ KeyPro 75%" });
  await keyproRow
    .getByRole("button", {
      name: /Xóa Bàn phím cơ KeyPro 75% khỏi danh sách yêu thích/,
    })
    .click();

  // Kiểm tra hiển thị trạng thái rỗng
  await expect(page.getByText("Danh sách yêu thích trống")).toBeVisible();
  await expect(page.getByTestId("wishlist-count")).toHaveCount(0);
});

test("kiểm thử đồng bộ đa tab, reload, sản phẩm hết hàng, localStorage hỏng, bàn phím và mobile 390px", async ({
  context,
}) => {
  const page = await context.newPage();
  await page.goto("/products");

  // Thích 3 sản phẩm bằng click & bàn phím (Enter)
  const cards = page.getByTestId("product-card");
  await cards.nth(0).locator("button[aria-pressed]").click();
  await cards.nth(1).locator("button[aria-pressed]").click();

  // Dùng focus + Enter cho sản phẩm thứ 3
  const thirdHeart = cards.nth(2).locator("button[aria-pressed]");
  await thirdHeart.focus();
  await page.keyboard.press("Enter");
  await expect(thirdHeart).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("wishlist-count")).toHaveText("3");

  // Tải lại trang -> vẫn còn 3
  await page.reload();
  await expect(page.getByTestId("wishlist-count")).toHaveText("3");

  // Mở tab 2 -> cùng hiển thị 3; bỏ thích ở tab 1 -> tab 2 tự động cập nhật
  const tab2 = await context.newPage();
  await tab2.goto("/wishlist");
  await expect(tab2.getByTestId("wishlist-count")).toHaveText("3");

  await cards.nth(2).locator("button[aria-pressed]").click();
  await expect(page.getByTestId("wishlist-count")).toHaveText("2");
  await expect(tab2.getByTestId("wishlist-count")).toHaveText("2");
  await tab2.close();

  // Sản phẩm hết hàng: Micro thu âm PodCast USB
  await page.goto("/products/micro-thu-am-podcast-usb");
  await page
    .getByRole("button", { name: /Thêm Micro thu âm PodCast USB/ })
    .click();
  await page.goto("/wishlist");
  const podRow = page
    .getByTestId("wishlist-item")
    .filter({ hasText: "Micro thu âm PodCast USB" });
  await expect(podRow).toBeVisible();
  await expect(podRow.getByRole("button", { name: "Hết hàng" })).toBeDisabled();

  // Giao diện Mobile 390px: Header không tràn ngang, nút tim bấm được
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/products");
  const noOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth,
  );
  expect(noOverflow).toBe(true);
  await page
    .getByTestId("product-card")
    .nth(3)
    .locator("button[aria-pressed]")
    .click();
  await expect(page.getByTestId("wishlist-count")).toHaveText("4");

  // Dữ liệu localStorage hỏng -> không crash, wishlist rỗng
  await page.evaluate(() => {
    window.localStorage.setItem("shoplite:wishlist", "abc");
  });
  await page.goto("/wishlist");
  await expect(page.getByText("Danh sách yêu thích trống")).toBeVisible();
  await expect(page.getByTestId("wishlist-count")).toHaveCount(0);
});
