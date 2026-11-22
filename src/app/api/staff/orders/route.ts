import { listOrdersForStaff } from "@/features/orders/staff-orders-route";

/** GET /api/staff/orders?status=&q= - danh sách đơn cho nhân viên. */
export async function GET(request: Request) {
  return listOrdersForStaff(request);
}
