import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OrderError } from "@/features/orders/order-errors";
import type { Order } from "@/features/orders/types";
import { formatDateTime } from "@/lib/format";

const testState = vi.hoisted(() => ({
  refreshMock: vi.fn(),
  notFoundMock: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  getOrderMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: testState.refreshMock,
  }),
  notFound: () => testState.notFoundMock(),
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
    getOrder: (...args: unknown[]) => testState.getOrderMock(...args),
  },
}));

import OrderDetailPage, {
  dynamic as orderDetailDynamic,
  generateMetadata,
} from "@/app/orders/[id]/page";
import { CancelOrderButton } from "./cancel-order-button";
import {
  OrderProgressTimeline,
  safeFormatDateTime,
} from "./order-progress-timeline";
import { RefreshStatusButton } from "./refresh-status-button";

function makeOrder(overrides: Partial<Order> = {}): Order {
  const id = overrides.id ?? "SL-20261121-A1B2C3";
  const status = overrides.status ?? "pending";
  const createdAt = overrides.createdAt ?? "2026-11-21T01:05:00.000Z";
  const hasExplicitHistory = "statusHistory" in overrides;

  return {
    id,
    status,
    createdAt,
    updatedAt: overrides.updatedAt ?? createdAt,
    customer: overrides.customer ?? {
      fullName: "Anh Minh",
      phone: "0912345678",
      email: "minh@example.com",
      address: "123 Lê Lợi, Quận 1, TP.HCM",
      note: "Giao giờ hành chính",
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
          from: "#6366f1",
          to: "#9333ea",
        },
        unitPrice: 1490000,
        quantity: 2,
        lineTotal: 2980000,
      },
    ],
    subtotal: overrides.subtotal ?? 2980000,
    shippingFee: overrides.shippingFee ?? 0,
    total: overrides.total ?? 2980000,
    ...(hasExplicitHistory
      ? { statusHistory: overrides.statusHistory }
      : {
          statusHistory: [
            {
              status: "pending",
              at: createdAt,
              actor: "customer",
              action: "transition",
            },
          ],
        }),
    ...(overrides.inventoryRestocked !== undefined
      ? { inventoryRestocked: overrides.inventoryRestocked }
      : {}),
  };
}

