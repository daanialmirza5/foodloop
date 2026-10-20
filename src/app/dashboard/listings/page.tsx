import Link from "next/link";
import { PlusCircle, Utensils } from "lucide-react";
import { requireUser } from "@/lib/session";
import { listingsForDonor } from "@/lib/services/listings";
import { LISTING_STATUS_LABELS, SOURCE_LABELS, type Source } from "@/lib/constants";
import { formatDateTime, formatKg } from "@/lib/format";
import { DemoBadge, EmptyState, FilterTabs, PageHeader, StatusBadge, Table, Td, UrgencyBadge } from "@/components/ui";

export const metadata = { title: "My food donations" };

export default async function MyListings({ searchParams }: { searchParams: Promise<{ status?: string; source?: string }> }) {
  const actor = await requireUser(["donor", "admin"], "/dashboard/listings");
  const sp = await searchParams;
  const all = listingsForDonor(actor.id);
  const rows = all.filter((l) => (!sp.status || l.status === sp.status) && (!sp.source || l.source === sp.source));
  const count = (s: string) => all.filter((l) => l.status === s).length;
  return (
    <>
      <PageHeader title="My food donations" subtitle="Every donation has a tracking ID and full history." actions={<Link href="/dashboard/listings/new" className="btn-primary"><PlusCircle className="size-4" /> Add donation</Link>} />
      <FilterTabs
        basePath="/dashboard/listings"
        active={sp.status ?? ""}
        tabs={[{ value: "", label: "All", count: all.length }, ...(["draft", "pending_review", "available", "request_received", "accepted", "pickup_scheduled", "collected", "delivered", "rejected", "cancelled", "expired"] as const).filter((s) => count(s)).map((s) => ({ value: s, label: LISTING_STATUS_LABELS[s], count: count(s) }))]}
      />
      <div className="mb-4 flex flex-wrap gap-2 text-sm">
        <span className="text-muted">Source:</span>
        {["", "everyday_surplus", "fresh_donation", "event_surplus"].map((s) => (
          <Link key={s} href={`/dashboard/listings?${new URLSearchParams({ ...(sp.status ? { status: sp.status } : {}), ...(s ? { source: s } : {}) })}`} className={sp.source === s || (!sp.source && !s) ? "font-semibold text-forest-800 underline" : "text-muted hover:text-forest-800"}>
            {s ? SOURCE_LABELS[s as Source] : "Any"}
          </Link>
        ))}
      </div>
      {rows.length ? (
        <Table head={["Donation", "Source", "Quantity", "Deadline", "Requests", "Status"]}>
          {rows.map((l) => (
            <tr key={l.id} className="hover:bg-sand/40">
              <Td>
                <Link href={`/dashboard/listings/${l.id}`} className="font-semibold text-forest-900 hover:underline">
                  {l.title}
                </Link>
                <p className="font-mono text-xs text-muted">
                  {l.code} <DemoBadge show={l.is_demo} />
                </p>
                {l.event_name && <p className="text-xs text-saffron-700">{l.event_name}</p>}
              </Td>
              <Td>{SOURCE_LABELS[l.source as Source]}</Td>
              <Td>{formatKg(l.quantity_kg)}</Td>
              <Td>
                {formatDateTime(l.collection_deadline)}
                <div className="mt-1">{["available", "request_received", "accepted", "pickup_scheduled"].includes(l.status) && <UrgencyBadge deadline={l.collection_deadline} />}</div>
              </Td>
              <Td>{l.request_count > 0 ? <span className="font-semibold text-saffron-700">{l.request_count} pending</span> : "—"}</Td>
              <Td>
                <StatusBadge status={l.status} />
              </Td>
            </tr>
          ))}
        </Table>
      ) : (
        <EmptyState icon={<Utensils className="size-5" />} title="No donations here yet" body="Add surplus food, a planned fresh-food donation, or leftover food from a registered event." action={<Link href="/dashboard/listings/new" className="btn-primary">Add food donation</Link>} />
      )}
    </>
  );
}
