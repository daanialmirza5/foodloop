import Link from "next/link";
import { Phone, Truck } from "lucide-react";
import { requireUser } from "@/lib/session";
import { listCollections, volunteerStats } from "@/lib/services/logistics";
import { formatDateTime, formatKg } from "@/lib/format";
import { DemoBadge, EmptyState, PageHeader, Section, StatCard, StatusBadge, UrgencyBadge } from "@/components/ui";
import { HandoverForm, IncidentForm, PickupForm } from "@/components/workflow-forms";
import { ConfirmAction } from "@/components/forms";
import { failCollectionAction, releaseTaskAction } from "@/lib/actions";

export const metadata = { title: "My assignments" };

export default async function Assignments() {
  const actor = await requireUser(["volunteer"], "/dashboard/assignments");
  const all = listCollections({ volunteerId: actor.id });
  const active = all.filter((c) => ["assigned", "in_transit"].includes(c.status));
  const past = all.filter((c) => !["assigned", "in_transit"].includes(c.status));
  const s = volunteerStats(actor.id);
  return (
    <>
      <PageHeader title="My assignments" subtitle="Record each step so the donor and recipient can follow the food." />
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Active" value={s.active ?? 0} />
        <StatCard label="Completed" value={s.completed ?? 0} tone="leaf" />
        <StatCard label="Hours" value={(s.minutes / 60).toFixed(1)} tone="saffron" />
        <StatCard label="Food carried" value={formatKg(s.kg)} />
      </div>
      {active.length ? (
        <div className="space-y-6">
          {active.map((c) => (
            <Section
              key={c.id}
              title={c.title}
              description={
                <>
                  {c.code} · deliver to {c.org_name} <DemoBadge show={c.is_demo} />
                </>
              }
              actions={
                <div className="flex gap-2">
                  <UrgencyBadge deadline={c.collection_deadline} />
                  <StatusBadge status={c.status} />
                </div>
              }
            >
              <div className="grid gap-4 text-sm sm:grid-cols-2">
                <div className="rounded-xl bg-sand/50 p-3">
                  <p className="text-xs font-semibold uppercase text-muted">Pickup</p>
                  <p className="mt-1">{c.pickup_address}</p>
                  <p className="mt-1 flex items-center gap-1">
                    <Phone className="size-3.5" /> {c.contact_name} · {c.contact_phone}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    Window {formatDateTime(c.pickup_window_start)} – {formatDateTime(c.pickup_window_end)} · deadline {formatDateTime(c.collection_deadline)}
                  </p>
                </div>
                <div className="rounded-xl bg-sand/50 p-3">
                  <p className="text-xs font-semibold uppercase text-muted">Drop-off</p>
                  <p className="mt-1 font-medium">{c.org_name}</p>
                  <p className="mt-1">{c.org_address}</p>
                  <p className="mt-1 text-xs text-muted">Scheduled pickup: {formatDateTime(c.scheduled_pickup_at)}</p>
                </div>
              </div>
              <div className="mt-4">
                {c.status === "assigned" ? <PickupForm collectionId={c.id} maxKg={c.quantity_kg} /> : <HandoverForm collectionId={c.id} maxKg={c.qty_collected_kg ?? c.quantity_kg} />}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {c.status === "assigned" && (
                  <>
                    <ConfirmAction action={releaseTaskAction} fields={{ id: c.id }} label="Release task" title="Release this task?" reasonName="reason" reasonRequired={false} confirmLabel="Release" />
                    <ConfirmAction action={failCollectionAction} fields={{ id: c.id }} label="Report missed pickup" variant="danger" title="Record a missed pickup?" reasonName="reason" reasonLabel="What happened?" confirmLabel="Record" />
                  </>
                )}
              </div>
              <details className="mt-4">
                <summary className="cursor-pointer text-sm font-medium text-forest-800">Report a delay or incident</summary>
                <div className="mt-3">
                  <IncidentForm listingId={c.listing_id} collectionId={c.id} />
                </div>
              </details>
            </Section>
          ))}
        </div>
      ) : (
        <EmptyState icon={<Truck className="size-5" />} title="No active assignments" action={<Link href="/dashboard/tasks" className="btn-primary">Find tasks</Link>} />
      )}
      {past.length > 0 && (
        <Section title="Past assignments" className="mt-6">
          <ul className="divide-y divide-black/5 text-sm">
            {past.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <span>
                  {c.title} <span className="text-muted">· {c.org_name} · {formatDateTime(c.delivered_at ?? c.updated_at)}</span>
                  {c.volunteer_minutes ? <span className="text-muted"> · {c.volunteer_minutes} min</span> : null}
                </span>
                <StatusBadge status={c.status} />
              </li>
            ))}
          </ul>
        </Section>
      )}
    </>
  );
}
