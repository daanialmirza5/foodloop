import { listPartners } from "@/lib/services/events";
import { formatDate } from "@/lib/format";
import { DemoBadge, EmptyState, PageHeader, Section, StatusBadge } from "@/components/ui";
import { ConfirmAction } from "@/components/forms";
import { reviewPartnerAction } from "@/lib/actions";

export const metadata = { title: "Venue partners" };

export default function AdminPartners() {
  const rows = listPartners();
  return (
    <>
      <PageHeader title="Wedding planner, caterer & venue partners" subtitle="A business appears publicly as a partner only after you record a signed agreement." />
      {rows.length ? (
        <div className="space-y-4">
          {rows.map((p) => (
            <Section key={p.id} title={p.business_name} description={<>{p.partner_type} · {p.city} · applied {formatDate(p.created_at)} <DemoBadge show={p.is_demo} /></>} actions={<StatusBadge status={p.status} />}>
              <p className="text-sm">
                {p.contact_person} · {p.phone} · {p.email}
              </p>
              <p className="mt-1 text-sm text-muted">
                ~{p.events_per_month ?? "?"} events/month · {p.recurring_interest ? "wants recurring collections" : "one-off"}
              </p>
              {p.message && <p className="mt-2 text-sm">“{p.message}”</p>}
              {p.review_note && <p className="mt-2 text-xs text-muted">Note: {p.review_note}</p>}
              <div className="mt-3 flex flex-wrap gap-2">
                {p.status === "pending" && <ConfirmAction action={reviewPartnerAction} fields={{ id: p.id, status: "under_review" }} label="Start review" title="Mark under review?" reasonName="note" reasonLabel="Note" confirmLabel="Save" />}
                {["pending", "under_review"].includes(p.status) && (
                  <>
                    <ConfirmAction action={reviewPartnerAction} fields={{ id: p.id, status: "agreement_signed" }} label="Record signed agreement" variant="primary" title="Record a signed agreement?" description="Only do this once a written agreement exists. The partner will be listed publicly." reasonName="note" reasonLabel="Agreement reference" confirmLabel="Record" />
                    <ConfirmAction action={reviewPartnerAction} fields={{ id: p.id, status: "declined" }} label="Decline" variant="danger" title="Decline application?" reasonName="note" confirmLabel="Decline" />
                  </>
                )}
              </div>
            </Section>
          ))}
        </div>
      ) : (
        <EmptyState title="No partnership applications" />
      )}
    </>
  );
}
