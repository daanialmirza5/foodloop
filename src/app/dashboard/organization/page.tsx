import { requireUser } from "@/lib/session";
import { getOrgForUser, verificationHistory } from "@/lib/services/organizations";
import { formatDateTime } from "@/lib/format";
import { ORG_STATUS_LABELS } from "@/lib/constants";
import { Alert, PageHeader, Section, StatusBadge } from "@/components/ui";
import { DonorOrgForm, RecipientOrgForm, VerificationForm } from "@/components/org-forms";

export const metadata = { title: "Organisation" };

export default async function OrganizationPage({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const actor = await requireUser(["ngo", "donor"], "/dashboard/organization");
  const { welcome } = await searchParams;
  if (actor.role === "donor") {
    const org = getOrgForUser(actor.id, "donor");
    return (
      <>
        <PageHeader title="Business profile" subtitle="Optional. Add this if you donate on behalf of a restaurant, caterer, hotel, venue or company." />
        <Section>
          <DonorOrgForm defaults={(org ?? { contact_person: actor.name, email: actor.email }) as never} />
        </Section>
      </>
    );
  }
  const org = getOrgForUser(actor.id, "recipient");
  const history = org ? verificationHistory(org.id) : [];
  const pending = history.find((h) => h.status === "pending");
  return (
    <>
      {welcome && (
        <Alert tone="success" title="Welcome! Next: register your organisation" className="mb-6">
          Complete your profile, then submit verification documents. An administrator must verify your organisation before you can request food.
        </Alert>
      )}
      <PageHeader title="Organisation & verification" subtitle="Only administrators can verify organisations. We never ask for details about the people you serve." actions={org && <StatusBadge status={org.verification_status} label={ORG_STATUS_LABELS[org.verification_status]} />} />
      {org?.verification_note && org.verification_status !== "pending" && (
        <Alert tone={org.verification_status === "verified" ? "success" : "error"} className="mb-6" title={`Reviewer note`}>
          {org.verification_note}
        </Alert>
      )}
      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Section title={org ? "Organisation profile" : "Register your organisation"}>
          <RecipientOrgForm defaults={(org ?? { contact_person: actor.name, email: actor.email }) as never} />
        </Section>
        <div className="space-y-6">
          <Section title="Verification">
            {!org ? (
              <p className="text-sm text-muted">Save your organisation profile first.</p>
            ) : org.verification_status === "verified" ? (
              <Alert tone="success">Your organisation is verified and can request food.</Alert>
            ) : org.verification_status === "suspended" ? (
              <Alert tone="error">Your organisation is suspended. Contact the FoodLoop team.</Alert>
            ) : pending ? (
              <Alert tone="info" title="Under review">
                Submitted {formatDateTime(pending.created_at)}. You’ll get an in-app notification when an administrator decides.
              </Alert>
            ) : (
              <VerificationForm />
            )}
          </Section>
          {history.length > 0 && (
            <Section title="Verification history">
              <ul className="space-y-3 text-sm">
                {history.map((h) => (
                  <li key={h.id}>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={h.status} />
                      <span className="text-xs text-muted">{formatDateTime(h.created_at)}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted">
                      Ref: {h.registration_number ?? "—"} {h.document_name && `· ${h.document_name}`}
                    </p>
                    {h.decision_reason && <p className="mt-1 text-xs">{h.decision_reason}</p>}
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </div>
      </div>
    </>
  );
}
