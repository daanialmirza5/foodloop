import { requireUser } from "@/lib/session";
import { DashboardNav } from "@/components/dashboard-nav";

export const metadata = { title: "Administration" };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireUser(["admin"], "/admin");
  return (
    <div className="container-page flex flex-col gap-6 py-8 lg:flex-row">
      <DashboardNav role="admin" title="Administration" />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
