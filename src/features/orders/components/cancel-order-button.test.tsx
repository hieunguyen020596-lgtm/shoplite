import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { CancelOrderButton } from "./cancel-order-button";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

const ORDER_ID = "SL-20261021-000001";

// jsdom chưa hỗ trợ <dialog>.showModal()/close(): giả lập tối thiểu (mở/đóng + sự kiện close).
const originalShowModal = HTMLDialogElement.prototype.showModal;
const originalClose = HTMLDialogElement.prototype.close;
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    if (!this.hasAttribute("open")) return;
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  };
});
afterAll(() => {
  HTMLDialogElement.prototype.showModal = originalShowModal;
  HTMLDialogElement.prototype.close = originalClose;
});

/** Mô phỏng nhấn Esc: trình duyệt phát "cancel", nếu không bị chặn thì đóng dialog. */
function pressEscape(dialog: HTMLDialogElement) {
  act(() => {
    const event = new Event("cancel", { cancelable: true });
    dialog.dispatchEvent(event);
    if (!event.defaultPrevented) dialog.close();
  });
}

// Dialog đang đóng bị coi là ẩn (không tính được tên) nên tìm theo role với hidden: true.
const getDialog = () => screen.getByRole<HTMLDialogElement>("dialog", { hidden: true });

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const errorResponse = (status: number, code: string, message: string) =>
  jsonResponse(status, { error: { code, message } });

async function openAndConfirm() {
  const user = userEvent.setup();
  render(<CancelOrderButton orderId={ORDER_ID} />);
  await user.click(screen.getByRole("button", { name: "Hủy đơn hàng" }));
  await user.click(screen.getByRole("button", { name: "Xác nhận hủy" }));
  return user;
}

describe("<CancelOrderButton />", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    refresh.mockReset();
  });

  it("bấm Hủy đơn hàng thì mở dialog xác nhận, focus ở Không và chưa gửi yêu cầu", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<CancelOrderButton orderId={ORDER_ID} />);
    expect(getDialog()).not.toHaveAttribute("open");

    await user.click(screen.getByRole("button", { name: "Hủy đơn hàng" }));

    const dialog = screen.getByRole("dialog", { name: "Hủy đơn hàng?" });
    expect(dialog).toHaveAttribute("open");
    expect(dialog).toHaveAccessibleDescription(
      `Đơn hàng ${ORDER_ID} sẽ bị hủy và không thể khôi phục.`,
    );
    expect(screen.getByRole("button", { name: "Không" })).toHaveFocus();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("bấm Không thì đóng dialog, không gửi yêu cầu và focus về nút Hủy đơn hàng", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<CancelOrderButton orderId={ORDER_ID} />);

    await user.click(screen.getByRole("button", { name: "Hủy đơn hàng" }));
    await user.click(screen.getByRole("button", { name: "Không" }));

    expect(getDialog()).not.toHaveAttribute("open");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Hủy đơn hàng" })).toHaveFocus();
  });

  it("nhấn Esc thì đóng dialog và không gửi yêu cầu", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<CancelOrderButton orderId={ORDER_ID} />);

    await user.click(screen.getByRole("button", { name: "Hủy đơn hàng" }));
    pressEscape(getDialog());

    expect(getDialog()).not.toHaveAttribute("open");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("đang gửi yêu cầu thì Esc không đóng dialog và hai nút bị vô hiệu hóa", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise<Response>(() => {})),
    );

    await openAndConfirm();
    pressEscape(getDialog());

    expect(getDialog()).toHaveAttribute("open");
    expect(screen.getByRole("button", { name: "Đang hủy…" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Không" })).toBeDisabled();
  });

  it("đóng dialog sau khi lỗi thì lần mở sau không còn lỗi cũ", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(errorResponse(400, "VALIDATION_ERROR", "Yêu cầu không hợp lệ")),
    );
    const user = await openAndConfirm();
    expect(screen.getByRole("alert")).toHaveTextContent("Yêu cầu không hợp lệ");

    await user.click(screen.getByRole("button", { name: "Không" }));
    await user.click(screen.getByRole("button", { name: "Hủy đơn hàng" }));

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("hủy thành công thì gửi PATCH status cancelled và tải lại trang", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { id: ORDER_ID }));
    vi.stubGlobal("fetch", fetchMock);

    await openAndConfirm();

    expect(fetchMock).toHaveBeenCalledWith(
      `/api/orders/${ORDER_ID}`,
      expect.objectContaining({ method: "PATCH", body: JSON.stringify({ status: "cancelled" }) }),
    );
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("đơn đã đổi trạng thái (409) thì hiện thông báo và tải lại trang", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          errorResponse(
            409,
            "INVALID_STATUS_TRANSITION",
            "Chỉ có thể hủy đơn hàng đang ở trạng thái Chờ xác nhận",
          ),
        ),
    );

    await openAndConfirm();

    expect(
      screen.getByText("Chỉ có thể hủy đơn hàng đang ở trạng thái Chờ xác nhận"),
    ).toBeVisible();
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("đơn không còn tồn tại (404) thì tải lại trang", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(errorResponse(404, "ORDER_NOT_FOUND", "Không tìm thấy đơn hàng")),
    );

    await openAndConfirm();

    expect(refresh).toHaveBeenCalledOnce();
  });

  it("lỗi dữ liệu (400) thì hiện thông báo, không tải lại trang và cho bấm lại", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(errorResponse(400, "VALIDATION_ERROR", "Yêu cầu không hợp lệ")),
    );

    await openAndConfirm();

    expect(screen.getByText("Yêu cầu không hợp lệ")).toBeVisible();
    expect(refresh).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Xác nhận hủy" })).toBeEnabled();
  });

  it("lỗi server không đọc được nội dung thì hiện thông báo mặc định", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("<html>", { status: 500 })));

    await openAndConfirm();

    expect(screen.getByText("Không thể hủy đơn hàng")).toBeVisible();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("mất kết nối thì thoát trạng thái Đang hủy, báo lỗi và cho bấm lại", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

    await openAndConfirm();

    expect(screen.getByText("Không kết nối được máy chủ, vui lòng thử lại.")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Đang hủy…" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Xác nhận hủy" })).toBeEnabled();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("thử lại sau khi mất kết nối thì xóa lỗi cũ và hủy thành công", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockRejectedValueOnce(new TypeError("Failed to fetch"))
        .mockResolvedValueOnce(jsonResponse(200, { id: ORDER_ID })),
    );
    const user = await openAndConfirm();

    await user.click(screen.getByRole("button", { name: "Xác nhận hủy" }));

    expect(
      screen.queryByText("Không kết nối được máy chủ, vui lòng thử lại."),
    ).not.toBeInTheDocument();
    expect(refresh).toHaveBeenCalledOnce();
  });
});
