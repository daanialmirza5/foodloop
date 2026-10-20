import Link from "next/link";
import { listIncidents } from "@/lib/services/incidents";
import { INCIDENT_KINDS } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";
import { DemoBadge, EmptyState, FilterTabs, PageHeader, Pill, Section, StatusBadge } from "@/components/ui";
import { IncidentReviewForm } from "@/components/workflow-forms";

export const metadata = { title: "Safety incidents" };

export default async function AdminIncidents({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status = "" } = await searchParams;
  const all = listIncidents();
  const rows = all.filter((i) => !status || i.status === status);
  return (
    <>
      <PageHeader title="Food safety incidents & complaints" subtitle="Investigate, record findings, and release or reject held donations." actions={<a href="/api/export/incidents" className="btn-secondary btn-sm">Export CSV</a>} />
      <FilterTabs basePath="/admin/incidents" active={status} tabs={[{ value: "", label: "All", count: all.length }, ...["open", "investigating", "resolved", "dismissed"].map((s) => ({ value: s, label: s[0].toUpperCase() + s.slice(1), count: all.filter((i) => i.status === s).length }))]} />
      {rows.length ? (
        <div className="space-y-4">
          {rows.map((i) => (
            <Section
              key={i.id}
              title={INCIDENT_KINDS[i.kind]}
              description={
                <>
                  Reported by {i.reporter_name} · {formatDateTime(i.created_at)} <DemoBadge show={i.is_demo} />
                </>
              }
              actions={
                <div className="flex gap-2">
                  <Pill tone={i.severity === "high" ? "red" : i.severity === "medium" ? "amber" : "gray"}>{i.severity}</Pill>
                  {i.safety_hold ? <Pill tone="red">Food on hold</Pill> : null}
                  <StatusBadge status={i.status} />
                </div>
              }
            >
              <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
                <div className="space-y-2 text-sm">
                  <p>{i.description}</p>
                  {i.listing_code && (
                    <p>
                      Donation:{" "}
                      <Link href={`/admin/listings/${i.listing_id}`} className="link">
                        {i.listing_code} · {i.listing_title}
                      </Link>{" "}
                      {i.listing_status && <StatusBadge status={i.listing_status} />}
                    </p>
                  )}
                  {i.event_name && <p className="text-muted">Event: {i.event_name}</p>}
                  {i.resolution && <p className="rounded-lg bg-forest-50 p-2 text-xs">Findings: {i.resolution}</p>}
                </div>
                {["open", "investigating"].includes(i.status) ? <IncidentReviewForm id={i.id} hasListing={!!i.listing_id && !["delivered", "rejected", "cancelled", "expired"].includes(i.listing_status ?? "")} held={!!i.safety_hold} /> : <p className="text-sm text-muted">Closed {formatDateTime(i.resolved_at)}</p>}
              </div>
            </Section>
          ))}
        </div>
      ) : (
        <EmptyState title="No incidents in this view" />
      )}
    </>
  );
}
