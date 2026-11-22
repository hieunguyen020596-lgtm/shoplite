import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AdminOrderListResult } from "@/features/orders/order-service";
import type { Order } from "@/features/orders/types";

const testState = vi.hoisted(() => ({
  pushMock: vi.fn(),
  replaceMock: vi.fn(),
  refreshMock: vi.fn(),
  pathname: "/admin/orders" as string | null,
  listAdminOrdersMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: testState.pushMock,
    replace: testState.replaceMock,
    refresh: testState.refreshMock,
  }),
  usePathname: () => testState.pathname,
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: ReactNode;
    [key: string]: unknown;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("@/features/orders/server", () => ({
  orderService: {
    listAdminOrders: (...args: unknown[]) =>
      testState.listAdminOrdersMock(...args),
  },
}));

import AdminLoginPage from "@/app/admin/login/page";
import AdminOrdersPage, {
  dynamic as adminOrdersDynamic,
} from "@/app/admin/orders/page";
import { StorefrontChrome } from "@/components/layout/storefront-chrome";
import {
  AdminOrdersView,
  CancelOrderDialog,
  ReservedStockIndicator,
  RestockStatusBadge,
} from "./admin-orders-view";

function makeOrder(overrides: Partial<Order> = {}): Order {
  const id = overrides.id ?? "SL-20261121-A1B2C3";
  const status = overrides.status ?? "pending";
  const createdAt = overrides.createdAt ?? "2026-11-21T01:05:00.000Z";
  return {
    id,
    status,
    createdAt,
    updatedAt: overrides.updatedAt ?? createdAt,
    customer: overrides.customer ?? {
      fullName: "Anh Minh",
      phone: "0912345678",
      address: "123 Lê Lợi, Quận 1, TP.HCM",
    },
    shippingMethod: overrides.shippingMethod ?? "standard",
    paymentMethod: overrides.paymentMethod ?? "cod",
    items: overrides.items ?? [
      {
        productId: "p001",
        slug: "ban-phim-co-keypro-75",
        name: "Bàn phím cơ KeyPro 75%",
        image: {
          emoji: "⌨️",
          from: "from-indigo-500",
          to: "to-purple-600",
        },
        unitPrice: 1490000,
        quantity: 2,
        lineTotal: 2980000,
      },
    ],
    subtotal: overrides.subtotal ?? 2980000,
    shippingFee: overrides.shippingFee ?? 0,
    total: overrides.total ?? 2980000,
    statusHistory: overrides.statusHistory ?? [
      {
        status,
        at: createdAt,
        actor: "customer",
        action: "transition",
      },
    ],
    ...(overrides.inventoryRestocked !== undefined
      ? { inventoryRestocked: overrides.inventoryRestocked }
      : {}),
  };
}

function makeListResult(
  orders: Order[],
  overrides: Partial<AdminOrderListResult> = {},
): AdminOrderListResult {
  const counts = {
    all: orders.length,
    pending: orders.filter((o) => o.status === "pending").length,
    confirmed: orders.filter((o) => o.status === "confirmed").length,
    shipping: orders.filter((o) => o.status === "shipping").length,
    delivered: orders.filter((o) => o.status === "delivered").length,
    cancelled: orders.filter((o) => o.status === "cancelled").length,
    ...overrides.counts,
  };
  return {
    orders,
    counts,
    availableStockByProductId: overrides.availableStockByProductId ?? {
      p001: 3,
      p002: 8,
      p003: 0,
    },
  };
}

describe("Giao diện hàng chờ /admin/orders, tồn kho giữ chỗ inline & thao tác đơn hàng", () => {
  beforeEach(() => {
    testState.pushMock.mockReset();
    testState.replaceMock.mockReset();
    testState.refreshMock.mockReset();
    testState.listAdminOrdersMock.mockReset();
    testState.pathname = "/admin/orders";
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  describe("1. OrderFilterTabs & AdminOrderSearchBar URL sync, skeleton, FIFO hint & EmptyState", () => {
    it("đồng bộ tab lọc & tìm kiếm với router.replace, hỗ trợ nút xóa nhanh giữ nguyên status, hiện 3 skeleton card và gợi ý FIFO trên tab pending", async () => {
      const pendingOrder = makeOrder({
        id: "SL-20261121-FIFO01",
        status: "pending",
      });
      const initialData = makeListResult([pendingOrder], {
        counts: {
          all: 5,
          pending: 2,
          confirmed: 1,
          shipping: 1,
          delivered: 1,
          cancelled: 0,
        },
      });

      let resolveTabFetch!: (value: Response) => void;
      const fetchMock = vi
        .fn()
        .mockImplementationOnce(
          () =>
            new Promise<Response>((resolve) => {
              resolveTabFetch = resolve;
            }),
        )
        .mockResolvedValue(
          new Response(JSON.stringify(initialData), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
        );
      vi.stubGlobal("fetch", fetchMock);
      const user = userEvent.setup();

      const { container } = render(
        <AdminOrdersView initialData={initialData} />,
      );

      // Không dùng bảng <table>
      expect(container.querySelector("table")).toBeNull();

      // Ban đầu ở tab "all": không hiển thị gợi ý FIFO
      expect(screen.queryByTestId("fifo-sort-hint")).not.toBeInTheDocument();

      const pendingTab = screen.getByRole("button", {
        name: /Chờ xác nhận/i,
      });
      expect(pendingTab).toHaveClass("min-h-11");
      expect(pendingTab).toHaveAttribute("aria-pressed", "false");

      // Chuyển sang tab "pending"
      await user.click(pendingTab);

      expect(pendingTab).toHaveAttribute("aria-pressed", "true");
      expect(testState.replaceMock).toHaveBeenCalledWith(
        "/admin/orders?status=pending",
        { scroll: false },
      );
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/admin/orders?status=pending",
        expect.objectContaining({ method: "GET" }),
      );

      // Hiển thị gợi ý FIFO khi tab pending đang chọn
      expect(screen.getByTestId("fifo-sort-hint")).toHaveTextContent(/FIFO/i);

      // Hiển thị 3 thẻ skeleton animate-pulse trong lúc đang tải
      const skeletonContainer = screen.getByTestId("admin-orders-skeleton");
      expect(skeletonContainer).toBeInTheDocument();
      const skeletonCards = within(skeletonContainer).getAllByTestId(
        "admin-order-skeleton-card",
      );
      expect(skeletonCards).toHaveLength(3);
      for (const card of skeletonCards) {
        expect(card).toHaveClass("animate-pulse");
      }

      resolveTabFetch(
        new Response(JSON.stringify(initialData), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

      expect(await screen.findByText("SL-20261121-FIFO01")).toBeInTheDocument();

      // Tìm kiếm bằng Enter trên AdminOrderSearchBar
      const searchInput = screen.getByRole("searchbox", {
        name: "Tìm kiếm đơn hàng",
      });
      expect(searchInput).toHaveClass("min-h-11");

      await user.type(searchInput, "minh{Enter}");

      expect(testState.replaceMock).toHaveBeenLastCalledWith(
        "/admin/orders?status=pending&q=minh",
        { scroll: false },
      );
      expect(fetchMock).toHaveBeenLastCalledWith(
        "/api/admin/orders?status=pending&q=minh",
        expect.objectContaining({ method: "GET" }),
      );

      // Nút xóa nhanh ✕ xóa ?q= nhưng giữ nguyên ?status=pending
      const clearBtn = screen.getByRole("button", {
        name: "Xóa từ khóa tìm kiếm",
      });
      expect(clearBtn).toHaveClass("min-h-11", "min-w-11");

      await user.click(clearBtn);

      expect(searchInput).toHaveValue("");
      expect(testState.replaceMock).toHaveBeenLastCalledWith(
        "/admin/orders?status=pending",
        { scroll: false },
      );
      expect(fetchMock).toHaveBeenLastCalledWith(
        "/api/admin/orders?status=pending",
        expect.objectContaining({ method: "GET" }),
      );
    });

    it("hiển thị EmptyState kèm nút Xóa bộ lọc (min-h-11) đặt lại về /admin/orders?status=all khi không có đơn hàng", async () => {
      const emptyResult = makeListResult([], {
        counts: {
          all: 0,
          pending: 0,
          confirmed: 0,
          shipping: 0,
          delivered: 0,
          cancelled: 0,
        },
      });
      const restoredOrder = makeOrder({ id: "SL-20261121-REST01" });
      const fetchMock = vi.fn().mockResolvedValue(
        new Response(JSON.stringify(makeListResult([restoredOrder])), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
      vi.stubGlobal("fetch", fetchMock);
      const user = userEvent.setup();

      render(
        <AdminOrdersView
          initialData={emptyResult}
          initialStatus="pending"
          initialQuery="khong-co"
        />,
      );

      expect(
        screen.getByText(/Chưa có đơn hàng nào trong hệ thống/i),
      ).toBeInTheDocument();

      const resetBtn = screen.getByRole("button", { name: "Xóa bộ lọc" });
      expect(resetBtn).toHaveClass("min-h-11");

      await user.click(resetBtn);

      expect(testState.replaceMock).toHaveBeenCalledWith(
        "/admin/orders?status=all",
        { scroll: false },
      );
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/admin/orders?status=all",
        expect.objectContaining({ method: "GET" }),
      );
      expect(await screen.findByText("SL-20261121-REST01")).toBeInTheDocument();
    });

    it("tự động tải danh sách kèm skeleton khi không truyền initialData và hỗ trợ tìm kiếm debounce không cần nhấn Enter", async () => {
      const order = makeOrder({ id: "SL-20261121-AUTO01", status: "pending" });
      const fetchMock = vi.fn().mockResolvedValue(
        new Response(JSON.stringify(makeListResult([order])), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
      vi.stubGlobal("fetch", fetchMock);
      const user = userEvent.setup();

      render(<AdminOrdersView />);

      expect(screen.getByTestId("admin-orders-skeleton")).toBeInTheDocument();
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/admin/orders?status=all",
        expect.objectContaining({ method: "GET" }),
      );

      expect(await screen.findByText("SL-20261121-AUTO01")).toBeInTheDocument();

      const searchInput = screen.getByRole("searchbox", {
        name: "Tìm kiếm đơn hàng",
      });
      await user.type(searchInput, "0912");

      await vi.waitFor(() => {
        expect(testState.replaceMock).toHaveBeenLastCalledWith(
          "/admin/orders?status=all&q=0912",
          { scroll: false },
        );
        expect(fetchMock).toHaveBeenLastCalledWith(
          "/api/admin/orders?status=all&q=0912",
          expect.objectContaining({ method: "GET" }),
        );
      });
    });
  });

  describe("2. ReservedStockIndicator thresholds (>5, 1..5, 0) & status visibility", () => {
    it("hiển thị đúng 3 bậc màu (>5 emerald, 1..5 amber, 0 rose) trên pending/confirmed/shipping và ẩn trên delivered/cancelled", () => {
      const { rerender } = render(
        <ReservedStockIndicator
          orderStatus="pending"
          quantity={2}
          availableStock={8}
        />,
      );

      const okStatus = screen.getByRole("status");
      expect(okStatus).toHaveClass(
        "bg-emerald-50",
        "text-emerald-700",
        "ring-emerald-200",
      );
      expect(okStatus).toHaveTextContent("✓ Đã giữ 2 cho đơn này");
      expect(okStatus).toHaveTextContent("Còn cho đơn mới: 8");

      rerender(
        <ReservedStockIndicator
          orderStatus="confirmed"
          quantity={1}
          availableStock={5}
        />,
      );
      const lowStatus = screen.getByRole("status");
      expect(lowStatus).toHaveClass(
        "bg-amber-50",
        "text-amber-800",
        "ring-amber-200",
      );
      expect(lowStatus).toHaveTextContent("✓ Đã giữ 1 cho đơn này");
      expect(lowStatus).toHaveTextContent("Còn cho đơn mới: 5");

      rerender(
        <ReservedStockIndicator
          orderStatus="shipping"
          quantity={3}
          availableStock={0}
        />,
      );
      const zeroStatus = screen.getByRole("status");
      expect(zeroStatus).toHaveClass(
        "bg-rose-50",
        "text-rose-700",
        "ring-rose-200",
      );
      expect(zeroStatus).toHaveTextContent("✓ Đã giữ 3 cho đơn này");
      expect(zeroStatus).toHaveTextContent("Còn cho đơn mới: 0");

      rerender(
        <ReservedStockIndicator
          orderStatus="delivered"
          quantity={2}
          availableStock={0}
        />,
      );
      expect(screen.queryByRole("status")).not.toBeInTheDocument();

      rerender(
        <ReservedStockIndicator
          orderStatus="cancelled"
          quantity={2}
          availableStock={0}
        />,
      );
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
    });
  });

  describe("3. 1-step progressions with expectedStatus & double-click prevention", () => {
    it("chuyển đơn từng bước (pending -> confirmed -> shipping kèm mã vận đơn -> delivered) gửi kèm expectedStatus và khóa nút chống bấm đúp", async () => {
      const order = makeOrder({
        id: "SL-20261121-STEP01",
        status: "pending",
      });

      let resolveConfirm!: (value: Response) => void;
      const fetchMock = vi
        .fn()
        .mockImplementationOnce(
          () =>
            new Promise<Response>((resolve) => {
              resolveConfirm = resolve;
            }),
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              order: {
                ...order,
                status: "shipping",
                statusHistory: [
                  ...(order.statusHistory ?? []),
                  {
                    status: "shipping",
                    at: "2026-11-21T03:00:00.000Z",
                    actor: "staff",
                    action: "transition",
                    note: "Mã vận đơn GHN-882910",
                  },
                ],
              },
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          ),
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              order: {
                ...order,
                status: "delivered",
              },
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          ),
        );
      vi.stubGlobal("fetch", fetchMock);
      const user = userEvent.setup();

      render(<AdminOrdersView initialData={makeListResult([order])} />);

      // Bước 1: pending -> confirmed
      const confirmBtn = screen.getByRole("button", { name: "Xác nhận đơn" });
      await user.click(confirmBtn);

      const pendingConfirmBtn = screen.getByRole("button", {
        name: "Đang xác nhận…",
      });
      expect(pendingConfirmBtn).toBeDisabled();
      expect(screen.getByRole("button", { name: "Hủy đơn" })).toBeDisabled();

      // Thử bấm lần 2 khi đang pending -> không gọi thêm fetch
      await user.click(pendingConfirmBtn);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenLastCalledWith(
        "/api/admin/orders/SL-20261121-STEP01/status",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: "confirmed",
            expectedStatus: "pending",
          }),
        },
      );

      resolveConfirm(
        new Response(
          JSON.stringify({
            order: { ...order, status: "confirmed" },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );

      // Bước 2: confirmed -> shipping kèm ghi chú mã vận đơn
      const trackingInput = await screen.findByLabelText(
        "Ghi chú vận chuyển / mã vận đơn (tùy chọn)",
      );
      expect(trackingInput).toHaveAttribute("maxLength", "200");
      await user.type(trackingInput, "  Mã vận đơn GHN-882910  ");

      const shipBtn = screen.getByRole("button", {
        name: "Bàn giao giao hàng",
      });
      await user.click(shipBtn);

      expect(fetchMock).toHaveBeenLastCalledWith(
        "/api/admin/orders/SL-20261121-STEP01/status",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: "shipping",
            note: "Mã vận đơn GHN-882910",
            expectedStatus: "confirmed",
          }),
        },
      );

      // Bước 3: shipping -> delivered
      const deliverBtn = await screen.findByRole("button", {
        name: "Đánh dấu đã giao",
      });
      expect(
        screen.getByText("Ghi chú: Mã vận đơn GHN-882910"),
      ).toBeInTheDocument();
      await user.click(deliverBtn);

      expect(fetchMock).toHaveBeenLastCalledWith(
        "/api/admin/orders/SL-20261121-STEP01/status",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: "delivered",
            expectedStatus: "shipping",
          }),
        },
      );

      // Khi đã giao (delivered): ẩn toàn bộ nút hành động và ẩn ReservedStockIndicator
      await vi.waitFor(() => {
        expect(
          screen.queryByRole("button", { name: "Đánh dấu đã giao" }),
        ).not.toBeInTheDocument();
      });
      expect(
        screen.queryByRole("button", { name: "Hủy đơn" }),
      ).not.toBeInTheDocument();
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
    });
  });

  describe("4. CancelOrderDialog chips, counter, validation, shipping warning & Escape focus return", () => {
    it("hỗ trợ 3 chip điền vào textarea không tự submit, đếm {len}/200, báo lỗi khi rỗng hoặc >200 ký tự mà giữ nguyên text, hiện cảnh báo khi shipping, và Escape đóng trả focus về nút Hủy đơn", async () => {
      const shippingOrder = makeOrder({
        id: "SL-20261121-SHIP99",
        status: "shipping",
      });
      const fetchMock = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            order: {
              ...shippingOrder,
              status: "cancelled",
              inventoryRestocked: false,
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );
      vi.stubGlobal("fetch", fetchMock);
      const user = userEvent.setup();

      render(<AdminOrdersView initialData={makeListResult([shippingOrder])} />);

      const openCancelBtn = screen.getByRole("button", { name: "Hủy đơn" });
      await user.click(openCancelBtn);

      const dialog = screen.getByRole("dialog");
      expect(dialog).toHaveAttribute("aria-modal", "true");

      // Cảnh báo vàng khi hủy đơn đang giao (shipping)
      expect(
        within(dialog).getByText(/Hủy đơn đang giao sẽ/i),
      ).toBeInTheDocument();
      expect(
        within(dialog).getByText(/không tự động cộng lại tồn kho/i),
      ).toBeInTheDocument();

      // Bấm Escape đóng dialog và trả focus về nút "Hủy đơn"
      await user.keyboard("{Escape}");
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(openCancelBtn).toHaveFocus();

      // Mở lại dialog để kiểm tra chip, counter và validation
      await user.click(openCancelBtn);
      const reopenedDialog = screen.getByRole("dialog");
      const textarea = within(reopenedDialog).getByLabelText(
        "Lý do hủy đơn (bắt buộc)",
      );
      expect(within(reopenedDialog).getByText("0 / 200")).toBeInTheDocument();

      // Submit rỗng -> báo role="alert" và giữ dialog mở
      await user.click(
        within(reopenedDialog).getByRole("button", {
          name: "Xác nhận hủy đơn",
        }),
      );
      expect(
        within(reopenedDialog).getByText("Vui lòng nhập lý do hủy đơn hàng"),
      ).toBeInTheDocument();
      expect(fetchMock).not.toHaveBeenCalled();

      // Chạm chip chọn nhanh -> điền vào textarea để sửa thêm, không tự submit
      const chip = within(reopenedDialog).getByRole("button", {
        name: "Giao hàng thất bại / Khách không nhận",
      });
      await user.click(chip);

      expect(chip).toHaveAttribute("aria-pressed", "true");
      expect(textarea).toHaveValue("Giao hàng thất bại / Khách không nhận");
      expect(textarea).toHaveFocus();
      expect(
        within(reopenedDialog).getByText(
          `${"Giao hàng thất bại / Khách không nhận".length} / 200`,
        ),
      ).toBeInTheDocument();
      expect(fetchMock).not.toHaveBeenCalled();

      // Nhập quá 200 ký tự -> chặn submit, hiện role="alert" và giữ nguyên text đã nhập
      const tooLongReason = "Lý do quá dài ".repeat(16);
      await user.clear(textarea);
      await user.click(textarea);
      await user.paste(tooLongReason);
      expect(
        within(reopenedDialog).getByText(`${tooLongReason.length} / 200`),
      ).toBeInTheDocument();

      await user.click(
        within(reopenedDialog).getByRole("button", {
          name: "Xác nhận hủy đơn",
        }),
      );
      expect(
        within(reopenedDialog).getByText("Lý do hủy đơn tối đa 200 ký tự"),
      ).toBeInTheDocument();
      expect(textarea).toHaveValue(tooLongReason);
      expect(fetchMock).not.toHaveBeenCalled();

      // Sửa lại hợp lệ rồi xác nhận hủy
      await user.click(
        within(reopenedDialog).getByRole("button", {
          name: "Hết hàng thực tế",
        }),
      );
      await user.type(textarea, " - hộp cuối bị móp");
      await user.click(
        within(reopenedDialog).getByRole("button", {
          name: "Xác nhận hủy đơn",
        }),
      );

      expect(fetchMock).toHaveBeenCalledWith(
        "/api/admin/orders/SL-20261121-SHIP99/status",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: "cancelled",
            note: "Hết hàng thực tế - hộp cuối bị móp",
            expectedStatus: "shipping",
          }),
        },
      );
      await vi.waitFor(() => {
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      });
    });

    it("không hiển thị cảnh báo tồn kho vàng trong CancelOrderDialog khi đơn ở trạng thái pending hoặc confirmed và nút Quay lại đóng dialog trả focus về nút mở", async () => {
      const pendingOrder = makeOrder({
        id: "SL-20261121-BACK01",
        status: "pending",
      });
      const user = userEvent.setup();

      render(<AdminOrdersView initialData={makeListResult([pendingOrder])} />);

      const openCancelBtn = screen.getByRole("button", { name: "Hủy đơn" });
      await user.click(openCancelBtn);

      const dialog = screen.getByRole("dialog");
      expect(
        within(dialog).queryByText(/không tự động cộng lại tồn kho/i),
      ).not.toBeInTheDocument();

      await user.click(
        within(dialog).getByRole("button", { name: "Quay lại" }),
      );
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(openCancelBtn).toHaveFocus();

      const onCloseMock = vi.fn();
      render(
        <CancelOrderDialog
          order={makeOrder({ status: "confirmed" })}
          pending={true}
          onClose={onCloseMock}
          onConfirm={vi.fn()}
        />,
      );
      expect(screen.getByRole("button", { name: "Đang hủy…" })).toBeDisabled();
      await user.keyboard("{Escape}");
      expect(onCloseMock).not.toHaveBeenCalled();
    });
  });

  describe("5. RestockStatusBadge & manual restock flow for cancelled shipping orders", () => {
    it("hiển thị restock-pending-badge + nút hoàn kho khi inventoryRestocked=false, gọi POST .../restock đổi sang restocked-badge, và ẩn cả hai khi inventoryRestocked=undefined", async () => {
      const pendingRestockOrder = makeOrder({
        id: "SL-20261121-RET01",
        status: "cancelled",
        inventoryRestocked: false,
      });
      const legacyCancelledOrder = makeOrder({
        id: "SL-20261121-LEG02",
        status: "cancelled",
        inventoryRestocked: undefined,
      });

      const fetchMock = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            order: {
              ...pendingRestockOrder,
              inventoryRestocked: true,
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );
      vi.stubGlobal("fetch", fetchMock);
      const user = userEvent.setup();

      render(
        <AdminOrdersView
          initialData={makeListResult([
            pendingRestockOrder,
            legacyCancelledOrder,
          ])}
        />,
      );

      // Đơn hủy từ shipping (inventoryRestocked: false) hiện badge chờ hoàn và nút hoàn kho
      expect(screen.getByTestId("restock-pending-badge")).toHaveTextContent(
        "Chờ nhận hàng hoàn",
      );
      const restockButtons = screen.getAllByRole("button", {
        name: "Xác nhận đã nhận hàng hoàn (+kho)",
      });
      expect(restockButtons).toHaveLength(1);

      await user.click(restockButtons[0]);

      expect(fetchMock).toHaveBeenCalledWith(
        "/api/admin/orders/SL-20261121-RET01/restock",
        { method: "POST" },
      );

      expect(await screen.findByTestId("restocked-badge")).toHaveTextContent(
        "Đã hoàn kho",
      );
      expect(
        screen.queryByTestId("restock-pending-badge"),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", {
          name: "Xác nhận đã nhận hàng hoàn (+kho)",
        }),
      ).not.toBeInTheDocument();

      // Kiểm tra trực tiếp RestockStatusBadge với undefined
      const { container } = render(
        <RestockStatusBadge inventoryRestocked={undefined} />,
      );
      expect(container).toBeEmptyDOMElement();
    });
  });

  describe("6. Error handling (401, 409, 500/offline), AdminOrdersPage Server Component & StorefrontChrome", () => {
    it("chuyển hướng sang /admin/login?expired=1 khi API trả 401", async () => {
      const order = makeOrder({ id: "SL-20261121-AUTH01", status: "pending" });
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          new Response(
            JSON.stringify({
              error: { code: "UNAUTHORIZED", message: "Hết phiên" },
            }),
            { status: 401, headers: { "Content-Type": "application/json" } },
          ),
        ),
      );
      const user = userEvent.setup();

      render(<AdminOrdersView initialData={makeListResult([order])} />);

      await user.click(screen.getByRole("button", { name: "Xác nhận đơn" }));

      await vi.waitFor(() => {
        expect(testState.pushMock).toHaveBeenCalledWith(
          "/admin/login?expired=1",
        );
      });
    });

    it("khi nhận 409 Conflict: hiển thị banner role=alert, đóng CancelOrderDialog nếu đang mở và tự gọi lại GET /api/admin/orders", async () => {
      const order = makeOrder({ id: "SL-20261121-CONF01", status: "pending" });
      const refreshedOrder = makeOrder({
        id: "SL-20261121-CONF01",
        status: "confirmed",
      });

      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              error: {
                code: "INVALID_STATUS_TRANSITION",
                message: "Xung đột trạng thái",
              },
            }),
            { status: 409, headers: { "Content-Type": "application/json" } },
          ),
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify(makeListResult([refreshedOrder])), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
        );
      vi.stubGlobal("fetch", fetchMock);
      const user = userEvent.setup();

      render(<AdminOrdersView initialData={makeListResult([order])} />);

      // Mở CancelOrderDialog rồi gửi hủy đúng lúc đơn vừa bị người khác cập nhật (409)
      await user.click(screen.getByRole("button", { name: "Hủy đơn" }));
      const dialog = screen.getByRole("dialog");
      await user.click(
        within(dialog).getByRole("button", { name: "Hết hàng thực tế" }),
      );
      await user.click(
        within(dialog).getByRole("button", { name: "Xác nhận hủy đơn" }),
      );

      const alertBanner = await screen.findByRole("alert");
      expect(alertBanner).toHaveTextContent(
        "Đơn hàng vừa được cập nhật bởi thao tác khác. Danh sách đã được làm mới.",
      );
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(fetchMock).toHaveBeenLastCalledWith(
        "/api/admin/orders?status=all",
        expect.objectContaining({ method: "GET" }),
      );
      expect(
        await screen.findByRole("button", { name: "Bàn giao giao hàng" }),
      ).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Hủy đơn" })).toHaveFocus();
    });

    it("khi gặp lỗi 500 hoặc mất kết nối mạng: hiển thị role=alert và giữ nguyên CancelOrderDialog cùng nội dung đã nhập", async () => {
      const order = makeOrder({
        id: "SL-20261121-ERR500",
        status: "confirmed",
      });
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(
          new Response("Internal Server Error", { status: 500 }),
        )
        .mockRejectedValueOnce(new Error("Network offline"));
      vi.stubGlobal("fetch", fetchMock);
      const user = userEvent.setup();

      render(<AdminOrdersView initialData={makeListResult([order])} />);

      await user.click(screen.getByRole("button", { name: "Hủy đơn" }));
      const dialog = screen.getByRole("dialog");
      const textarea = within(dialog).getByLabelText(
        "Lý do hủy đơn (bắt buộc)",
      );
      await user.type(textarea, "Khách đổi ý hủy đơn");

      // Lần 1: lỗi 500
      await user.click(
        within(dialog).getByRole("button", { name: "Xác nhận hủy đơn" }),
      );
      expect(await within(dialog).findByRole("alert")).toHaveTextContent(
        "Có lỗi hệ thống xảy ra. Vui lòng thử lại sau.",
      );
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(textarea).toHaveValue("Khách đổi ý hủy đơn");

      // Lần 2: lỗi mạng offline
      await user.click(
        within(dialog).getByRole("button", { name: "Xác nhận hủy đơn" }),
      );
      expect(await within(dialog).findByRole("alert")).toHaveTextContent(
        "Không thể kết nối máy chủ. Vui lòng kiểm tra mạng và thử lại.",
      );
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(textarea).toHaveValue("Khách đổi ý hủy đơn");
    });

    it("khi Bàn giao giao hàng hoặc Hoàn kho gặp lỗi 500/409: giữ nguyên mã vận đơn đã gõ khi 500 và tự làm mới danh sách khi hoàn kho trả 409", async () => {
      const confirmedOrder = makeOrder({
        id: "SL-20261121-SHIP500",
        status: "confirmed",
      });
      const cancelledOrder = makeOrder({
        id: "SL-20261121-REST409",
        status: "cancelled",
        inventoryRestocked: false,
      });

      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(new Response("Server Error", { status: 500 }))
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              error: {
                code: "INVALID_STATUS_TRANSITION",
                message: "Đơn đã được hoàn kho trước đó",
              },
            }),
            { status: 409, headers: { "Content-Type": "application/json" } },
          ),
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify(
              makeListResult([
                confirmedOrder,
                { ...cancelledOrder, inventoryRestocked: true },
              ]),
            ),
            { status: 200, headers: { "Content-Type": "application/json" } },
          ),
        );
      vi.stubGlobal("fetch", fetchMock);
      const user = userEvent.setup();

      render(
        <AdminOrdersView
          initialData={makeListResult([confirmedOrder, cancelledOrder])}
        />,
      );

      const trackingInput = screen.getByLabelText(
        "Ghi chú vận chuyển / mã vận đơn (tùy chọn)",
      );
      await user.type(trackingInput, "GHN-999888");
      await user.click(
        screen.getByRole("button", { name: "Bàn giao giao hàng" }),
      );

      expect(await screen.findByRole("alert")).toHaveTextContent(
        "Có lỗi hệ thống xảy ra. Vui lòng thử lại sau.",
      );
      expect(trackingInput).toHaveValue("GHN-999888");

      // Bấm hoàn kho gặp 409 -> hiện banner xung đột và tự tải lại danh sách
      await user.click(
        screen.getByRole("button", {
          name: "Xác nhận đã nhận hàng hoàn (+kho)",
        }),
      );

      expect(await screen.findByRole("alert")).toHaveTextContent(
        "Đơn hàng vừa được cập nhật bởi thao tác khác. Danh sách đã được làm mới.",
      );
      expect(await screen.findByTestId("restocked-badge")).toHaveTextContent(
        "Đã hoàn kho",
      );
    });

    it("AdminOrdersPage (Server Component) cấu hình dynamic = force-dynamic, truyền status & q vào orderService.listAdminOrders và render AdminHeaderBar + AdminOrdersView", async () => {
      expect(adminOrdersDynamic).toBe("force-dynamic");

      const order = makeOrder({ id: "SL-20261121-SRV01", status: "pending" });
      testState.listAdminOrdersMock.mockResolvedValue(makeListResult([order]));

      const ui = await AdminOrdersPage({
        params: Promise.resolve({}),
        searchParams: Promise.resolve({
          status: "pending",
          q: "minh",
        }),
      });
      render(ui);

      expect(testState.listAdminOrdersMock).toHaveBeenCalledWith({
        status: "pending",
        q: "minh",
      });
      expect(screen.getByText("Vận hành đơn hàng")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Đăng xuất" }),
      ).toBeInTheDocument();
      expect(screen.getByText("SL-20261121-SRV01")).toBeInTheDocument();
      expect(
        screen.getByRole("searchbox", { name: "Tìm kiếm đơn hàng" }),
      ).toHaveValue("minh");
      expect(screen.getByTestId("fifo-sort-hint")).toBeInTheDocument();
    });

    it("StorefrontChrome ẩn Header/Footer công khai trên các route /admin/* và giữ nguyên trên route mặt tiền", () => {
      testState.pathname = "/admin/orders";
      const { rerender } = render(
        <StorefrontChrome>
          <div data-testid="page-child">Nội dung trang</div>
        </StorefrontChrome>,
      );

      expect(screen.getByTestId("page-child")).toBeInTheDocument();
      expect(
        screen.queryByLabelText("ShopLite - Trang chủ"),
      ).not.toBeInTheDocument();

      testState.pathname = "/products";
      rerender(
        <StorefrontChrome>
          <div data-testid="page-child">Nội dung trang</div>
        </StorefrontChrome>,
      );

      expect(screen.getByLabelText("ShopLite - Trang chủ")).toBeInTheDocument();
      expect(screen.getByTestId("page-child")).toBeInTheDocument();
    });

    it("xử lý 401 và 500/offline trên GET /api/admin/orders, POST .../restock và lỗi mạng trên PATCH chuyển trạng thái", async () => {
      // 1) GET trả 401 -> chuyển hướng /admin/login?expired=1
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              error: { code: "UNAUTHORIZED", message: "Hết phiên" },
            }),
            { status: 401, headers: { "Content-Type": "application/json" } },
          ),
        )
        // 2) GET trả 500 -> hiện SYSTEM_ERROR_MESSAGE
        .mockResolvedValueOnce(new Response("Server Error", { status: 500 }))
        // 3) GET lỗi mạng -> hiện NETWORK_ERROR_MESSAGE
        .mockRejectedValueOnce(new Error("Offline"))
        // 4) POST .../restock trả 401 -> chuyển hướng /admin/login?expired=1
        .mockResolvedValueOnce(new Response(null, { status: 401 }))
        // 5) POST .../restock trả 500 -> hiện SYSTEM_ERROR_MESSAGE
        .mockResolvedValueOnce(new Response("Server Error", { status: 500 }))
        // 6) POST .../restock lỗi mạng -> hiện NETWORK_ERROR_MESSAGE
        .mockRejectedValueOnce(new Error("Offline"))
        // 7) PATCH non-cancel lỗi mạng -> hiện NETWORK_ERROR_MESSAGE
        .mockRejectedValueOnce(new Error("Offline"));

      vi.stubGlobal("fetch", fetchMock);
      const user = userEvent.setup();

      const { unmount } = render(<AdminOrdersView />);
      await vi.waitFor(() => {
        expect(testState.pushMock).toHaveBeenCalledWith(
          "/admin/login?expired=1",
        );
      });
      unmount();

      testState.pushMock.mockClear();
      const pendingOrder = makeOrder({
        id: "SL-20261121-NET01",
        status: "pending",
      });
      const restockOrder = makeOrder({
        id: "SL-20261121-NET02",
        status: "cancelled",
        inventoryRestocked: false,
      });

      render(
        <AdminOrdersView
          initialData={makeListResult([pendingOrder, restockOrder])}
        />,
      );

      // Chuyển tab -> GET trả 500
      await user.click(screen.getByRole("button", { name: /Chờ xác nhận/i }));
      expect(await screen.findByRole("alert")).toHaveTextContent(
        "Có lỗi hệ thống xảy ra. Vui lòng thử lại sau.",
      );

      // Chuyển tab -> GET lỗi mạng
      await user.click(screen.getByRole("button", { name: /Tất cả/i }));
      expect(await screen.findByRole("alert")).toHaveTextContent(
        "Không thể kết nối máy chủ. Vui lòng kiểm tra mạng và thử lại.",
      );

      // POST .../restock trả 401
      const restockBtn = screen.getByRole("button", {
        name: "Xác nhận đã nhận hàng hoàn (+kho)",
      });
      await user.click(restockBtn);
      await vi.waitFor(() => {
        expect(testState.pushMock).toHaveBeenCalledWith(
          "/admin/login?expired=1",
        );
      });

      // POST .../restock trả 500
      await user.click(restockBtn);
      expect(await screen.findByRole("alert")).toHaveTextContent(
        "Có lỗi hệ thống xảy ra. Vui lòng thử lại sau.",
      );

      // POST .../restock lỗi mạng
      await user.click(restockBtn);
      expect(await screen.findByRole("alert")).toHaveTextContent(
        "Không thể kết nối máy chủ. Vui lòng kiểm tra mạng và thử lại.",
      );

      // PATCH confirm lỗi mạng
      await user.click(screen.getByRole("button", { name: "Xác nhận đơn" }));
      expect(await screen.findByRole("alert")).toHaveTextContent(
        "Không thể kết nối máy chủ. Vui lòng kiểm tra mạng và thử lại.",
      );
    });

    it("khi 409 xảy ra trên confirm hoặc ship với bộ lọc ?status=pending&q=minh: giữ nguyên CONFLICT_ERROR_MESSAGE và tải lại đúng query", async () => {
      const pendingOrder = makeOrder({
        id: "SL-20261121-C409",
        status: "pending",
      });
      const refreshedConfirmed = makeOrder({
        id: "SL-20261121-C409",
        status: "confirmed",
      });
      const refreshedShipping = makeOrder({
        id: "SL-20261121-C409",
        status: "shipping",
      });

      const fetchMock = vi
        .fn()
        // 1) PATCH confirm -> 409
        .mockResolvedValueOnce(new Response(null, { status: 409 }))
        // 2) GET refresh sau 409 confirm
        .mockResolvedValueOnce(
          new Response(JSON.stringify(makeListResult([refreshedConfirmed])), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
        )
        // 3) PATCH ship -> 409
        .mockResolvedValueOnce(new Response(null, { status: 409 }))
        // 4) GET refresh sau 409 ship
        .mockResolvedValueOnce(
          new Response(JSON.stringify(makeListResult([refreshedShipping])), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
        );

      vi.stubGlobal("fetch", fetchMock);
      const user = userEvent.setup();

      render(
        <AdminOrdersView
          initialData={makeListResult([pendingOrder])}
          initialStatus="pending"
          initialQuery="minh"
        />,
      );

      await user.click(screen.getByRole("button", { name: "Xác nhận đơn" }));

      expect(await screen.findByRole("alert")).toHaveTextContent(
        "Đơn hàng vừa được cập nhật bởi thao tác khác. Danh sách đã được làm mới.",
      );
      expect(fetchMock).toHaveBeenNthCalledWith(
        2,
        "/api/admin/orders?status=pending&q=minh",
        expect.objectContaining({ method: "GET" }),
      );

      const shipBtn = await screen.findByRole("button", {
        name: "Bàn giao giao hàng",
      });
      await user.click(shipBtn);

      expect(await screen.findByRole("alert")).toHaveTextContent(
        "Đơn hàng vừa được cập nhật bởi thao tác khác. Danh sách đã được làm mới.",
      );
      expect(fetchMock).toHaveBeenNthCalledWith(
        4,
        "/api/admin/orders?status=pending&q=minh",
        expect.objectContaining({ method: "GET" }),
      );
    });

    it("hủy debounce 250ms khi bấm ✕ trước khi timer chạy, bỏ qua debounce chỉ gồm khoảng trắng, và đồng bộ lại khi props initialData/initialStatus/initialQuery thay đổi", async () => {
      const orderA = makeOrder({ id: "SL-20261121-DEBA", status: "pending" });
      const orderB = makeOrder({ id: "SL-20261121-DEBB", status: "confirmed" });
      const fetchMock = vi.fn().mockResolvedValue(
        new Response(JSON.stringify(makeListResult([orderA])), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
      vi.stubGlobal("fetch", fetchMock);
      const user = userEvent.setup();

      const { rerender } = render(
        <AdminOrdersView
          initialData={makeListResult([orderA])}
          initialStatus="pending"
          initialQuery=""
        />,
      );

      const searchInput = screen.getByRole("searchbox", {
        name: "Tìm kiếm đơn hàng",
      });

      // 1) Gõ khoảng trắng khi appliedQuery đang rỗng -> sau >250ms không gọi fetch
      await user.type(searchInput, "   ");
      await new Promise((resolve) => setTimeout(resolve, 300));
      expect(fetchMock).not.toHaveBeenCalled();

      // 2) Gõ từ khóa mới rồi bấm ✕ ngay lập tức trước 250ms -> hủy timer, không gọi GET với từ khóa cũ
      await user.clear(searchInput);
      await user.type(searchInput, "minh");
      await user.click(
        screen.getByRole("button", { name: "Xóa từ khóa tìm kiếm" }),
      );
      expect(searchInput).toHaveValue("");
      await new Promise((resolve) => setTimeout(resolve, 300));
      expect(fetchMock).not.toHaveBeenCalled();

      // 3) Rerender với initialData / initialStatus / initialQuery mới (Back/Forward / router.refresh)
      rerender(
        <AdminOrdersView
          initialData={makeListResult([orderB])}
          initialStatus="confirmed"
          initialQuery="0988"
        />,
      );

      expect(
        screen.getByRole("button", { name: /Đã xác nhận/i }),
      ).toHaveAttribute("aria-pressed", "true");
      expect(searchInput).toHaveValue("0988");
      expect(screen.getByText("SL-20261121-DEBB")).toBeInTheDocument();
    });

    it("bỏ qua note khi mã vận đơn chỉ gồm khoảng trắng, kiểm tra khóa pending ('Đang xử lý…') trên ship/deliver/restock và kiểm tra min-h-11 trên toàn bộ nút/input/chip", async () => {
      const confirmedOrder = makeOrder({
        id: "SL-20261121-LOCK1",
        status: "confirmed",
      });
      const cancelledOrder = makeOrder({
        id: "SL-20261121-LOCK2",
        status: "cancelled",
        inventoryRestocked: false,
      });

      let resolveShip!: (value: Response) => void;
      let resolveDeliver!: (value: Response) => void;
      let resolveRestock!: (value: Response) => void;
      const fetchMock = vi
        .fn()
        .mockImplementationOnce(
          () =>
            new Promise<Response>((resolve) => {
              resolveShip = resolve;
            }),
        )
        .mockImplementationOnce(
          () =>
            new Promise<Response>((resolve) => {
              resolveDeliver = resolve;
            }),
        )
        .mockImplementationOnce(
          () =>
            new Promise<Response>((resolve) => {
              resolveRestock = resolve;
            }),
        );

      vi.stubGlobal("fetch", fetchMock);
      const user = userEvent.setup();

      render(
        <AdminOrdersView
          initialData={makeListResult([confirmedOrder, cancelledOrder])}
        />,
      );

      const trackingInput = screen.getByLabelText(
        "Ghi chú vận chuyển / mã vận đơn (tùy chọn)",
      );
      expect(trackingInput).toHaveClass("min-h-11");

      const cancelBtn = screen.getByRole("button", { name: "Hủy đơn" });
      expect(cancelBtn).toHaveClass("min-h-11", "text-rose-700");

      const shipBtn = screen.getByRole("button", {
        name: "Bàn giao giao hàng",
      });
      expect(shipBtn).toHaveClass("min-h-11");

      const restockBtn = screen.getByRole("button", {
        name: "Xác nhận đã nhận hàng hoàn (+kho)",
      });
      expect(restockBtn).toHaveClass("min-h-11");

      // Gõ khoảng trắng vào ô mã vận đơn rồi bấm Bàn giao giao hàng -> không gửi trường note
      await user.type(trackingInput, "   ");
      await user.click(shipBtn);

      const pendingShipBtn = screen.getByRole("button", {
        name: "Đang xử lý…",
      });
      expect(pendingShipBtn).toBeDisabled();
      expect(trackingInput).toBeDisabled();
      expect(cancelBtn).toBeDisabled();
      expect(restockBtn).toBeDisabled();

      expect(fetchMock).toHaveBeenLastCalledWith(
        "/api/admin/orders/SL-20261121-LOCK1/status",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: "shipping",
            expectedStatus: "confirmed",
          }),
        },
      );

      resolveShip(
        new Response(
          JSON.stringify({
            order: { ...confirmedOrder, status: "shipping" },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );

      const deliverBtn = await screen.findByRole("button", {
        name: "Đánh dấu đã giao",
      });
      expect(deliverBtn).toHaveClass("min-h-11");
      await user.click(deliverBtn);

      const pendingDeliverBtn = screen.getByRole("button", {
        name: "Đang xử lý…",
      });
      expect(pendingDeliverBtn).toBeDisabled();

      resolveDeliver(
        new Response(
          JSON.stringify({
            order: { ...confirmedOrder, status: "delivered" },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );

      await vi.waitFor(() => {
        expect(
          screen.queryByRole("button", { name: "Đánh dấu đã giao" }),
        ).not.toBeInTheDocument();
      });

      // Bấm hoàn kho -> hiện "Đang xử lý…" và disabled
      await user.click(restockBtn);
      const pendingRestockBtn = screen.getByRole("button", {
        name: "Đang xử lý…",
      });
      expect(pendingRestockBtn).toBeDisabled();

      resolveRestock(
        new Response(
          JSON.stringify({
            order: { ...cancelledOrder, inventoryRestocked: true },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );

      expect(await screen.findByTestId("restocked-badge")).toBeInTheDocument();
    });

    it("CancelOrderDialog từ chối lý do chỉ có khoảng trắng, cho phép đúng 200 ký tự và chặn 201 ký tự, xóa bản nháp khi đóng/mở lại, khóa Escape & chip khi đang PATCH và giữ focus trap Tab/Shift+Tab", async () => {
      const order = makeOrder({
        id: "SL-20261121-DLG200",
        status: "pending",
      });

      let resolveCancel!: (value: Response) => void;
      const fetchMock = vi.fn().mockImplementation(
        () =>
          new Promise<Response>((resolve) => {
            resolveCancel = resolve;
          }),
      );
      vi.stubGlobal("fetch", fetchMock);
      const user = userEvent.setup();

      render(<AdminOrdersView initialData={makeListResult([order])} />);

      const openCancelBtn = screen.getByRole("button", { name: "Hủy đơn" });
      await user.click(openCancelBtn);

      const dialog = screen.getByRole("dialog");
      const textarea = within(dialog).getByLabelText(
        "Lý do hủy đơn (bắt buộc)",
      );
      expect(textarea).toHaveFocus();

      // Kiểm tra min-h-11 trên 3 chip và 2 nút trong dialog
      for (const reason of [
        "Hết hàng thực tế",
        "Khách yêu cầu hủy qua điện thoại",
        "Giao hàng thất bại / Khách không nhận",
      ]) {
        expect(
          within(dialog).getByRole("button", { name: reason }),
        ).toHaveClass("min-h-11");
      }
      const backBtn = within(dialog).getByRole("button", { name: "Quay lại" });
      const confirmCancelBtn = within(dialog).getByRole("button", {
        name: "Xác nhận hủy đơn",
      });
      expect(backBtn).toHaveClass("min-h-11");
      expect(confirmCancelBtn).toHaveClass("min-h-11");

      // Focus trap: từ nút cuối bấm Tab quay về chip đầu, bấm Shift+Tab quay lại nút cuối
      confirmCancelBtn.focus();
      await user.tab();
      expect(
        within(dialog).getByRole("button", { name: "Hết hàng thực tế" }),
      ).toHaveFocus();
      await user.tab({ shift: true });
      expect(confirmCancelBtn).toHaveFocus();

      // Nhập toàn khoảng trắng -> hiện "3 / 200" nhưng từ chối submit
      await user.click(textarea);
      await user.type(textarea, "   ");
      expect(within(dialog).getByText("3 / 200")).toBeInTheDocument();
      await user.click(confirmCancelBtn);
      expect(
        within(dialog).getByText("Vui lòng nhập lý do hủy đơn hàng"),
      ).toBeInTheDocument();
      expect(textarea).toHaveAttribute("aria-invalid", "true");

      // Đóng rồi mở lại -> bản nháp và lỗi cũ được xóa sạch
      await user.click(backBtn);
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

      await user.click(openCancelBtn);
      const reopenedDialog = screen.getByRole("dialog");
      const reopenedTextarea = within(reopenedDialog).getByLabelText(
        "Lý do hủy đơn (bắt buộc)",
      );
      expect(reopenedTextarea).toHaveValue("");
      expect(within(reopenedDialog).getByText("0 / 200")).toBeInTheDocument();

      // 201 ký tự -> bị từ chối
      const reason201 = "a".repeat(201);
      await user.click(reopenedTextarea);
      await user.paste(reason201);
      await user.click(
        within(reopenedDialog).getByRole("button", {
          name: "Xác nhận hủy đơn",
        }),
      );
      expect(
        within(reopenedDialog).getByText("Lý do hủy đơn tối đa 200 ký tự"),
      ).toBeInTheDocument();
      expect(fetchMock).not.toHaveBeenCalled();

      // Đúng 200 ký tự -> được chấp nhận và gửi PATCH; trong lúc đang gửi thì Escape, Quay lại và chip đều bị khóa
      const reason200 = "b".repeat(200);
      await user.clear(reopenedTextarea);
      await user.paste(reason200);
      await user.click(
        within(reopenedDialog).getByRole("button", {
          name: "Xác nhận hủy đơn",
        }),
      );

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(
        within(reopenedDialog).getByRole("button", { name: "Đang hủy…" }),
      ).toBeDisabled();
      expect(
        within(reopenedDialog).getByRole("button", { name: "Quay lại" }),
      ).toBeDisabled();
      expect(
        within(reopenedDialog).getByRole("button", {
          name: "Hết hàng thực tế",
        }),
      ).toBeDisabled();

      await user.keyboard("{Escape}");
      expect(screen.getByRole("dialog")).toBeInTheDocument();

      resolveCancel(
        new Response(
          JSON.stringify({
            order: {
              ...order,
              status: "cancelled",
              inventoryRestocked: true,
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );

      await vi.waitFor(() => {
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      });
    });

    it("hiển thị đúng 3 tiêu đề EmptyState, bỏ qua ghi chú restock trong Lý do hủy, rời khỏi tab trạng thái cụ thể khi chuyển bước và cộng lại availableStockByProductId sau khi hủy/hoàn kho", async () => {
      // 1) EmptyState theo từ khóa vs theo trạng thái vs tổng 0
      const emptyData = makeListResult([]);
      const { rerender, unmount } = render(
        <AdminOrdersView
          initialData={emptyData}
          initialStatus="pending"
          initialQuery="SL-999"
        />,
      );
      expect(
        screen.getByText('Không tìm thấy đơn hàng khớp từ khóa "SL-999"'),
      ).toBeInTheDocument();

      rerender(
        <AdminOrdersView
          initialData={emptyData}
          initialStatus="shipping"
          initialQuery=""
        />,
      );
      expect(
        screen.getByText('Chưa có đơn hàng ở trạng thái "Đang giao"'),
      ).toBeInTheDocument();

      rerender(
        <AdminOrdersView
          initialData={emptyData}
          initialStatus="all"
          initialQuery=""
        />,
      );
      expect(
        screen.getByText("Chưa có đơn hàng nào trong hệ thống"),
      ).toBeInTheDocument();
      unmount();

      // 2) Khi đang ở tab "pending": hủy đơn pending1 sẽ gỡ đơn khỏi tab pending, cập nhật counts và cộng lại tồn kho cho đơn pending2 cùng sản phẩm; đơn đã hủy có event restock vẫn chỉ hiển thị đúng Lý do hủy
      const pending1 = makeOrder({
        id: "SL-20261121-P1",
        status: "pending",
      });
      const pending2 = makeOrder({
        id: "SL-20261121-P2",
        status: "pending",
      });
      const cancelledWithRestockNote = makeOrder({
        id: "SL-20261121-CNOTE",
        status: "cancelled",
        inventoryRestocked: false,
        statusHistory: [
          {
            status: "shipping",
            at: "2026-11-21T01:00:00.000Z",
            actor: "staff",
            action: "transition",
            note: "GHN-111",
          },
          {
            status: "cancelled",
            at: "2026-11-21T02:00:00.000Z",
            actor: "staff",
            action: "transition",
            note: "Khách từ chối nhận hàng",
          },
          {
            status: "cancelled",
            at: "2026-11-21T03:00:00.000Z",
            actor: "staff",
            action: "restock",
            note: "Ghi chú hoàn kho nội bộ",
          },
        ],
      });

      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              order: {
                ...pending1,
                status: "cancelled",
                inventoryRestocked: true,
              },
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          ),
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              order: {
                ...cancelledWithRestockNote,
                inventoryRestocked: true,
              },
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          ),
        );
      vi.stubGlobal("fetch", fetchMock);
      const user = userEvent.setup();

      const { rerender: rerenderQueue } = render(
        <AdminOrdersView
          initialData={makeListResult([pending1, pending2], {
            availableStockByProductId: { p001: 4 },
            counts: {
              all: 3,
              pending: 2,
              confirmed: 0,
              shipping: 0,
              delivered: 0,
              cancelled: 1,
            },
          })}
          initialStatus="pending"
        />,
      );

      // Ban đầu p001 = 4 (amber 1..5)
      expect(screen.getAllByRole("status")[0]).toHaveTextContent(
        "Còn cho đơn mới: 4",
      );

      // Hủy đơn pending1 (quantity = 2) khi đang ở tab "pending"
      const cancelButtons = screen.getAllByRole("button", { name: "Hủy đơn" });
      await user.click(cancelButtons[0]);
      const dialog = screen.getByRole("dialog");
      await user.click(
        within(dialog).getByRole("button", { name: "Hết hàng thực tế" }),
      );
      await user.click(
        within(dialog).getByRole("button", { name: "Xác nhận hủy đơn" }),
      );

      // Đơn pending1 rời khỏi tab "pending", còn lại pending2 với tồn kho p001 cập nhật từ 4 -> 6 (emerald > 5)
      await vi.waitFor(() => {
        expect(screen.queryByText("SL-20261121-P1")).not.toBeInTheDocument();
      });
      expect(screen.getByText("SL-20261121-P2")).toBeInTheDocument();
      expect(screen.getByRole("status")).toHaveTextContent(
        "Còn cho đơn mới: 6",
      );
      expect(
        screen.getByRole("button", { name: /Chờ xác nhận/i }),
      ).toHaveTextContent("1");
      expect(screen.getByRole("button", { name: /Đã hủy/i })).toHaveTextContent(
        "2",
      );

      // Kiểm tra hiển thị Lý do hủy (bỏ qua action="restock") và cộng tồn kho khi bấm hoàn kho
      rerenderQueue(
        <AdminOrdersView
          initialData={makeListResult([pending2, cancelledWithRestockNote], {
            availableStockByProductId: { p001: 4 },
          })}
          initialStatus="all"
        />,
      );

      expect(
        screen.getByText("Lý do hủy: Khách từ chối nhận hàng"),
      ).toBeInTheDocument();
      expect(
        screen.queryByText(/Ghi chú hoàn kho nội bộ/i),
      ).not.toBeInTheDocument();

      await user.click(
        screen.getByRole("button", {
          name: "Xác nhận đã nhận hàng hoàn (+kho)",
        }),
      );
      await vi.waitFor(() => {
        expect(screen.getByRole("status")).toHaveTextContent(
          "Còn cho đơn mới: 6",
        );
      });
    });

    it("AdminOrdersPage xử lý searchParams dạng mảng, chuẩn hóa status không hợp lệ về all, chịu lỗi server gracefully; StorefrontChrome hỗ trợ /admin, pathname=null và /admin/login giữ landmark <main>", async () => {
      // 1) searchParams mảng + status không hợp lệ + listAdminOrders ném lỗi -> fallback sang client fetch
      testState.listAdminOrdersMock.mockRejectedValueOnce(
        new Error("Disk IO error"),
      );
      const fetchMock = vi.fn().mockResolvedValue(
        new Response(JSON.stringify(makeListResult([])), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
      vi.stubGlobal("fetch", fetchMock);

      const fallbackUi = await AdminOrdersPage({
        params: Promise.resolve({}),
        searchParams: Promise.resolve({
          status: ["invalid-status", "pending"],
          q: ["  minh  ", "other"],
        }),
      });
      const { unmount } = render(fallbackUi);

      expect(testState.listAdminOrdersMock).toHaveBeenCalledWith({
        status: "all",
        q: "minh",
      });
      expect(screen.getByRole("button", { name: /Tất cả/i })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      expect(
        screen.getByRole("searchbox", { name: "Tìm kiếm đơn hàng" }),
      ).toHaveValue("minh");
      unmount();

      // 2) StorefrontChrome với pathname = "/admin" và pathname = null, cùng landmark <main> trên AdminLoginPage
      testState.pathname = "/admin";
      const loginUi = await AdminLoginPage({
        params: Promise.resolve({}),
        searchParams: Promise.resolve({ expired: ["1"] }),
      });
      const { rerender } = render(
        <StorefrontChrome>{loginUi}</StorefrontChrome>,
      );

      expect(
        screen.queryByLabelText("ShopLite - Trang chủ"),
      ).not.toBeInTheDocument();
      expect(screen.getByRole("main")).toBeInTheDocument();

      testState.pathname = null;
      rerender(
        <StorefrontChrome>
          <div data-testid="null-path-child">Fallback</div>
        </StorefrontChrome>,
      );
      expect(screen.getByLabelText("ShopLite - Trang chủ")).toBeInTheDocument();
      expect(screen.getByTestId("null-path-child")).toBeInTheDocument();
    });

    it("không cộng khống availableStockByProductId khi chuyển trạng thái hoặc hủy đơn lịch sử thiếu statusHistory, chuyển hướng về /admin/login khi nhận 503, và trả focus về listRegion sau khi hủy thành công (200)", async () => {
      const legacyPending: Order = {
        ...makeOrder({
          id: "SL-20261108-LEGACY1",
          status: "pending",
        }),
        statusHistory: undefined,
        inventoryRestocked: undefined,
      };
      const activePending = makeOrder({
        id: "SL-20261121-ACTIVE1",
        status: "pending",
      });

      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              order: {
                ...legacyPending,
                status: "confirmed",
                inventoryRestocked: true,
                statusHistory: [
                  {
                    status: "pending",
                    at: legacyPending.createdAt,
                    actor: "customer",
                    action: "transition",
                  },
                  {
                    status: "confirmed",
                    at: "2026-11-21T04:00:00.000Z",
                    actor: "staff",
                    action: "transition",
                  },
                ],
              },
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          ),
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              order: {
                ...activePending,
                status: "cancelled",
                inventoryRestocked: true,
              },
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          ),
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              error: {
                code: "ADMIN_NOT_CONFIGURED",
                message: "Hệ thống chưa cấu hình mật khẩu quản trị",
              },
            }),
            { status: 503, headers: { "Content-Type": "application/json" } },
          ),
        );
      vi.stubGlobal("fetch", fetchMock);
      const user = userEvent.setup();

      render(
        <AdminOrdersView
          initialData={makeListResult([legacyPending, activePending], {
            availableStockByProductId: { p001: 3 },
          })}
        />,
      );

      const confirmButtons = screen.getAllByRole("button", {
        name: "Xác nhận đơn",
      });
      await user.click(confirmButtons[0]);

      await screen.findByRole("button", { name: "Bàn giao giao hàng" });
      for (const indicator of screen.getAllByRole("status")) {
        expect(indicator).toHaveTextContent("Còn cho đơn mới: 3");
      }

      const cancelButtons = screen.getAllByRole("button", { name: "Hủy đơn" });
      await user.click(cancelButtons[1]);
      const dialog = screen.getByRole("dialog");
      await user.click(
        within(dialog).getByRole("button", { name: "Hết hàng thực tế" }),
      );
      await user.click(
        within(dialog).getByRole("button", { name: "Xác nhận hủy đơn" }),
      );

      await vi.waitFor(() => {
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      });
      const listRegion = screen
        .getByText("SL-20261121-ACTIVE1")
        .closest('[tabindex="-1"]');
      expect(listRegion).toHaveFocus();
      expect(screen.getByRole("status")).toHaveTextContent(
        "Còn cho đơn mới: 5",
      );

      await user.click(
        screen.getByRole("button", { name: "Bàn giao giao hàng" }),
      );
      await vi.waitFor(() => {
        expect(testState.pushMock).toHaveBeenCalledWith("/admin/login");
      });
    });
  });
});
