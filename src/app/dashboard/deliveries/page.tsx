import Link from "next/link";
import { PackageCheck } from "lucide-react";
import { requireUser } from "@/lib/session";
import { listCollections } from "@/lib/services/logistics";
import { TRANSPORT_MODE_LABELS } from "@/lib/constants";
import { formatDateTime, formatKg } from "@/lib/format";
import { DemoBadge, EmptyState, PageHeader, Section, StatusBadge, UrgencyBadge } from "@/components/ui";
import { ConfirmDeliveryForm, PickupForm, SchedulePickupForm } from "@/components/workflow-forms";

export const metadata = { title: "Deliveries" };

export default async function Deliveries() {
  const actor = await requireUser(["ngo"], "/dashboard/deliveries");
  const all = listCollections({ orgOwnerId: actor.id });
  const awaitingAck = all.filter((c) => c.listing_status === "collected");
  const upcoming = all.filter((c) => ["available", "assigned"].includes(c.status));
  const done = all.filter((c) => c.listing_status === "delivered" || ["failed", "cancelled"].includes(c.status));
  return (
    <>
      <PageHeader title="Deliveries & receipts" subtitle="Confirm what you actually received. Only confirmed quantities count as delivered." />
      <div className="space-y-6">
        <Section title={`Awaiting your confirmation (${awaitingAck.length})`}>
          {awaitingAck.length ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {awaitingAck.map((c) => (
                <div key={c.id} className="rounded-xl border border-saffron-400/40 bg-saffron-100/40 p-4">
                  <Link href={`/discover/${c.listing_id}`} className="font-semibold text-forest-900 hover:underline">
                    {c.title}
                  </Link>
                  <p className="mb-3 text-xs text-muted">
                    {c.code} · collected {formatKg(c.qty_collected_kg)} {c.qty_delivered_kg ? `· handed over ${formatKg(c.qty_delivered_kg)}` : ""} {c.volunteer_name && `· by ${c.volunteer_name}`} <DemoBadge show={c.is_demo} />
                  </p>
                  <ConfirmDeliveryForm listingId={c.listing_id} maxKg={c.qty_delivered_kg ?? c.qty_collected_kg ?? c.quantity_kg} />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted">Nothing waiting for confirmation.</p>
          )}
        </Section>
        <Section title={`Upcoming collections (${upcoming.length})`}>
          {upcoming.length ? (
            <ul className="space-y-4">
              {upcoming.map((c) => (
                <li key={c.id} className="rounded-xl border border-black/5 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Link href={`/discover/${c.listing_id}`} className="font-semibold text-forest-900 hover:underline">
                      {c.title}
                    </Link>
                    <div className="flex gap-2">
                      <UrgencyBadge deadline={c.collection_deadline} />
                      <StatusBadge status={c.status} />
                    </div>
                  </div>
                  <p className="text-xs text-muted">
                    {TRANSPORT_MODE_LABELS[c.transport_mode]} · {c.volunteer_name ?? "no volunteer yet"} · deadline {formatDateTime(c.collection_deadline)}
                  </p>
                  {c.transport_mode === "recipient" && c.status === "assigned" && (
                    <div className="mt-3 space-y-3">
                      <p className="text-sm">
                        Pickup from: <strong>{c.pickup_address}</strong> · {c.contact_name} {c.contact_phone}
                      </p>
                      {!c.scheduled_pickup_at && <SchedulePickupForm collectionId={c.id} defaultWhen={c.pickup_window_start} />}
                      <details className="rounded-xl bg-sand/50 p-3">
                        <summary className="cursor-pointer text-sm font-semibold">Record pickup (we collected it)</summary>
                        <div className="mt-3">
                          <PickupForm collectionId={c.id} maxKg={c.quantity_kg} />
                        </div>
                      </details>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">No upcoming collections.</p>
          )}
        </Section>
        <Section title="Past deliveries">
          {done.length ? (
            <ul className="divide-y divide-black/5">
              {done.map((c) => (
                <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                  <span>
                    <Link href={`/discover/${c.listing_id}`} className="font-medium hover:underline">
                      {c.title}
                    </Link>{" "}
                    <span className="text-muted">· {formatDateTime(c.delivered_at ?? c.updated_at)}</span>
                  </span>
                  <StatusBadge status={c.listing_status === "delivered" ? "delivered" : c.status} />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={<PackageCheck className="size-5" />} title="No past deliveries" />
          )}
        </Section>
      </div>
    </>
  );
}
