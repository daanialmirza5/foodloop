import { Bell } from "lucide-react";
import { requireUser } from "@/lib/session";
import { listNotifications } from "@/lib/services/notifications";
import { markReadAction } from "@/lib/actions";
import { formatDateTime } from "@/lib/format";
import { EmptyState, PageHeader } from "@/components/ui";
import { cn } from "@/lib/format";

export const metadata = { title: "Notifications" };

export default async function Notifications() {
  const actor = await requireUser(undefined, "/dashboard/notifications");
  const rows = listNotifications(actor.id);
  const unread = rows.filter((r) => !r.read_at).length;
  return (
    <>
      <PageHeader
        title="Notifications"
        subtitle={`${unread} unread · In-app only — email/WhatsApp delivery is not configured in this build.`}
        actions={
          unread > 0 && (
            <form action={markReadAction}>
              <button className="btn-secondary btn-sm">Mark all as read</button>
            </form>
          )
        }
      />
      {rows.length ? (
        <ul className="card divide-y divide-black/5">
          {rows.map((n) => (
            <li key={n.id}>
              <form action={markReadAction}>
                <input type="hidden" name="id" value={n.id} />
                <input type="hidden" name="link" value={n.link ?? ""} />
                <button type="submit" className={cn("flex w-full gap-3 px-5 py-4 text-left hover:bg-sand/40", !n.read_at && "bg-forest-50/50")}>
                  <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", n.read_at ? "bg-transparent" : "bg-saffron-500")} aria-label={n.read_at ? undefined : "Unread"} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-forest-900">{n.title}</span>
                    {n.body && <span className="mt-0.5 block text-sm text-ink/70">{n.body}</span>}
                    <span className="mt-1 block text-xs text-muted">{formatDateTime(n.created_at)}</span>
                  </span>
                </button>
              </form>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState icon={<Bell className="size-5" />} title="You're all caught up" />
      )}
    </>
  );
}
