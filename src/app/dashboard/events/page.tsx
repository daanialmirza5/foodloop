import Link from "next/link";
import { CalendarHeart, PlusCircle, Siren } from "lucide-react";
import { requireUser } from "@/lib/session";
import { listEvents } from "@/lib/services/events";
import { EVENT_STATUS_LABELS, EVENT_STATUSES, EVENT_TYPE_LABELS, type EventType } from "@/lib/constants";
import { formatDate, formatKg } from "@/lib/format";
import { DemoBadge, EmptyState, PageHeader, StatusBadge, Table, Td } from "@/components/ui";

export const metadata = { title: "My events" };

export default async function MyEvents({ searchParams }: { searchParams: Promise<{ status?: string; from?: string; to?: string }> }) {
  const actor = await requireUser(["donor", "admin"], "/dashboard/events");
  const sp = await searchParams;
  const rows = listEvents({ organizerId: actor.id, status: sp.status, from: sp.from, to: sp.to });
  const today = new Date(Date.now() + 5.5 * 36e5).toISOString().slice(0, 10);
  return (
    <>
      <PageHeader
        eyebrow="Event Food Rescue"
        title="My events"
        subtitle="Registered events are plans. Food is only counted once you donate the actual leftovers."
        actions={
          <>
            <Link href="/dashboard/events/new" className="btn-primary">
              <PlusCircle className="size-4" /> Register event
            </Link>
            <Link href="/dashboard/events/urgent" className="btn-accent">
              <Siren className="size-4" /> Urgent rescue
            </Link>
          </>
        }
      />
      <form className="card mb-4 grid gap-3 p-4 sm:grid-cols-4" method="get">
        <select name="status" defaultValue={sp.status ?? ""} className="input" aria-label="Status">
          <option value="">All statuses</option>
          {EVENT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {EVENT_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        <input type="date" name="from" defaultValue={sp.from} className="input" aria-label="From date" />
        <input type="date" name="to" defaultValue={sp.to} className="input" aria-label="To date" />
        <button className="btn-secondary" type="submit">
          Filter
        </button>
      </form>
      {rows.length ? (
        <Table head={["Event", "Date", "Expected surplus (estimate)", "Offered", "Delivered", "Status", ""]}>
          {rows.map((e) => (
            <tr key={e.id}>
              <Td>
                <Link href={`/dashboard/events/${e.id}`} className="font-semibold text-forest-900 hover:underline">
                  {e.name}
                </Link>
                <p className="text-xs text-muted">
                  {EVENT_TYPE_LABELS[e.event_type as EventType]} · {e.venue_name} <DemoBadge show={e.is_demo} />
                </p>
              </Td>
              <Td>
                {formatDate(e.event_date)}
                {e.event_date >= today && <p className="text-xs text-leaf-600">{e.event_date === today ? "Today" : "Upcoming"}</p>}
              </Td>
              <Td className="text-muted">{e.estimated_surplus_kg != null ? `~${formatKg(e.estimated_surplus_kg)}` : "—"}</Td>
              <Td>{e.listings_count ? `${formatKg(e.offered_kg)} (${e.listings_count})` : "—"}</Td>
              <Td className="font-semibold text-forest-800">{e.delivered_kg ? formatKg(e.delivered_kg) : "—"}</Td>
              <Td>
                <StatusBadge status={e.status} />
              </Td>
              <Td>
                {["awaiting_food", "ready_for_collection", "awaiting_confirmation", "registered"].includes(e.status) && e.event_date <= today && (
                  <Link href={`/dashboard/listings/new?source=event_surplus&event=${e.id}`} className="btn-accent btn-sm whitespace-nowrap">
                    Donate leftover food
                  </Link>
                )}
              </Td>
            </tr>
          ))}
        </Table>
      ) : (
        <EmptyState icon={<CalendarHeart className="size-5" />} title="No events yet" body="Register a wedding, reception or function in advance so coordinators can plan the collection." action={<Link href="/dashboard/events/new" className="btn-primary">Register event</Link>} />
      )}
    </>
  );
}
