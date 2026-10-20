import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CalendarHeart, Download, PackagePlus } from "lucide-react";
import { requireUser } from "@/lib/session";
import { eventIncidents, eventListings, getEvent } from "@/lib/services/events";
import { historyFor } from "@/lib/services/audit";
import { EVENT_TYPE_LABELS, FOOD_TYPE_LABELS, INCIDENT_KINDS, type EventType } from "@/lib/constants";
import { formatDate, formatDateTime, formatKg } from "@/lib/format";
import { Alert, DemoBadge, EmptyState, KeyValue, PageHeader, Section, StatCard, StatusBadge, Table, Td, Timeline } from "@/components/ui";
import { ConfirmAction, InlineAction } from "@/components/forms";
import { IncidentForm } from "@/components/workflow-forms";
import { cancelEventAction, closeEventAction, confirmEventAction, submitEventAction } from "@/lib/actions";

export const metadata = { title: "Event" };

export default async function EventDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string; updated?: string }> }) {
  const actor = await requireUser(["donor", "admin"]);
  const { id } = await params;
  const sp = await searchParams;
  const ev = getEvent(id);
  if (!ev) notFound();
  const admin = actor.role === "admin";
  if (ev.organizer_user_id !== actor.id && !admin) redirect("/forbidden");
  const listings = eventListings(id);
  const incidents = eventIncidents(id);
  const history = historyFor("event", id);
  const today = new Date(Date.now() + 5.5 * 36e5).toISOString().slice(0, 10);
  const canDonate = !["cancelled", "completed"].includes(ev.status);
  const offered = listings.filter((l) => l.status !== "draft").reduce((s, l) => s + l.quantity_kg, 0);
  const accepted = listings.reduce((s, l) => s + (l.approved_kg ?? 0), 0);
  const collected = listings.reduce((s, l) => s + (l.collected_kg ?? 0), 0);
  const delivered = listings.reduce((s, l) => s + (l.delivered_kg ?? 0), 0);
  const rejected = listings.filter((l) => l.status === "rejected");

  return (
    <>
      {sp.created && (
        <Alert tone="success" title="Event registered" className="mb-6">
          {ev.status === "registered" ? "Saved. Submit the details when they're final." : "A coordinator will confirm the collection plan. After the event, come back here and click “Donate Leftover Food Now”."}
        </Alert>
      )}
      {sp.updated && <Alert tone="success" title="Event updated" className="mb-6" />}
      <PageHeader
        eyebrow={EVENT_TYPE_LABELS[ev.event_type as EventType]}
        title={ev.name}
        subtitle={
          <>
            {formatDate(ev.event_date)} {ev.start_time && `· ${ev.start_time}–${ev.end_time ?? ""}`} · {ev.venue_name}, {ev.city} <DemoBadge show={ev.is_demo} />
          </>
        }
        actions={
          <>
            <StatusBadge status={ev.status} className="self-center" />
            {canDonate && (
              <Link href={`/dashboard/listings/new?source=event_surplus&event=${id}`} className="btn-accent">
                <PackagePlus className="size-4" /> Donate Leftover Food Now
              </Link>
            )}
          </>
        }
      />
      {canDonate && ev.event_date > today && (
        <Alert tone="info" className="mb-6">
          This event is upcoming. Its estimated surplus is a plan only — record actual leftover food after the event.
        </Alert>
      )}
      {ev.status === "cancelled" && <Alert tone="error" title="Event cancelled" className="mb-6">{ev.status_reason}</Alert>}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard label="Estimated surplus" value={ev.estimated_surplus_kg != null ? `~${formatKg(ev.estimated_surplus_kg)}` : "—"} hint="Estimate — not counted" tone="stone" />
        <StatCard label="Offered (actual)" value={formatKg(offered)} />
        <StatCard label="Accepted after screening" value={formatKg(accepted)} tone="leaf" />
        <StatCard label="Collected" value={formatKg(collected)} />
        <StatCard label="Delivered (confirmed)" value={formatKg(delivered)} tone="saffron" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          <Section
            title="Food donations from this event"
            actions={
              <a href={`/api/export/event?id=${id}`} className="btn-secondary btn-sm">
                <Download className="size-3.5" /> Export CSV
              </a>
            }
          >
            {listings.length ? (
              <Table head={["Donation", "Offered", "Collected", "Delivered", "Recipient", "Status"]}>
                {listings.map((l) => (
                  <tr key={l.id}>
                    <Td>
                      <Link href={`/dashboard/listings/${l.id}`} className="font-semibold text-forest-900 hover:underline">
                        {l.title}
                      </Link>
                      <p className="font-mono text-xs text-muted">{l.code}</p>
                    </Td>
                    <Td>{formatKg(l.quantity_kg)}</Td>
                    <Td>{l.collected_kg != null ? formatKg(l.collected_kg) : "—"}</Td>
                    <Td>{l.delivered_kg != null ? formatKg(l.delivered_kg) : "—"}</Td>
                    <Td>{l.recipient_name ?? "—"}</Td>
                    <Td>
                      <StatusBadge status={l.status} />
                    </Td>
                  </tr>
                ))}
              </Table>
            ) : (
              <EmptyState icon={<CalendarHeart className="size-5" />} title="No leftover food registered yet" body="After the event, record the actual food available. It will be safety-screened before NGOs see it." action={canDonate && <Link href={`/dashboard/listings/new?source=event_surplus&event=${id}`} className="btn-accent">Donate Leftover Food Now</Link>} />
            )}
            {rejected.length > 0 && (
              <div className="mt-4 space-y-1 text-sm">
                <p className="font-semibold text-red-700">Rejected donations</p>
                {rejected.map((r) => (
                  <p key={r.id} className="text-xs text-muted">
                    {r.code}: {r.status_reason}
                  </p>
                ))}
              </div>
            )}
          </Section>

          <Section title="Event details">
            <KeyValue
              items={[
                ["Venue address", ev.venue_address],
                ["Organiser", `${ev.organizer_name} · ${ev.organizer_phone}`],
                ["Caterer", ev.caterer],
                ["Expected guests", ev.expected_guests],
                ["Expected food", ev.expected_food_types],
                ["Food type", ev.food_type ? FOOD_TYPE_LABELS[ev.food_type] : "—"],
                ["Food available from", ev.expected_availability_time],
                ["Collection window", ev.collection_window],
                ["Packaging", ev.packaging_arrangements],
                ["Storage", ev.storage_arrangements],
                ["Containers available", ev.containers_available ? "Yes" : "No"],
                ["Own transport", ev.transport_available ? "Yes" : "No"],
                ["Access & parking", ev.access_instructions],
                ["Preferred recipient", ev.preferred_recipient_name],
                ["Instructions", ev.instructions],
              ]}
            />
          </Section>

          {incidents.length > 0 && (
            <Section title="Food safety incidents">
              <ul className="space-y-2 text-sm">
                {incidents.map((i) => (
                  <li key={i.id} className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={i.status} /> <span className="font-medium">{INCIDENT_KINDS[i.kind]}</span> ({i.severity}) — <span className="text-muted">{i.description}</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </div>

        <div className="space-y-6">
          <Section title="Actions">
            <div className="flex flex-wrap gap-2">
              {ev.status === "registered" && (
                <InlineAction action={submitEventAction} fields={{ id }} variant="primary">
                  Submit event details
                </InlineAction>
              )}
              {admin && ev.status === "awaiting_confirmation" && (
                <ConfirmAction action={confirmEventAction} fields={{ id }} label="Confirm collection plan" variant="primary" title="Confirm this event?" reasonName="note" reasonLabel="Coordinator note" reasonRequired={false} confirmLabel="Confirm" />
              )}
              {["registered", "awaiting_confirmation", "awaiting_food"].includes(ev.status) && (
                <Link href={`/dashboard/events/${id}/edit`} className="btn-secondary btn-sm">
                  Edit event
                </Link>
              )}
              {["awaiting_food", "ready_for_collection"].includes(ev.status) && (
                <InlineAction action={closeEventAction} fields={{ id }}>
                  Close — no further surplus
                </InlineAction>
              )}
              {!["completed", "cancelled", "collection_arranged"].includes(ev.status) && (
                <ConfirmAction action={cancelEventAction} fields={{ id }} label="Cancel event" variant="danger" title="Cancel this event?" description="Any open food donations from this event will also be cancelled." reasonName="reason" confirmLabel="Cancel event" />
              )}
            </div>
            {["completed", "cancelled"].includes(ev.status) && <p className="text-sm text-muted">This event is {ev.status}; its records are kept for traceability and can no longer be changed.</p>}
            {ev.status === "collection_arranged" && <p className="mt-2 text-xs text-muted">Food is being collected. Track it from the donation page.</p>}
          </Section>
          <Section title="Status history">
            <Timeline items={history} />
          </Section>
          <Section title="Report a problem" description="Delays, cancellations, safety concerns at the venue.">
            <IncidentForm eventId={id} />
          </Section>
          <p className="text-xs text-muted">Registered {formatDateTime(ev.created_at)}</p>
        </div>
      </div>
    </>
  );
}
