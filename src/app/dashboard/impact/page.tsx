import { requireUser } from "@/lib/session";
import { computeImpact } from "@/lib/services/impact";
import { PageHeader } from "@/components/ui";
import { ImpactFilters, ImpactView } from "@/components/impact-view";

export const metadata = { title: "My impact" };

export default async function MyImpact({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const actor = await requireUser(["donor", "admin"], "/dashboard/impact");
  const sp = await searchParams;
  const demo = !!actor.is_demo;
  const impact = computeImpact({ from: sp.from, to: sp.to, includeDemo: true, donorId: actor.id });
  return (
    <>
      <PageHeader title="My impact report" subtitle="Your donations only, from offered to recipient-confirmed delivery." />
      <ImpactFilters action="/dashboard/impact" from={sp.from} to={sp.to} demo={demo} showDemoToggle={false} />
      <ImpactView impact={impact} demo={demo} exportHref="/api/export/my-donations" />
    </>
  );
}
