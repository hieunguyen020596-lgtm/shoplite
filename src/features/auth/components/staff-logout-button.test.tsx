import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { StaffLogoutButton } from "./staff-logout-button";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh: vi.fn() }),
}));

describe("<StaffLogoutButton />", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    push.mockReset();
  });

  it("gọi API logout rồi chuyển về /staff/login", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);
    render(<StaffLogoutButton />);

    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Đăng xuất" }));

    expect(fetchMock).toHaveBeenCalledWith("/api/staff/logout", {
      method: "POST",
    });
    await waitFor(() => expect(push).toHaveBeenCalledWith("/staff/login"));
  });
});
