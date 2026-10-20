import Link from "next/link";
import { Download, FileClock } from "lucide-react";
import { requireUser } from "@/lib/session";
import { all } from "@/lib/db";
import { getOrgForUser } from "@/lib/services/organizations";
import { formatDateTime, formatKg } from "@/lib/format";
import { DemoBadge, EmptyState, PageHeader, Table, Td } from "@/components/ui";

export const metadata = { title: "Donation history" };

type Row = { listing_id: string; code: string; title: string; source: string; offered_kg: number; collected_kg: number | null; delivered_kg: number; confirmed_at: string; counterpart: string; is_demo: number };

export default async function History() {
  const actor = await requireUser(["donor", "ngo", "admin"], "/dashboard/history");
  let rows: Row[] = [];
  if (actor.role === "ngo") {
    const org = getOrgForUser(actor.id, "recipient");
    if (org)
      rows = all<Row>(
        `SELECT l.id AS listing_id, l.code, l.title, l.source, l.quantity_kg AS offered_kg, c.qty_collected_kg AS collected_kg, d.qty_received_kg AS delivered_kg, d.confirmed_at,
                COALESCE(o.name, u.name) AS counterpart, l.is_demo
           FROM delivery_confirmations d JOIN food_listings l ON l.id = d.listing_id JOIN collections c ON c.id = d.collection_id
           JOIN users u ON u.id = l.donor_user_id LEFT JOIN organizations o ON o.id = l.donor_org_id
          WHERE d.recipient_org_id = ? ORDER BY d.confirmed_at DESC`,
        org.id,
      );
  } else {
    rows = all<Row>(
      `SELECT l.id AS listing_id, l.code, l.title, l.source, l.quantity_kg AS offered_kg, c.qty_collected_kg AS collected_kg, d.qty_received_kg AS delivered_kg, d.confirmed_at, o.name AS counterpart, l.is_demo
         FROM delivery_confirmations d JOIN food_listings l ON l.id = d.listing_id JOIN collections c ON c.id = d.collection_id JOIN organizations o ON o.id = d.recipient_org_id
        WHERE l.donor_user_id = ? ORDER BY d.confirmed_at DESC`,
      actor.id,
    );
  }
  const total = rows.reduce((s, r) => s + r.delivered_kg, 0);
  return (
    <>
      <PageHeader
        title="Donation history"
        subtitle={`${rows.length} completed donation(s) · ${formatKg(total)} confirmed delivered`}
        actions={
          actor.role !== "ngo" && (
            <a href="/api/export/my-donations" className="btn-secondary btn-sm">
              <Download className="size-3.5" /> Export CSV
            </a>
          )
        }
      />
      {rows.length ? (
        <Table head={["Donation", actor.role === "ngo" ? "Donor" : "Recipient", "Offered", "Collected", "Delivered (confirmed)", "Confirmed"]}>
          {rows.map((r) => (
            <tr key={r.listing_id}>
              <Td>
                <Link href={`/discover/${r.listing_id}`} className="font-semibold text-forest-900 hover:underline">
                  {r.title}
                </Link>
                <p className="font-mono text-xs text-muted">
                  {r.code} <DemoBadge show={r.is_demo} />
                </p>
              </Td>
              <Td>{r.counterpart}</Td>
              <Td>{formatKg(r.offered_kg)}</Td>
              <Td>{r.collected_kg != null ? formatKg(r.collected_kg) : "—"}</Td>
              <Td className="font-semibold text-forest-800">{formatKg(r.delivered_kg)}</Td>
              <Td>{formatDateTime(r.confirmed_at)}</Td>
            </tr>
          ))}
        </Table>
      ) : (
        <EmptyState icon={<FileClock className="size-5" />} title="No completed donations yet" body="Donations appear here once the recipient confirms delivery." />
      )}
    </>
  );
}
