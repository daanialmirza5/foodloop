import { requireUser } from "@/lib/session";
import { DashboardNav } from "@/components/dashboard-nav";
import { ROLE_LABELS } from "@/lib/constants";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const actor = await requireUser();
  return (
    <div className="container-page flex flex-col gap-6 py-8 lg:flex-row">
      <DashboardNav role={actor.role} title={ROLE_LABELS[actor.role]} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
