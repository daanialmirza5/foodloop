import Link from "next/link";
import { availableVolunteers, listCollections } from "@/lib/services/logistics";
import { COLLECTION_STATUS_LABELS, TRANSPORT_MODE_LABELS } from "@/lib/constants";
import { formatDateTime, formatKg } from "@/lib/format";
import { DemoBadge, EmptyState, FilterTabs, PageHeader, Pill, Section, StatCard, StatusBadge, UrgencyBadge } from "@/components/ui";
import { AssignVolunteerForm } from "@/components/workflow-forms";

export const metadata = { title: "Logistics" };

export default async function Logistics({ searchParams }: { searchParams: Promise<{ status?: string; urgent?: string; event?: string }> }) {
  const sp = await searchParams;
  const all = listCollections({ urgent: sp.urgent === "1", eventOnly: sp.event === "1" });
  const rows = all.filter((c) => !sp.status || c.status === sp.status);
  const vols = availableVolunteers();
  const now = Date.now();
  const delayed = all.filter((c) => c.status === "assigned" && c.scheduled_pickup_at && new Date(c.scheduled_pickup_at).getTime() < now - 30 * 6e4);
  const soon = all.filter((c) => ["available", "assigned"].includes(c.status) && new Date(c.collection_deadline).getTime() - now < 3 * 36e5);
  return (
    <>
      <PageHeader title="Logistics dashboard" subtitle="Pending pickups, volunteer assignments and delivery outcomes." actions={<a href="/api/export/collections" className="btn-secondary btn-sm">Export CSV</a>} />
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-6">
        <StatCard label="Need a volunteer" value={all.filter((c) => c.status === "available").length} tone="saffron" />
        <StatCard label="Assigned" value={all.filter((c) => c.status === "assigned").length} />
        <StatCard label="In transit" value={all.filter((c) => c.status === "in_transit").length} />
        <StatCard label="Deadline < 3 h" value={soon.length} tone={soon.length ? "saffron" : "stone"} />
        <StatCard label="Delayed pickups" value={delayed.length} tone={delayed.length ? "saffron" : "stone"} hint="30 min past schedule" />
        <StatCard label="Failed / cancelled" value={all.filter((c) => ["failed", "cancelled"].includes(c.status)).length} tone="stone" />
      </div>
      <div className="mb-3 flex flex-wrap gap-2">
        <Link href={sp.urgent === "1" ? "/admin/logistics" : "/admin/logistics?urgent=1"} className="btn-secondary btn-sm">
          {sp.urgent === "1" ? "All pickups" : "Urgent only"}
        </Link>
        <Link href={sp.event === "1" ? "/admin/logistics" : "/admin/logistics?event=1"} className="btn-secondary btn-sm">
          {sp.event === "1" ? "All sources" : "Event donations"}
        </Link>
      </div>
      <FilterTabs basePath="/admin/logistics" active={sp.status ?? ""} tabs={[{ value: "", label: "All", count: all.length }, ...Object.entries(COLLECTION_STATUS_LABELS).map(([s, l]) => ({ value: s, label: l, count: all.filter((c) => c.status === s).length }))]} />
      {rows.length ? (
        <div className="space-y-4">
          {rows.map((c) => (
            <Section
              key={c.id}
              title={c.title}
              description={
                <>
                  {c.code} · {formatKg(c.quantity_kg)} · {c.city} → {c.org_name} · {TRANSPORT_MODE_LABELS[c.transport_mode]} <DemoBadge show={c.is_demo} />
                </>
              }
              actions={
                <div className="flex flex-wrap gap-2">
                  {c.is_urgent ? <Pill tone="red">Urgent</Pill> : null}
                  {c.source === "event_surplus" && <Pill tone="amber">Event</Pill>}
                  {["available", "assigned"].includes(c.status) && <UrgencyBadge deadline={c.collection_deadline} />}
                  {delayed.includes(c) && <Pill tone="red">Delayed</Pill>}
                  <StatusBadge status={c.status} />
                </div>
              }
            >
              <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
                <dl className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <dt className="text-xs text-muted">Volunteer</dt>
                    <dd>{c.volunteer_name ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted">Transport partner</dt>
                    <dd>{c.transport_partner ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted">Scheduled</dt>
                    <dd>{formatDateTime(c.scheduled_pickup_at)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted">Deadline</dt>
                    <dd>{formatDateTime(c.collection_deadline)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted">Picked up</dt>
                    <dd>{c.picked_up_at ? `${formatDateTime(c.picked_up_at)} · ${formatKg(c.qty_collected_kg)}` : "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted">Handed over</dt>
                    <dd>{c.delivered_at ? `${formatDateTime(c.delivered_at)}${c.qty_delivered_kg ? ` · ${formatKg(c.qty_delivered_kg)}` : ""}` : "—"}</dd>
                  </div>
                  {c.failure_reason && <dd className="col-span-2 text-xs text-red-700">{c.failure_reason}</dd>}
                </dl>
                <div>
                  {["available", "assigned"].includes(c.status) && c.transport_mode === "volunteer" ? (
                    <AssignVolunteerForm collectionId={c.id} volunteers={vols} defaultEta={c.scheduled_pickup_at ?? c.pickup_window_start} />
                  ) : (
                    <Link href={`/admin/listings/${c.listing_id}`} className="link text-sm">
                      Open donation →
                    </Link>
                  )}
                </div>
              </div>
            </Section>
          ))}
        </div>
      ) : (
        <EmptyState title="No collections in this view" />
      )}
    </>
  );
}
