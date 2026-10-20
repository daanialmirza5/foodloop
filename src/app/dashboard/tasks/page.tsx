import Link from "next/link";
import { MapPinned } from "lucide-react";
import { requireUser } from "@/lib/session";
import { openTasks } from "@/lib/services/logistics";
import { getVolunteerProfile } from "@/lib/services/logistics";
import { formatDateTime, formatKg, timeUntil } from "@/lib/format";
import { Alert, DemoBadge, EmptyState, PageHeader, Pill, UrgencyBadge } from "@/components/ui";
import { ClaimForm } from "@/components/workflow-forms";

export const metadata = { title: "Available tasks" };

export default async function Tasks({ searchParams }: { searchParams: Promise<{ urgent?: string; event?: string }> }) {
  const actor = await requireUser(["volunteer"], "/dashboard/tasks");
  const sp = await searchParams;
  const profile = getVolunteerProfile(actor.id);
  const tasks = openTasks().filter((t) => (!sp.urgent || t.is_urgent) && (!sp.event || t.source === "event_surplus"));
  return (
    <>
      <PageHeader
        title="Available collection tasks"
        subtitle="Exact pickup address and contact details unlock after you accept. Only one volunteer can take each task."
        actions={
          <div className="flex gap-2">
            <Link href={sp.urgent ? "/dashboard/tasks" : "/dashboard/tasks?urgent=1"} className="btn-secondary btn-sm">
              {sp.urgent ? "All tasks" : "Urgent only"}
            </Link>
            <Link href={sp.event ? "/dashboard/tasks" : "/dashboard/tasks?event=1"} className="btn-secondary btn-sm">
              {sp.event ? "All sources" : "Event donations"}
            </Link>
          </div>
        }
      />
      {!profile?.food_safety_trained && (
        <Alert tone="info" className="mb-6">
          Please review the <Link href="/food-safety" className="link">food-safety guidance</Link> and update your <Link href="/dashboard/volunteer-profile" className="link">volunteer profile</Link>.
        </Alert>
      )}
      {tasks.length ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {tasks.map((t) => (
            <div key={t.id} className="card p-5">
              <div className="flex flex-wrap items-center gap-2">
                {t.is_urgent ? <Pill tone="red">Urgent</Pill> : null}
                {t.source === "event_surplus" && <Pill tone="amber">Event</Pill>}
                <UrgencyBadge deadline={t.collection_deadline} />
                <DemoBadge show={t.is_demo} />
              </div>
              <Link href={`/discover/${t.listing_id}`} className="mt-2 block font-semibold text-forest-900 hover:underline">
                {t.title}
              </Link>
              <dl className="mt-2 grid grid-cols-2 gap-2 text-sm">
                <div>
                  <dt className="text-xs text-muted">Pickup area</dt>
                  <dd>{t.city}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Deliver to</dt>
                  <dd>{t.org_name}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Quantity</dt>
                  <dd>{formatKg(t.quantity_kg)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Collect by</dt>
                  <dd>
                    {formatDateTime(t.collection_deadline)} <span className="text-xs text-muted">({timeUntil(t.collection_deadline)})</span>
                  </dd>
                </div>
              </dl>
              <div className="mt-4">
                <ClaimForm collectionId={t.id} defaultEta={t.pickup_window_start} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState icon={<MapPinned className="size-5" />} title="No open tasks right now" body="You'll get an in-app notification when a collection needs a volunteer." />
      )}
    </>
  );
}
