import { StaffHeader } from "@/components/layout/staff-header";
import { requireStaffPage } from "@/features/auth/page-guard";

export default async function StaffLayout({ children }: LayoutProps<"/staff">) {
  const staff = await requireStaffPage();
  return (
    <>
      <StaffHeader displayName={staff.displayName} />
      {children}
    </>
  );
}
