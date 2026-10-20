import Link from "next/link";
import { Truck } from "lucide-react";
import { requireUser } from "@/lib/session";
import { listCollections } from "@/lib/services/logistics";
import { TRANSPORT_MODE_LABELS } from "@/lib/constants";
import { formatDateTime, formatKg } from "@/lib/format";
import { DemoBadge, EmptyState, PageHeader, StatusBadge, Table, Td, UrgencyBadge } from "@/components/ui";

export const metadata = { title: "Collection tracking" };

export default async function Collections({ searchParams }: { searchParams: Promise<{ event?: string }> }) {
  const actor = await requireUser(["donor", "admin"], "/dashboard/collections");
  const { event } = await searchParams;
  const rows = listCollections({ donorId: actor.id, eventOnly: event === "1" });
  return (
    <>
      <PageHeader
        title="Collection tracking"
        subtitle="Follow each pickup from assignment to recipient confirmation."
        actions={
          <Link href={event === "1" ? "/dashboard/collections" : "/dashboard/collections?event=1"} className="btn-secondary btn-sm">
            {event === "1" ? "Show all collections" : "Event donations only"}
          </Link>
        }
      />
      {rows.length ? (
        <Table head={["Donation", "Recipient", "Method / volunteer", "Pickup", "Quantities", "Status"]}>
          {rows.map((c) => (
            <tr key={c.id}>
              <Td>
                <Link href={`/dashboard/listings/${c.listing_id}`} className="font-semibold text-forest-900 hover:underline">
                  {c.title}
                </Link>
                <p className="font-mono text-xs text-muted">
                  {c.code} <DemoBadge show={c.is_demo} />
                </p>
              </Td>
              <Td>{c.org_name}</Td>
              <Td>
                {TRANSPORT_MODE_LABELS[c.transport_mode]}
                <p className="text-xs text-muted">{c.volunteer_name ?? (c.transport_mode === "volunteer" ? "Awaiting volunteer" : "")}</p>
              </Td>
              <Td>
                {c.picked_up_at ? `Picked up ${formatDateTime(c.picked_up_at)}` : c.scheduled_pickup_at ? `Scheduled ${formatDateTime(c.scheduled_pickup_at)}` : "Not scheduled"}
                <p className="text-xs text-muted">Deadline {formatDateTime(c.collection_deadline)}</p>
                {["available", "assigned"].includes(c.status) && <UrgencyBadge deadline={c.collection_deadline} />}
              </Td>
              <Td>
                <p className="text-xs">Collected: {c.qty_collected_kg != null ? formatKg(c.qty_collected_kg) : "—"}</p>
                <p className="text-xs">Handed over: {c.qty_delivered_kg != null ? formatKg(c.qty_delivered_kg) : "—"}</p>
              </Td>
              <Td>
                <StatusBadge status={c.status} />
                {c.failure_reason && <p className="mt-1 max-w-48 text-xs text-red-700">{c.failure_reason}</p>}
                {c.listing_status === "delivered" && <p className="mt-1 text-xs text-forest-700">Recipient confirmed</p>}
              </Td>
            </tr>
          ))}
        </Table>
      ) : (
        <EmptyState icon={<Truck className="size-5" />} title="No collections yet" body="A collection is created when you accept a request." />
      )}
    </>
  );
}
