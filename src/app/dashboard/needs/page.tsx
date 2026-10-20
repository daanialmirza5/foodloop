import { requireUser } from "@/lib/session";
import { getOrgForUser } from "@/lib/services/organizations";
import { listNeeds } from "@/lib/services/needs";
import { CATEGORY_LABELS, type FoodCategory } from "@/lib/constants";
import { formatDateTime, formatKg } from "@/lib/format";
import { Alert, DemoBadge, PageHeader, Section, StatusBadge } from "@/components/ui";
import { InlineAction } from "@/components/forms";
import { NeedForm } from "@/components/workflow-forms";
import { closeNeedAction } from "@/lib/actions";

export const metadata = { title: "Food requirements" };

export default async function Needs() {
  const actor = await requireUser(["ngo"], "/dashboard/needs");
  const org = getOrgForUser(actor.id, "recipient");
  const needs = org ? listNeeds({ orgId: org.id }) : [];
  return (
    <>
      <PageHeader title="Food requirements" subtitle="Tell donors what you regularly need. Requirements appear on the Fresh Meals page for donors planning a donation." />
      {org?.verification_status !== "verified" ? (
        <Alert tone="info">Only verified organisations can publish requirements.</Alert>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
          <Section title="New requirement">
            <NeedForm />
          </Section>
          <Section title="Your requirements">
            {needs.length ? (
              <ul className="space-y-3">
                {needs.map((n) => (
                  <li key={n.id} className="rounded-xl border border-black/5 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-forest-900">{n.title}</p>
                      <StatusBadge status={n.status} />
                    </div>
                    <p className="text-xs text-muted">
                      {CATEGORY_LABELS[n.category as FoodCategory]} · {formatKg(n.quantity_kg)} {n.needed_by && `· by ${formatDateTime(n.needed_by)}`} <DemoBadge show={n.is_demo} />
                    </p>
                    {n.status === "open" && (
                      <div className="mt-2 flex gap-2">
                        <InlineAction action={closeNeedAction} fields={{ id: n.id, status: "fulfilled" }}>
                          Mark fulfilled
                        </InlineAction>
                        <InlineAction action={closeNeedAction} fields={{ id: n.id, status: "closed" }} variant="ghost">
                          Close
                        </InlineAction>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">No requirements yet.</p>
            )}
          </Section>
        </div>
      )}
    </>
  );
}
