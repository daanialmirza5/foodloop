import { listOrganizations } from "@/lib/services/organizations";
import { formatDate } from "@/lib/format";
import { ORG_STATUS_LABELS } from "@/lib/constants";
import { DemoBadge, EmptyState, FilterTabs, KeyValue, PageHeader, Section, StatusBadge } from "@/components/ui";
import { VerificationReviewForm } from "@/components/workflow-forms";
import { ConfirmAction } from "@/components/forms";
import { suspendOrgAction } from "@/lib/actions";

export const metadata = { title: "NGO verification" };

export default async function AdminOrgs({ searchParams }: { searchParams: Promise<{ status?: string; kind?: string }> }) {
  const sp = await searchParams;
  const kind = sp.kind === "donor" ? "donor" : "recipient";
  const all = listOrganizations({ kind });
  const rows = all.filter((o) => !sp.status || o.verification_status === sp.status);
  return (
    <>
      <PageHeader title={kind === "recipient" ? "NGO & recipient verification" : "Donor businesses"} subtitle="Only administrators can verify, reject or suspend organisations. A reason is always recorded." actions={<a href={kind === "recipient" ? "/admin/organizations?kind=donor" : "/admin/organizations"} className="btn-secondary btn-sm">{kind === "recipient" ? "View donor businesses" : "View recipient orgs"}</a>} />
      {kind === "recipient" && <FilterTabs basePath={`/admin/organizations`} active={sp.status ?? ""} tabs={[{ value: "", label: "All", count: all.length }, ...["pending", "verified", "rejected", "suspended"].map((s) => ({ value: s, label: s[0].toUpperCase() + s.slice(1), count: all.filter((o) => o.verification_status === s).length }))]} />}
      {rows.length ? (
        <div className="space-y-4">
          {rows.map((o) => (
            <Section
              key={o.id}
              title={o.name}
              description={
                <>
                  {o.org_type} · {o.city} · registered {formatDate(o.created_at)} <DemoBadge show={o.is_demo} />
                </>
              }
              actions={<StatusBadge status={o.verification_status} label={ORG_STATUS_LABELS[o.verification_status]} />}
            >
              <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
                <KeyValue
                  items={[
                    ["Contact", `${o.contact_person} · ${o.phone ?? ""} · ${o.email ?? ""}`],
                    ["Account", `${o.owner_name} (${o.owner_email})`],
                    ["Address", o.address],
                    ["Service area", `${o.service_area ?? "—"} · ${o.service_radius_km} km`],
                    ["Capacity", kind === "recipient" ? `${o.capacity_kg_per_day} kg/day · ~${o.beneficiary_capacity ?? "?"} people` : "—"],
                    ["Storage / transport", `${o.has_cold_storage ? "Cold storage" : "No cold storage"} · ${o.has_transport ? "Own transport" : "No transport"}`],
                    ["Food preference", o.food_preference],
                    ["Registration no.", o.registration_number],
                    [
                      "Document",
                      o.document_path ? (
                        <a key="doc" href={`/api/uploads/${o.document_path}`} className="link">
                          {o.document_name ?? "Download"} (protected)
                        </a>
                      ) : (
                        "None uploaded"
                      ),
                    ],
                    ["Applicant notes", o.ver_notes],
                    ["Last decision", o.verification_note],
                  ]}
                />
                <div>
                  {o.verification_status === "pending" && kind === "recipient" && <VerificationReviewForm orgId={o.id} />}
                  {o.verification_status === "verified" && (
                    <ConfirmAction action={suspendOrgAction} fields={{ id: o.id, suspend: "1" }} label="Suspend organisation" variant="danger" title={`Suspend ${o.name}?`} description="They will no longer be able to request food." reasonName="reason" confirmLabel="Suspend" />
                  )}
                  {o.verification_status === "suspended" && <ConfirmAction action={suspendOrgAction} fields={{ id: o.id, suspend: "0" }} label="Reinstate" title={`Reinstate ${o.name}?`} reasonName="reason" confirmLabel="Reinstate" />}
                  {o.verification_status === "rejected" && <p className="text-sm text-muted">Waiting for the organisation to resubmit.</p>}
                </div>
              </div>
            </Section>
          ))}
        </div>
      ) : (
        <EmptyState title="No organisations in this view" />
      )}
    </>
  );
}
