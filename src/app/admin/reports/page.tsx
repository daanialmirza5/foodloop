import { Download } from "lucide-react";
import { computeImpact } from "@/lib/services/impact";
import { PageHeader, Section } from "@/components/ui";
import { ImpactFilters, ImpactView } from "@/components/impact-view";

export const metadata = { title: "Reports" };

const EXPORTS = [
  ["impact?demo=1", "Delivered records (incl. demo)"],
  ["impact", "Delivered records (real only)"],
  ["listings", "All food listings"],
  ["events", "Events"],
  ["collections", "Collections & assignments"],
  ["payments", "Payment transactions"],
  ["incidents", "Incidents"],
  ["users", "Users"],
  ["audit", "Audit log"],
];

export default async function Reports({ searchParams }: { searchParams: Promise<{ from?: string; to?: string; data?: string }> }) {
  const sp = await searchParams;
  const demo = sp.data !== "real";
  const impact = computeImpact({ from: sp.from, to: sp.to, includeDemo: demo });
  const q = new URLSearchParams({ ...(sp.from ? { from: sp.from } : {}), ...(sp.to ? { to: sp.to } : {}) }).toString();
  return (
    <>
      <PageHeader title="Impact reports & exports" />
      <Section title="CSV exports" className="mb-6" description="Exports respect the date filter where applicable. Values starting with = + - @ are escaped to prevent spreadsheet formula injection.">
        <div className="flex flex-wrap gap-2">
          {EXPORTS.map(([k, l]) => (
            <a key={k} href={`/api/export/${k}${q ? (k.includes("?") ? "&" : "?") + q : ""}`} className="btn-secondary btn-sm">
              <Download className="size-3.5" /> {l}
            </a>
          ))}
        </div>
      </Section>
      <ImpactFilters action="/admin/reports" from={sp.from} to={sp.to} demo={demo} showDemoToggle />
      <ImpactView impact={impact} demo={demo} />
    </>
  );
}
