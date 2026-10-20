import Link from "next/link";
import { listAllListings } from "@/lib/services/listings";
import { LISTING_STATUS_LABELS, SOURCE_LABELS, type Source } from "@/lib/constants";
import { formatDateTime, formatKg } from "@/lib/format";
import { DemoBadge, EmptyState, FilterTabs, PageHeader, Pill, StatusBadge, Table, Td, UrgencyBadge } from "@/components/ui";

export const metadata = { title: "Listing moderation" };

export default async function AdminListings({ searchParams }: { searchParams: Promise<{ status?: string; source?: string; q?: string }> }) {
  const sp = await searchParams;
  const all = listAllListings({ q: sp.q, source: sp.source });
  const rows = all.filter((l) => !sp.status || l.status === sp.status);
  const count = (s: string) => all.filter((l) => l.status === s).length;
  return (
    <>
      <PageHeader title="Food listing moderation" subtitle="Approve only after the manual safety checklist. Reject or block unsafe food at any stage before delivery." actions={<a href="/api/export/listings" className="btn-secondary btn-sm">Export CSV</a>} />
      <form className="mb-4 flex flex-wrap gap-2" method="get">
        <input name="q" defaultValue={sp.q} placeholder="Search title or tracking ID" className="input max-w-xs" aria-label="Search listings" />
        <select name="source" defaultValue={sp.source ?? ""} className="input max-w-52" aria-label="Source">
          <option value="">All sources</option>
          {Object.entries(SOURCE_LABELS).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
        {sp.status && <input type="hidden" name="status" value={sp.status} />}
        <button className="btn-secondary">Filter</button>
      </form>
      <FilterTabs basePath="/admin/listings" active={sp.status ?? ""} tabs={[{ value: "", label: "All", count: all.length }, ...Object.entries(LISTING_STATUS_LABELS).filter(([s]) => count(s)).map(([s, l]) => ({ value: s, label: l, count: count(s) }))]} />
      {rows.length ? (
        <Table head={["Donation", "Donor", "Source", "Qty", "Deadline", "Status"]}>
          {rows.map((l) => (
            <tr key={l.id} className={l.status === "pending_review" ? "bg-saffron-100/30" : ""}>
              <Td>
                <Link href={`/admin/listings/${l.id}`} className="font-semibold text-forest-900 hover:underline">
                  {l.title}
                </Link>
                <p className="font-mono text-xs text-muted">
                  {l.code} <DemoBadge show={l.is_demo} />
                </p>
                <div className="mt-1 flex gap-1">
                  {l.is_urgent ? <Pill tone="red">Urgent</Pill> : null}
                  {l.safety_hold ? <Pill tone="red">Safety hold</Pill> : null}
                </div>
              </Td>
              <Td>{l.donor_org_name ?? l.donor_name}</Td>
              <Td>
                {SOURCE_LABELS[l.source as Source]}
                {l.event_name && <p className="text-xs text-saffron-700">{l.event_name}</p>}
              </Td>
              <Td>{formatKg(l.quantity_kg)}</Td>
              <Td>
                {formatDateTime(l.collection_deadline)}
                <div>{["pending_review", "available", "request_received", "accepted", "pickup_scheduled"].includes(l.status) && <UrgencyBadge deadline={l.collection_deadline} />}</div>
              </Td>
              <Td>
                <StatusBadge status={l.status} />
              </Td>
            </tr>
          ))}
        </Table>
      ) : (
        <EmptyState title="No listings match" />
      )}
    </>
  );
}