describe("Timeline tiến trình 4 bước, Làm mới trạng thái & Hủy đơn tại /orders/[id]", () => {
  beforeEach(() => {
    testState.refreshMock.mockReset();
    testState.notFoundMock.mockClear();
    testState.getOrderMock.mockReset();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  describe("1. OrderProgressTimeline — Đơn đang xử lý & hoàn tất (4 bước)", () => {
    it("hiển thị đủ 4 bước cho đơn pending với bước 1 current và các bước 2-4 upcoming ('Chưa hoàn tất')", () => {
      const createdAt = "2026-11-21T01:05:00.000Z";
      const order = makeOrder({
        status: "pending",
        createdAt,
      });

      render(<OrderProgressTimeline order={order} />);

      const section = screen.getByRole("region", {
        name: "Tiến trình đơn hàng",
      });
      const items = within(section).getAllByRole("listitem");
      expect(items).toHaveLength(4);

      expect(items[0]).toHaveAttribute("data-step", "pending");
      expect(items[0]).toHaveAttribute("data-state", "current");
      expect(items[0]).toHaveAttribute("aria-current", "step");
      expect(items[0]).toHaveTextContent("Chờ xác nhận");
      expect(items[0]).toHaveTextContent(formatDateTime(createdAt));

      expect(items[1]).toHaveAttribute("data-step", "confirmed");
      expect(items[1]).toHaveAttribute("data-state", "upcoming");
      expect(items[1]).toHaveTextContent("Đã xác nhận");
      expect(items[1]).toHaveTextContent("Chưa hoàn tất");

      expect(items[2]).toHaveAttribute("data-step", "shipping");
      expect(items[2]).toHaveAttribute("data-state", "upcoming");
      expect(items[2]).toHaveTextContent("Đang giao");
      expect(items[2]).toHaveTextContent("Chưa hoàn tất");

      expect(items[3]).toHaveAttribute("data-step", "delivered");
      expect(items[3]).toHaveAttribute("data-state", "upcoming");
      expect(items[3]).toHaveTextContent("Đã giao");
      expect(items[3]).toHaveTextContent("Chưa hoàn tất");
    });

    it("hiển thị đúng trạng thái confirmed, shipping kèm ghi chú vận chuyển và delivered (cả 4/4 bước done màu xanh)", () => {
      const t1 = "2026-11-21T01:05:00.000Z";
      const t2 = "2026-11-21T01:15:00.000Z";
      const t3 = "2026-11-21T07:20:00.000Z";
      const t4 = "2026-11-22T03:45:00.000Z";

      const confirmedOrder = makeOrder({
        status: "confirmed",
        createdAt: t1,
        updatedAt: t2,
        statusHistory: [
          {
            status: "pending",
            at: t1,
            actor: "customer",
            action: "transition",
          },
          {
            status: "confirmed",
            at: t2,
            actor: "staff",
            action: "transition",
          },
        ],
      });

      const { rerender } = render(
        <OrderProgressTimeline order={confirmedOrder} />,
      );

      let items = screen.getAllByRole("listitem");
      expect(items[0]).toHaveAttribute("data-state", "done");
      expect(items[0]).not.toHaveAttribute("aria-current");
      expect(items[0]).toHaveTextContent(formatDateTime(t1));

      expect(items[1]).toHaveAttribute("data-state", "current");
      expect(items[1]).toHaveAttribute("aria-current", "step");
      expect(items[1]).toHaveTextContent(formatDateTime(t2));

      expect(items[2]).toHaveAttribute("data-state", "upcoming");
      expect(items[2]).toHaveTextContent("Chưa hoàn tất");
      expect(items[3]).toHaveAttribute("data-state", "upcoming");
      expect(items[3]).toHaveTextContent("Chưa hoàn tất");

      const shippingOrder = makeOrder({
        status: "shipping",
        createdAt: t1,
        updatedAt: t3,
        statusHistory: [
          {
            status: "pending",
            at: t1,
            actor: "customer",
            action: "transition",
          },
          {
            status: "confirmed",
            at: t2,
            actor: "staff",
            action: "transition",
          },
          {
            status: "shipping",
            at: t3,
            actor: "staff",
            action: "transition",
            note: "Mã vận đơn GHN-882910",
          },
        ],
      });

      rerender(<OrderProgressTimeline order={shippingOrder} />);

      items = screen.getAllByRole("listitem");
      expect(items[0]).toHaveAttribute("data-state", "done");
      expect(items[0]).toHaveTextContent(formatDateTime(t1));

      expect(items[1]).toHaveAttribute("data-state", "done");
      expect(items[1]).toHaveTextContent(formatDateTime(t2));

      expect(items[2]).toHaveAttribute("data-state", "current");
      expect(items[2]).toHaveAttribute("aria-current", "step");
      expect(items[2]).toHaveTextContent(formatDateTime(t3));
      expect(items[2]).toHaveTextContent("Ghi chú: Mã vận đơn GHN-882910");

      expect(items[3]).toHaveAttribute("data-state", "upcoming");
      expect(items[3]).toHaveTextContent("Chưa hoàn tất");

      const deliveredOrder = makeOrder({
        ...shippingOrder,
        status: "delivered",
        updatedAt: t4,
        statusHistory: [
          ...(shippingOrder.statusHistory ?? []),
          {
            status: "delivered",
            at: t4,
            actor: "staff",
            action: "transition",
          },
        ],
      });

      rerender(<OrderProgressTimeline order={deliveredOrder} />);

      items = screen.getAllByRole("listitem");
      expect(items).toHaveLength(4);
      for (const item of items) {
        expect(item).toHaveAttribute("data-state", "done");
        expect(item).not.toHaveAttribute("aria-current");
      }
      expect(items[2]).toHaveTextContent("Ghi chú: Mã vận đơn GHN-882910");
      expect(items[3]).toHaveTextContent(formatDateTime(t4));
    });
  });

  describe("2. OrderProgressTimeline — Trạng thái hủy (cancelled) & lọc sự kiện restock", () => {
    it("hiển thị hộp trạng thái hủy bởi Cửa hàng kèm thời điểm và lý do hủy", () => {
      const cancelAt = "2026-11-21T01:30:00.000Z";
      const order = makeOrder({
        status: "cancelled",
        updatedAt: cancelAt,
        statusHistory: [
          {
            status: "pending",
            at: "2026-11-21T01:05:00.000Z",
            actor: "customer",
            action: "transition",
          },
          {
            status: "cancelled",
            at: cancelAt,
            actor: "staff",
            action: "transition",
            note: "Hết hàng thực tế (hộp cuối bị móp)",
          },
        ],
      });

      render(<OrderProgressTimeline order={order} />);

      expect(screen.queryByRole("listitem")).not.toBeInTheDocument();
      const statusBox = screen.getByRole("status");
      expect(statusBox).toHaveTextContent("Đơn hàng đã bị hủy bởi Cửa hàng");
      expect(statusBox).toHaveTextContent(
        `Thời điểm: ${formatDateTime(cancelAt)}`,
      );
      expect(statusBox).toHaveTextContent(
        "Lý do: Hết hàng thực tế (hộp cuối bị móp)",
      );
    });

    it("hiển thị hộp trạng thái hủy bởi Khách hàng và bỏ qua sự kiện hoàn kho (action: 'restock')", () => {
      const cancelAt = "2026-11-21T02:00:00.000Z";
      const restockAt = "2026-11-22T04:00:00.000Z";

      const customerCancelled = makeOrder({
        status: "cancelled",
        updatedAt: cancelAt,
        statusHistory: [
          {
            status: "pending",
            at: "2026-11-21T01:05:00.000Z",
            actor: "customer",
            action: "transition",
          },
          {
            status: "cancelled",
            at: cancelAt,
            actor: "customer",
            action: "transition",
          },
        ],
      });

      const { rerender } = render(
        <OrderProgressTimeline order={customerCancelled} />,
      );

      let statusBox = screen.getByRole("status");
      expect(statusBox).toHaveTextContent("Đơn hàng đã bị hủy bởi Khách hàng");
      expect(statusBox).toHaveTextContent(
        `Thời điểm: ${formatDateTime(cancelAt)}`,
      );
      expect(statusBox).not.toHaveTextContent("Lý do:");

      const shippingCancelledThenRestocked = makeOrder({
        status: "cancelled",
        updatedAt: restockAt,
        inventoryRestocked: true,
        statusHistory: [
          {
            status: "pending",
            at: "2026-11-21T01:05:00.000Z",
            actor: "customer",
            action: "transition",
          },
          {
            status: "confirmed",
            at: "2026-11-21T01:15:00.000Z",
            actor: "staff",
            action: "transition",
          },
          {
            status: "shipping",
            at: "2026-11-21T01:25:00.000Z",
            actor: "staff",
            action: "transition",
          },
          {
            status: "cancelled",
            at: cancelAt,
            actor: "staff",
            action: "transition",
            note: "Giao hàng thất bại / Khách không nhận",
          },
          {
            status: "cancelled",
            at: restockAt,
            actor: "staff",
            action: "restock",
            note: "Đã kiểm hàng hoàn về kho đủ phụ kiện",
          },
        ],
      });

      rerender(
        <OrderProgressTimeline order={shippingCancelledThenRestocked} />,
      );

      statusBox = screen.getByRole("status");
      expect(statusBox).toHaveTextContent("Đơn hàng đã bị hủy bởi Cửa hàng");
      expect(statusBox).toHaveTextContent(
        `Thời điểm: ${formatDateTime(cancelAt)}`,
      );
      expect(statusBox).toHaveTextContent(
        "Lý do: Giao hàng thất bại / Khách không nhận",
      );
      expect(statusBox).not.toHaveTextContent(
        "Đã kiểm hàng hoàn về kho đủ phụ kiện",
      );
    });

    it("fallback về 'Đơn đã hủy' khi actor không xác định và fallback thời điểm hủy về updatedAt/createdAt khi cancelEvent.at bị lỗi", () => {
      const createdAt = "2026-11-21T01:05:00.000Z";
      const updatedAt = "2026-11-21T02:10:00.000Z";
      const orderWithUnknownActorAndInvalidAt = makeOrder({
        status: "cancelled",
        createdAt,
        updatedAt,
        statusHistory: [
          {
            status: "cancelled",
            at: "invalid-date",
            actor: "system" as unknown as "staff",
            action: "transition",
          },
        ],
      });

      const { rerender } = render(
        <OrderProgressTimeline order={orderWithUnknownActorAndInvalidAt} />,
      );

      let statusBox = screen.getByRole("status");
      expect(statusBox).toHaveTextContent("Đơn đã hủy");
      expect(statusBox).toHaveTextContent(
        `Thời điểm: ${formatDateTime(updatedAt)}`,
      );

      const orderWithInvalidUpdatedToo = makeOrder({
        ...orderWithUnknownActorAndInvalidAt,
        updatedAt: "1",
      });
      rerender(<OrderProgressTimeline order={orderWithInvalidUpdatedToo} />);

      statusBox = screen.getByRole("status");
      expect(statusBox).toHaveTextContent(
        `Thời điểm: ${formatDateTime(createdAt)}`,
      );
    });
  });

  describe("3. OrderProgressTimeline — Tương thích ngược đơn lịch sử thiếu statusHistory", () => {
    it("hiển thị đủ 4 bước cho đơn cũ delivered thiếu statusHistory (kèm trường thừa discount) với createdAt, '—', '—', updatedAt", () => {
      const createdAt = "2026-11-08T01:00:00.000Z";
      const updatedAt = "2026-11-09T10:30:00.000Z";
      const legacyDelivered = {
        ...makeOrder({
          status: "delivered",
          createdAt,
          updatedAt,
          statusHistory: undefined,
        }),
        discount: 50000,
        couponCode: "WELCOME50",
      } as Order;

      render(<OrderProgressTimeline order={legacyDelivered} />);

      const items = screen.getAllByRole("listitem");
      expect(items).toHaveLength(4);
      expect(items[0]).toHaveAttribute("data-state", "done");
      expect(items[0]).toHaveTextContent(formatDateTime(createdAt));

      expect(items[1]).toHaveAttribute("data-state", "done");
      expect(within(items[1]).getByText("—")).toBeInTheDocument();

      expect(items[2]).toHaveAttribute("data-state", "done");
      expect(within(items[2]).getByText("—")).toBeInTheDocument();

      expect(items[3]).toHaveAttribute("data-state", "done");
      expect(items[3]).toHaveTextContent(formatDateTime(updatedAt));
    });

    it("tương thích ngược đơn cũ pending, confirmed, shipping thiếu statusHistory và đơn có statusHistory một phần hoặc mốc thời gian lỗi", () => {
      const createdAt = "2026-11-08T01:00:00.000Z";
      const updatedAt = "2026-11-08T05:30:00.000Z";

      const legacyPending = makeOrder({
        status: "pending",
        createdAt,
        updatedAt,
        statusHistory: undefined,
      });
      const { rerender } = render(
        <OrderProgressTimeline order={legacyPending} />,
      );
      let items = screen.getAllByRole("listitem");
      expect(items[0]).toHaveAttribute("data-state", "current");
      expect(items[0]).toHaveTextContent(formatDateTime(createdAt));
      expect(items[1]).toHaveAttribute("data-state", "upcoming");

      const legacyConfirmed = makeOrder({
        status: "confirmed",
        createdAt,
        updatedAt,
        statusHistory: undefined,
      });
      rerender(<OrderProgressTimeline order={legacyConfirmed} />);
      items = screen.getAllByRole("listitem");
      expect(items[0]).toHaveAttribute("data-state", "done");
      expect(items[0]).toHaveTextContent(formatDateTime(createdAt));
      expect(items[1]).toHaveAttribute("data-state", "current");
      expect(items[1]).toHaveTextContent(formatDateTime(updatedAt));
      expect(items[2]).toHaveAttribute("data-state", "upcoming");

      const legacyShipping = makeOrder({
        status: "shipping",
        createdAt,
        updatedAt,
        statusHistory: undefined,
      });
      rerender(<OrderProgressTimeline order={legacyShipping} />);
      items = screen.getAllByRole("listitem");
      expect(items[0]).toHaveAttribute("data-state", "done");
      expect(items[0]).toHaveTextContent(formatDateTime(createdAt));
      expect(items[1]).toHaveAttribute("data-state", "done");
      expect(within(items[1]).getByText("—")).toBeInTheDocument();
      expect(items[2]).toHaveAttribute("data-state", "current");
      expect(items[2]).toHaveTextContent(formatDateTime(updatedAt));
      expect(items[3]).toHaveAttribute("data-state", "upcoming");

      const partialHistoryShipping = makeOrder({
        status: "shipping",
        createdAt,
        updatedAt: "invalid-date",
        statusHistory: [
          {
            status: "pending",
            at: "1",
            actor: "customer",
            action: "transition",
          },
        ],
      });
      rerender(<OrderProgressTimeline order={partialHistoryShipping} />);
      items = screen.getAllByRole("listitem");
      expect(items[0]).toHaveTextContent(formatDateTime(createdAt));
      expect(within(items[1]).getByText("—")).toBeInTheDocument();
      expect(items[2]).toHaveTextContent(formatDateTime(createdAt));
    });

    it("hiển thị 'Đơn đã hủy' kèm updatedAt và ẩn tác nhân/lý do cho đơn hủy cũ thiếu statusHistory", () => {
      const createdAt = "2026-11-08T01:00:00.000Z";
      const updatedAt = "2026-11-08T03:00:00.000Z";
      const legacyCancelled = makeOrder({
        status: "cancelled",
        createdAt,
        updatedAt,
        statusHistory: undefined,
      });

      render(<OrderProgressTimeline order={legacyCancelled} />);

      const statusBox = screen.getByRole("status");
      expect(statusBox).toHaveTextContent("Đơn đã hủy");
      expect(statusBox).toHaveTextContent(
        `Thời điểm: ${formatDateTime(updatedAt)}`,
      );
      expect(statusBox).not.toHaveTextContent("bởi Cửa hàng");
      expect(statusBox).not.toHaveTextContent("bởi Khách hàng");
      expect(statusBox).not.toHaveTextContent("Lý do:");
    });

    it("safeFormatDateTime xử lý chuỗi ngày lỗi, số ngắn ('1') hoặc rỗng an toàn không ném ngoại lệ", () => {
      expect(safeFormatDateTime("invalid-iso-date")).toBe("—");
      expect(safeFormatDateTime("1")).toBe("—");
      expect(safeFormatDateTime("2026-99-99")).toBe("—");
      expect(safeFormatDateTime("")).toBe("—");
      expect(safeFormatDateTime("   ")).toBe("—");
      expect(safeFormatDateTime(undefined)).toBe("—");
      expect(safeFormatDateTime(null)).toBe("—");
    });
  });

  describe("4. RefreshStatusButton — Làm mới thủ công không dùng polling", () => {
    it("gọi router.refresh() khi bấm, đạt kích thước chạm min-h-11 và không tạo setInterval", async () => {
      const setIntervalSpy = vi.spyOn(globalThis, "setInterval");
      const user = userEvent.setup();

      render(<RefreshStatusButton />);

      expect(setIntervalSpy).not.toHaveBeenCalled();

      const button = screen.getByRole("button", {
        name: "Làm mới trạng thái",
      });
      expect(button.className).toContain("min-h-11");

      await user.click(button);
      expect(testState.refreshMock).toHaveBeenCalledTimes(1);
    });

    it("chống bấm đúp trong cùng một tick chỉ gọi router.refresh() đúng 1 lần", () => {
      render(<RefreshStatusButton />);

      const button = screen.getByRole("button", {
        name: "Làm mới trạng thái",
      });
      fireEvent.click(button);
      fireEvent.click(button);

      expect(testState.refreshMock).toHaveBeenCalledTimes(1);
    });
  });

  describe("5. CancelOrderButton — Xác nhận 2 bước, xung đột 409 tự refresh & lỗi mạng/500", () => {
    it("xác nhận 2 bước, gửi PATCH thành công, đóng khung xác nhận và gọi router.refresh()", async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ order: makeOrder({ status: "cancelled" }) }),
      });
      vi.stubGlobal("fetch", fetchMock);
      const user = userEvent.setup();

      render(<CancelOrderButton orderId="SL-20261121-A1B2C3" />);

      const openButton = screen.getByRole("button", { name: "Hủy đơn hàng" });
      expect(openButton.className).toContain("min-h-11");
      await user.click(openButton);

      const dismissButton = screen.getByRole("button", { name: "Không" });
      expect(dismissButton.className).toContain("min-h-11");
      await user.click(dismissButton);
      expect(
        screen.getByRole("button", { name: "Hủy đơn hàng" }),
      ).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "Hủy đơn hàng" }));
      const confirmButton = screen.getByRole("button", {
        name: "Xác nhận hủy",
      });
      expect(confirmButton.className).toContain("min-h-11");

      await user.click(confirmButton);

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/orders/SL-20261121-A1B2C3",
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({ status: "cancelled" }),
        }),
      );
      expect(testState.refreshMock).toHaveBeenCalledTimes(1);
      const lockedButton = screen.getByRole("button", { name: "Hủy đơn hàng" });
      expect(lockedButton).toBeInTheDocument();
      expect(lockedButton).toBeDisabled();

      fireEvent.click(lockedButton);
      expect(
        screen.queryByRole("button", { name: "Xác nhận hủy" }),
      ).not.toBeInTheDocument();
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("chống bấm đúp và khóa nút 'Không' khi request PATCH đang chờ xử lý", async () => {
      let resolveFetch!: (value: unknown) => void;
      const fetchMock = vi.fn(
        () =>
          new Promise((resolve) => {
            resolveFetch = resolve;
          }),
      );
      vi.stubGlobal("fetch", fetchMock);

      render(<CancelOrderButton orderId="SL-20261121-A1B2C3" />);
      fireEvent.click(screen.getByRole("button", { name: "Hủy đơn hàng" }));

      const confirmButton = screen.getByRole("button", {
        name: "Xác nhận hủy",
      });
      const dismissButton = screen.getByRole("button", { name: "Không" });
      fireEvent.click(confirmButton);
      fireEvent.click(confirmButton);

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(screen.getByRole("button", { name: "Đang hủy…" })).toBeDisabled();
      expect(dismissButton).toBeDisabled();

      fireEvent.click(dismissButton);
      fireEvent.keyDown(dismissButton, { key: "Escape" });
      expect(
        screen.getByText("Bạn chắc chắn muốn hủy đơn hàng này?"),
      ).toBeInTheDocument();

      resolveFetch({
        ok: true,
        status: 200,
        json: async () => ({}),
      });

      const afterResolveButton = await screen.findByRole("button", {
        name: "Hủy đơn hàng",
      });
      expect(afterResolveButton).toBeDisabled();
    });

    it("khi nhận 409 hoặc mã INVALID_STATUS_TRANSITION: hiển thị role='alert' (kể cả khi body rỗng/không phải JSON), khóa nút 'Xác nhận hủy' và gọi router.refresh()", async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce({
          ok: false,
          status: 409,
          json: async () => ({
            error: {
              code: "INVALID_STATUS_TRANSITION",
              message:
                'Không thể chuyển đơn hàng từ trạng thái "Đã xác nhận" sang "Đã hủy"',
            },
          }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 409,
          json: async () => {
            throw new Error("Invalid JSON");
          },
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 400,
          json: async () => ({
            error: {
              code: "INVALID_STATUS_TRANSITION",
              message: "   ",
            },
          }),
        });
      vi.stubGlobal("fetch", fetchMock);
      const user = userEvent.setup();

      const { unmount: unmount1 } = render(
        <CancelOrderButton orderId="SL-20261121-A1B2C3" />,
      );

      await user.click(screen.getByRole("button", { name: "Hủy đơn hàng" }));
      await user.click(screen.getByRole("button", { name: "Xác nhận hủy" }));

      let alert = await screen.findByRole("alert");
      expect(alert).toHaveTextContent(
        'Không thể chuyển đơn hàng từ trạng thái "Đã xác nhận" sang "Đã hủy"',
      );
      expect(
        screen.getByRole("button", { name: "Xác nhận hủy" }),
      ).toBeDisabled();
      expect(testState.refreshMock).toHaveBeenCalledTimes(1);
      unmount1();

      const { unmount: unmount2 } = render(
        <CancelOrderButton orderId="SL-20261121-A1B2C4" />,
      );
      await user.click(screen.getByRole("button", { name: "Hủy đơn hàng" }));
      await user.click(screen.getByRole("button", { name: "Xác nhận hủy" }));

      alert = await screen.findByRole("alert");
      expect(alert).toHaveTextContent(
        "Đơn hàng đã được xác nhận, không thể hủy.",
      );
      expect(
        screen.getByRole("button", { name: "Xác nhận hủy" }),
      ).toBeDisabled();
      expect(testState.refreshMock).toHaveBeenCalledTimes(2);
      unmount2();

      render(<CancelOrderButton orderId="SL-20261121-A1B2C5" />);
      await user.click(screen.getByRole("button", { name: "Hủy đơn hàng" }));
      await user.click(screen.getByRole("button", { name: "Xác nhận hủy" }));

      alert = await screen.findByRole("alert");
      expect(alert).toHaveTextContent(
        "Đơn hàng đã được xác nhận, không thể hủy.",
      );
      expect(
        screen.getByRole("button", { name: "Xác nhận hủy" }),
      ).toBeDisabled();
      expect(testState.refreshMock).toHaveBeenCalledTimes(3);
    });

    it("khi gặp lỗi mạng hoặc lỗi 500 (body lỗi/custom message): hiển thị role='alert', cho phép đóng bằng Escape hoặc nút 'Không' và xóa lỗi khi mở lại", async () => {
      const fetchMock = vi
        .fn()
        .mockRejectedValueOnce(new Error("Network failure"))
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          json: async () => {
            throw new Error("Non-JSON 500");
          },
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          json: async () => ({
            error: {
              code: "INTERNAL_ERROR",
              message: "Hệ thống đang bảo trì, vui lòng thử lại sau",
            },
          }),
        });
      vi.stubGlobal("fetch", fetchMock);
      const user = userEvent.setup();

      render(<CancelOrderButton orderId="SL-20261121-A1B2C3" />);

      await user.click(screen.getByRole("button", { name: "Hủy đơn hàng" }));
      await user.click(screen.getByRole("button", { name: "Xác nhận hủy" }));

      let alert = await screen.findByRole("alert");
      expect(alert).toHaveTextContent(
        "Không thể kết nối máy chủ. Vui lòng kiểm tra mạng và thử lại.",
      );
      expect(testState.refreshMock).not.toHaveBeenCalled();

      await user.click(screen.getByRole("button", { name: "Xác nhận hủy" }));
      alert = await screen.findByRole("alert");
      expect(alert).toHaveTextContent("Không thể hủy đơn hàng");
      expect(testState.refreshMock).not.toHaveBeenCalled();

      await user.click(screen.getByRole("button", { name: "Xác nhận hủy" }));
      alert = await screen.findByRole("alert");
      expect(alert).toHaveTextContent(
        "Hệ thống đang bảo trì, vui lòng thử lại sau",
      );

      fireEvent.keyDown(alert, { key: "Escape" });
      expect(
        screen.getByRole("button", { name: "Hủy đơn hàng" }),
      ).toBeInTheDocument();
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "Hủy đơn hàng" }));
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
  });

  describe("6. OrderDetailPage (RSC /orders/[id]) — Tích hợp Timeline, Refresh, ?placed=1 & 404", () => {
    it("khai báo dynamic = 'force-dynamic' và generateMetadata trả về đúng tiêu đề đơn hàng", async () => {
      expect(orderDetailDynamic).toBe("force-dynamic");
      const meta = await generateMetadata({
        params: Promise.resolve({ id: "SL-20261121-A1B2C3" }),
        searchParams: Promise.resolve({}),
      });
      expect(meta).toEqual({ title: "Đơn hàng SL-20261121-A1B2C3" });
    });

    it("hiển thị banner ?placed=1, nút Làm mới trạng thái, nút Hủy đơn hàng và Timeline khi đơn ở trạng thái pending", async () => {
      const pendingOrder = makeOrder({
        id: "SL-20261121-A1B2C3",
        status: "pending",
        paymentMethod: "bank_transfer",
      });
      testState.getOrderMock.mockResolvedValue(pendingOrder);

      const jsx = await OrderDetailPage({
        params: Promise.resolve({ id: pendingOrder.id }),
        searchParams: Promise.resolve({ placed: ["1"] }),
      });
      render(jsx);

      expect(screen.getByText("Đặt hàng thành công!")).toBeInTheDocument();
      const backLink = screen.getByRole("link", { name: /Tất cả đơn hàng/ });
      expect(backLink).toHaveAttribute("href", "/orders");
      expect(backLink.className).toContain("min-h-11");
      expect(
        screen.getByRole("button", { name: "Làm mới trạng thái" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Hủy đơn hàng" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("region", { name: "Tiến trình đơn hàng" }),
      ).toBeInTheDocument();
      expect(
        screen.queryByText(
          "Đơn hàng đã được xác nhận — vui lòng liên hệ cửa hàng nếu cần hỗ trợ.",
        ),
      ).not.toBeInTheDocument();
    });

    it("hiển thị đúng trang chi tiết cho đơn pending không có ?placed=1, đơn delivered, đơn cancelled và bản ghi cũ thiếu customer/items", async () => {
      const pendingNoPlaced = makeOrder({
        id: "SL-20261121-PEND02",
        status: "pending",
      });
      testState.getOrderMock.mockResolvedValueOnce(pendingNoPlaced);

      const pendingJsx = await OrderDetailPage({
        params: Promise.resolve({ id: pendingNoPlaced.id }),
        searchParams: Promise.resolve({}),
      });
      const { unmount: unmountPending } = render(pendingJsx);
      expect(
        screen.queryByText("Đặt hàng thành công!"),
      ).not.toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Hủy đơn hàng" }),
      ).toBeInTheDocument();
      unmountPending();

      const deliveredOrder = makeOrder({
        id: "SL-20261121-DELV01",
        status: "delivered",
      });
      testState.getOrderMock.mockResolvedValueOnce(deliveredOrder);

      const deliveredJsx = await OrderDetailPage({
        params: Promise.resolve({ id: deliveredOrder.id }),
        searchParams: Promise.resolve({}),
      });
      const { unmount: unmountDelivered } = render(deliveredJsx);
      expect(
        screen.queryByRole("button", { name: "Hủy đơn hàng" }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByText(
          "Đơn hàng đã được xác nhận — vui lòng liên hệ cửa hàng nếu cần hỗ trợ.",
        ),
      ).not.toBeInTheDocument();
      unmountDelivered();

      const cancelledCorruptedOrder = {
        ...makeOrder({
          id: "SL-20261121-CANC01",
          status: "cancelled",
          createdAt: "1",
          statusHistory: undefined,
        }),
        customer: undefined,
        items: undefined,
      } as unknown as Order;
      testState.getOrderMock.mockResolvedValueOnce(cancelledCorruptedOrder);

      const cancelledJsx = await OrderDetailPage({
        params: Promise.resolve({ id: cancelledCorruptedOrder.id }),
        searchParams: Promise.resolve({}),
      });
      render(cancelledJsx);

      expect(
        screen.queryByRole("button", { name: "Hủy đơn hàng" }),
      ).not.toBeInTheDocument();
      expect(screen.getByRole("status")).toHaveTextContent("Đơn đã hủy");
      expect(screen.getByText("Đặt lúc —")).toBeInTheDocument();
    });

    it("ẩn nút Hủy đơn hàng và hiển thị dòng giải thích liên hệ cửa hàng khi đơn ở trạng thái confirmed hoặc shipping", async () => {
      const confirmedOrder = makeOrder({
        id: "SL-20261121-C0NF01",
        status: "confirmed",
      });
      testState.getOrderMock.mockResolvedValueOnce(confirmedOrder);

      const confirmedJsx = await OrderDetailPage({
        params: Promise.resolve({ id: confirmedOrder.id }),
        searchParams: Promise.resolve({ placed: "1" }),
      });
      const { unmount } = render(confirmedJsx);

      expect(
        screen.queryByText("Đặt hàng thành công!"),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "Hủy đơn hàng" }),
      ).not.toBeInTheDocument();
      expect(
        screen.getByText(
          "Đơn hàng đã được xác nhận — vui lòng liên hệ cửa hàng nếu cần hỗ trợ.",
        ),
      ).toBeInTheDocument();
      unmount();

      const shippingOrder = makeOrder({
        id: "SL-20261121-SH1P01",
        status: "shipping",
      });
      testState.getOrderMock.mockResolvedValueOnce(shippingOrder);

      const shippingJsx = await OrderDetailPage({
        params: Promise.resolve({ id: shippingOrder.id }),
        searchParams: Promise.resolve({}),
      });
      render(shippingJsx);

      expect(
        screen.queryByRole("button", { name: "Hủy đơn hàng" }),
      ).not.toBeInTheDocument();
      expect(
        screen.getByText(
          "Đơn hàng đã được xác nhận — vui lòng liên hệ cửa hàng nếu cần hỗ trợ.",
        ),
      ).toBeInTheDocument();
    });

    it("gọi notFound() khi không tìm thấy đơn hàng (ORDER_NOT_FOUND)", async () => {
      testState.getOrderMock.mockRejectedValue(
        new OrderError("ORDER_NOT_FOUND", "Không tìm thấy đơn hàng"),
      );

      await expect(
        OrderDetailPage({
          params: Promise.resolve({ id: "SL-20261121-MISSING" }),
          searchParams: Promise.resolve({}),
        }),
      ).rejects.toThrow("NEXT_NOT_FOUND");
      expect(testState.notFoundMock).toHaveBeenCalledTimes(1);
    });
  });
});
