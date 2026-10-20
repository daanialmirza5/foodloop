import Link from "next/link";
import { requireUser } from "@/lib/session";
import { listIncidents } from "@/lib/services/incidents";
import { INCIDENT_KINDS } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";
import { DemoBadge, EmptyState, PageHeader, Pill, Section, StatusBadge } from "@/components/ui";
import { IncidentForm } from "@/components/workflow-forms";

export const metadata = { title: "Incidents" };

export default async function Incidents() {
  const actor = await requireUser(["donor", "ngo", "volunteer", "admin"], "/dashboard/incidents");
  const rows = listIncidents({ reporterId: actor.id });
  return (
    <>
      <PageHeader title="Incidents & problems" subtitle="Report a food-safety concern, missed delivery, delay or complaint. High-severity food-safety reports put the donation on hold immediately." />
      <div className="grid gap-6 xl:grid-cols-[1fr_1.2fr]">
        <Section title="Report a general problem" description="To report about a specific donation, use the form on that donation’s page so it is linked.">
          <IncidentForm />
        </Section>
        <Section title="My reports">
          {rows.length ? (
            <ul className="space-y-3">
              {rows.map((i) => (
                <li key={i.id} className="rounded-xl border border-black/5 p-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={i.status} />
                    <span className="font-medium">{INCIDENT_KINDS[i.kind]}</span>
                    <Pill tone={i.severity === "high" ? "red" : i.severity === "medium" ? "amber" : "gray"}>{i.severity}</Pill>
                    <DemoBadge show={i.is_demo} />
                    <span className="ml-auto text-xs text-muted">{formatDateTime(i.created_at)}</span>
                  </div>
                  <p className="mt-2 text-ink/80">{i.description}</p>
                  {i.listing_code && (
                    <Link href={`/discover/${i.listing_id}`} className="link mt-1 inline-block text-xs">
                      {i.listing_code} · {i.listing_title}
                    </Link>
                  )}
                  {i.resolution && <p className="mt-2 rounded-lg bg-forest-50 p-2 text-xs">Coordinator: {i.resolution}</p>}
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No reports" />
          )}
        </Section>
      </div>
    </>
  );
}
