import Link from "next/link";
import { Inbox } from "lucide-react";
import { requireUser } from "@/lib/session";
import { incomingRequestsForDonor, requestsForOrg } from "@/lib/services/logistics";
import { getOrgForUser } from "@/lib/services/organizations";
import { TRANSPORT_MODE_LABELS } from "@/lib/constants";
import { formatDateTime, formatKg } from "@/lib/format";
import { Alert, DemoBadge, EmptyState, FilterTabs, PageHeader, StatusBadge, Table, Td } from "@/components/ui";
import { ConfirmAction, InlineAction } from "@/components/forms";
import { decideRequestAction, withdrawRequestAction } from "@/lib/actions";

export const metadata = { title: "Requests" };

export default async function RequestsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const actor = await requireUser(["donor", "ngo", "admin"], "/dashboard/requests");
  const { status = "" } = await searchParams;

  if (actor.role === "ngo") {
    const org = getOrgForUser(actor.id, "recipient");
    if (!org) return <Alert tone="warning">Register your organisation first. <Link href="/dashboard/organization" className="link">Set up →</Link></Alert>;
    const all = requestsForOrg(org.id);
    const rows = all.filter((r) => !status || r.status === status);
    return (
      <>
        <PageHeader title="My food requests" subtitle={`Requests made by ${org.name}.`} actions={<Link href="/discover" className="btn-primary">Browse food</Link>} />
        <FilterTabs basePath="/dashboard/requests" active={status} tabs={[{ value: "", label: "All", count: all.length }, ...["pending", "accepted", "completed", "rejected", "withdrawn", "cancelled"].map((s) => ({ value: s, label: s[0].toUpperCase() + s.slice(1), count: all.filter((r) => r.status === s).length }))]} />
        {rows.length ? (
          <Table head={["Donation", "Quantity", "Collection", "Deadline", "Donation status", "Request", ""]}>
            {rows.map((r) => (
              <tr key={r.id}>
                <Td>
                  <Link href={`/discover/${r.listing_id}`} className="font-semibold text-forest-900 hover:underline">
                    {r.title}
                  </Link>
                  <p className="font-mono text-xs text-muted">
                    {r.code} <DemoBadge show={r.is_demo} />
                  </p>
                </Td>
                <Td>{formatKg(r.quantity_kg)}</Td>
                <Td>{TRANSPORT_MODE_LABELS[r.transport_mode]}</Td>
                <Td>{formatDateTime(r.collection_deadline)}</Td>
                <Td>
                  <StatusBadge status={r.listing_status} />
                </Td>
                <Td>
                  <StatusBadge status={r.status} />
                  {r.decision_reason && <p className="mt-1 max-w-48 text-xs text-muted">{r.decision_reason}</p>}
                </Td>
                <Td>
                  {r.status === "pending" && (
                    <InlineAction action={withdrawRequestAction} fields={{ id: r.id }}>
                      Withdraw
                    </InlineAction>
                  )}
                </Td>
              </tr>
            ))}
          </Table>
        ) : (
          <EmptyState icon={<Inbox className="size-5" />} title="No requests yet" body="Browse available food and request donations your organisation can safely receive." />
        )}
      </>
    );
  }

  const all = incomingRequestsForDonor(actor.id);
  const rows = all.filter((r) => !status || r.status === status);
  return (
    <>
      <PageHeader title="Incoming requests" subtitle="Organisations that asked for your food. Accepting re-checks their capacity and the deadline." />
      <FilterTabs basePath="/dashboard/requests" active={status} tabs={[{ value: "", label: "All", count: all.length }, ...["pending", "accepted", "completed", "rejected"].map((s) => ({ value: s, label: s[0].toUpperCase() + s.slice(1), count: all.filter((r) => r.status === s).length }))]} />
      {rows.length ? (
        <Table head={["Organisation", "Donation", "Collection", "Requested", "Status", "Decision"]}>
          {rows.map((r) => (
            <tr key={r.id}>
              <Td>
                <p className="font-semibold text-forest-900">{r.org_name}</p>
                <p className="text-xs text-muted">{r.org_city}</p>
                {r.message && <p className="mt-1 max-w-56 text-xs text-ink/70">“{r.message}”</p>}
              </Td>
              <Td>
                <Link href={`/dashboard/listings/${r.listing_id}`} className="hover:underline">
                  {r.title}
                </Link>
                <p className="text-xs text-muted">{formatKg(r.quantity_kg)} · by {formatDateTime(r.collection_deadline)}</p>
              </Td>
              <Td>{TRANSPORT_MODE_LABELS[r.transport_mode]}</Td>
              <Td>{formatDateTime(r.created_at)}</Td>
              <Td>
                <StatusBadge status={r.status} />
              </Td>
              <Td>
                {r.status === "pending" && r.listing_status === "request_received" ? (
                  <div className="flex flex-wrap gap-2">
                    <InlineAction action={decideRequestAction} fields={{ id: r.id, decision: "accept" }} variant="primary">
                      Accept
                    </InlineAction>
                    <ConfirmAction action={decideRequestAction} fields={{ id: r.id, decision: "reject" }} label="Decline" title="Decline request?" reasonName="reason" confirmLabel="Decline" />
                  </div>
                ) : (
                  <span className="text-xs text-muted">{r.decision_reason ?? "—"}</span>
                )}
              </Td>
            </tr>
          ))}
        </Table>
      ) : (
        <EmptyState icon={<Inbox className="size-5" />} title="No requests yet" body="When verified NGOs request your food, they appear here." />
      )}
    </>
  );
}
