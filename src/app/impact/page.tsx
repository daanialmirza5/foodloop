import { computeImpact, hasDemoData } from "@/lib/services/impact";
import { isDemoMode } from "@/lib/utils";
import { PageHeader } from "@/components/ui";
import { ImpactFilters, ImpactView } from "@/components/impact-view";

export const metadata = { title: "Impact" };

export default async function ImpactPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string; data?: string }> }) {
  const sp = await searchParams;
  const demoAvailable = isDemoMode() && hasDemoData();
  const demo = demoAvailable && sp.data !== "real";
  const impact = computeImpact({ from: sp.from, to: sp.to, includeDemo: demo });
  const q = new URLSearchParams({ ...(sp.from ? { from: sp.from } : {}), ...(sp.to ? { to: sp.to } : {}), ...(demo ? { demo: "1" } : {}) });
  return (
    <div className="container-page py-10">
      <PageHeader eyebrow="Transparency" title="Impact dashboard" subtitle="Calculated live from stored records. Delivered food counts only after the receiving organisation confirms the quantity." />
      <ImpactFilters action="/impact" from={sp.from} to={sp.to} demo={demo} showDemoToggle={demoAvailable} />
      <ImpactView impact={impact} demo={demo} exportHref={`/api/export/impact?${q}`} />
    </div>
  );
}
