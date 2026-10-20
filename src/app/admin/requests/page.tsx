import Link from "next/link";
import { all } from "@/lib/db";
import { TRANSPORT_MODE_LABELS } from "@/lib/constants";
import { formatDateTime, formatKg } from "@/lib/format";
import { DemoBadge, FilterTabs, PageHeader, Section, StatusBadge, Table, Td } from "@/components/ui";

export const metadata = { title: "Requests & deliveries" };

type Req = { id: string; listing_id: string; code: string; title: string; org_name: string; quantity_kg: number; transport_mode: string; status: string; decision_reason: string | null; created_at: string; is_demo: number };
type Dlv = { listing_id: string; code: string; title: string; org_name: string; qty_received_kg: number; qty_collected_kg: number | null; confirmed_at: string; confirmer: string; is_demo: number };

export default async function AdminRequests({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status = "" } = await searchParams;
  const reqs = all<Req>(
    `SELECT r.id, r.listing_id, l.code, l.title, o.name AS org_name, r.quantity_kg, r.transport_mode, r.status, r.decision_reason, r.created_at, l.is_demo
       FROM donation_requests r JOIN food_listings l ON l.id = r.listing_id JOIN organizations o ON o.id = r.recipient_org_id ORDER BY r.created_at DESC`,
  );
  const deliveries = all<Dlv>(
    `SELECT d.listing_id, l.code, l.title, o.name AS org_name, d.qty_received_kg, c.qty_collected_kg, d.confirmed_at, u.name AS confirmer, l.is_demo
       FROM delivery_confirmations d JOIN food_listings l ON l.id = d.listing_id JOIN organizations o ON o.id = d.recipient_org_id
       JOIN collections c ON c.id = d.collection_id JOIN users u ON u.id = d.confirmed_by ORDER BY d.confirmed_at DESC`,
  );
  const rows = reqs.filter((r) => !status || r.status === status);
  return (
    <>
      <PageHeader title="Donation requests & delivery records" />
      <FilterTabs basePath="/admin/requests" active={status} tabs={[{ value: "", label: "All", count: reqs.length }, ...["pending", "accepted", "completed", "rejected", "withdrawn", "cancelled"].map((s) => ({ value: s, label: s[0].toUpperCase() + s.slice(1), count: reqs.filter((r) => r.status === s).length }))]} />
      <Table head={["Donation", "Organisation", "Qty", "Method", "Requested", "Status"]}>
        {rows.map((r) => (
          <tr key={r.id}>
            <Td>
              <Link href={`/admin/listings/${r.listing_id}`} className="font-semibold text-forest-900 hover:underline">
                {r.title}
              </Link>
              <p className="font-mono text-xs text-muted">
                {r.code} <DemoBadge show={r.is_demo} />
              </p>
            </Td>
            <Td>{r.org_name}</Td>
            <Td>{formatKg(r.quantity_kg)}</Td>
            <Td>{TRANSPORT_MODE_LABELS[r.transport_mode]}</Td>
            <Td>{formatDateTime(r.created_at)}</Td>
            <Td>
              <StatusBadge status={r.status} />
              {r.decision_reason && <p className="mt-1 max-w-56 text-xs text-muted">{r.decision_reason}</p>}
            </Td>
          </tr>
        ))}
      </Table>
      <Section title={`Delivery confirmations (${deliveries.length})`} className="mt-6" description="One confirmation per donation — the source of truth for delivered impact.">
        <Table head={["Donation", "Recipient", "Collected", "Received", "Confirmed by", "When"]}>
          {deliveries.map((d) => (
            <tr key={d.listing_id}>
              <Td>
                <Link href={`/admin/listings/${d.listing_id}`} className="hover:underline">
                  {d.title}
                </Link>
                <p className="font-mono text-xs text-muted">
                  {d.code} <DemoBadge show={d.is_demo} />
                </p>
              </Td>
              <Td>{d.org_name}</Td>
              <Td>{d.qty_collected_kg != null ? formatKg(d.qty_collected_kg) : "—"}</Td>
              <Td className="font-semibold">{formatKg(d.qty_received_kg)}</Td>
              <Td>{d.confirmer}</Td>
              <Td>{formatDateTime(d.confirmed_at)}</Td>
            </tr>
          ))}
        </Table>
      </Section>
    </>
  );
}
