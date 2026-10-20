import Link from "next/link";
import { listEvents } from "@/lib/services/events";
import { EVENT_STATUS_LABELS, EVENT_STATUSES, EVENT_TYPE_LABELS, type EventType } from "@/lib/constants";
import { formatDate, formatKg } from "@/lib/format";
import { DemoBadge, EmptyState, PageHeader, StatusBadge, Table, Td } from "@/components/ui";
import { ConfirmAction } from "@/components/forms";
import { confirmEventAction } from "@/lib/actions";

export const metadata = { title: "Event management" };

export default async function AdminEvents({ searchParams }: { searchParams: Promise<{ status?: string; from?: string; to?: string; upcoming?: string }> }) {
  const sp = await searchParams;
  const rows = listEvents({ status: sp.status, from: sp.from, to: sp.to, upcoming: sp.upcoming === "1" });
  return (
    <>
      <PageHeader title="Wedding & event management" subtitle="Confirm collection plans for registered events and follow their leftover-food donations." actions={<a href="/api/export/events" className="btn-secondary btn-sm">Export CSV</a>} />
      <form className="card mb-4 grid gap-3 p-4 sm:grid-cols-5" method="get">
        <select name="status" defaultValue={sp.status ?? ""} className="input" aria-label="Status">
          <option value="">All statuses</option>
          {EVENT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {EVENT_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        <input type="date" name="from" defaultValue={sp.from} className="input" aria-label="From" />
        <input type="date" name="to" defaultValue={sp.to} className="input" aria-label="To" />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="upcoming" value="1" defaultChecked={sp.upcoming === "1"} className="size-4 accent-forest-700" /> Upcoming only
        </label>
        <button className="btn-secondary">Filter</button>
      </form>
      {rows.length ? (
        <Table head={["Event", "Organiser", "Date", "Estimate", "Offered / Delivered", "Status", ""]}>
          {rows.map((e) => (
            <tr key={e.id}>
              <Td>
                <Link href={`/dashboard/events/${e.id}`} className="font-semibold text-forest-900 hover:underline">
                  {e.name}
                </Link>
                <p className="text-xs text-muted">
                  {EVENT_TYPE_LABELS[e.event_type as EventType]} · {e.venue_name}, {e.city} <DemoBadge show={e.is_demo} />
                </p>
              </Td>
              <Td>
                {e.organizer_name}
                <p className="text-xs text-muted">{e.organizer_phone}</p>
              </Td>
              <Td>{formatDate(e.event_date)}</Td>
              <Td className="text-muted">{e.estimated_surplus_kg != null ? `~${formatKg(e.estimated_surplus_kg)}` : "—"}</Td>
              <Td>
                {formatKg(e.offered_kg)} / <span className="font-semibold text-forest-800">{formatKg(e.delivered_kg)}</span>
              </Td>
              <Td>
                <StatusBadge status={e.status} />
              </Td>
              <Td>
                {e.status === "awaiting_confirmation" && <ConfirmAction action={confirmEventAction} fields={{ id: e.id }} label="Confirm plan" variant="primary" title={`Confirm ${e.name}?`} reasonName="note" reasonLabel="Coordinator note" reasonRequired={false} confirmLabel="Confirm" />}
              </Td>
            </tr>
          ))}
        </Table>
      ) : (
        <EmptyState title="No events match" />
      )}
    </>
  );
}
