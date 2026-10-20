import { requireUser } from "@/lib/session";
import { getVolunteerProfile } from "@/lib/services/logistics";
import { Alert, PageHeader, Section } from "@/components/ui";
import { VolunteerProfileForm } from "@/components/org-forms";

export const metadata = { title: "Volunteer profile" };

export default async function VolunteerProfile({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const actor = await requireUser(["volunteer"], "/dashboard/volunteer-profile");
  const { welcome } = await searchParams;
  return (
    <>
      {welcome && <Alert tone="success" title="Welcome, volunteer!" className="mb-6">Tell us where and when you can help, then browse available tasks.</Alert>}
      <PageHeader title="Volunteer profile" subtitle="Your service areas and availability help coordinators assign suitable pickups." />
      <Section>
        <VolunteerProfileForm defaults={(getVolunteerProfile(actor.id) ?? {}) as never} />
      </Section>
    </>
  );
}
