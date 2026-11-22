import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AccessError } from "./access-errors";
import type { StaffIdentity } from "./auth-service";
import { requireStaff } from "./guards";
import { safeStaffNext, STAFF_PATH_HEADER } from "./next-path";

/** Guard cho page/layout nhân viên: chưa có phiên hợp lệ thì chuyển về /staff/login?next=… */
export async function requireStaffPage(): Promise<StaffIdentity> {
  try {
    return await requireStaff();
  } catch (error) {
    if (error instanceof AccessError) {
      const next = safeStaffNext((await headers()).get(STAFF_PATH_HEADER));
      redirect(`/staff/login?next=${encodeURIComponent(next)}`);
    }
    throw error;
  }
}
