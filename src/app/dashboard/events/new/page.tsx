import { requireUser } from "@/lib/session";
import { publicDirectory } from "@/lib/services/organizations";
import { EventForm } from "@/components/event-forms";
import { PageHeader } from "@/components/ui";

export const metadata = { title: "Register an event" };

export default async function NewEvent() {
  const actor = await requireUser(["donor", "admin"], "/dashboard/events/new");
  return (
    <>
      <PageHeader eyebrow="Event Food Rescue" title="Register an upcoming event" subtitle="Tell us about the wedding or function in advance. This is a plan — after the event you will record the actual surplus food." />
      <EventForm mode="create" recipients={publicDirectory()} defaults={{ organizer_name: actor.name, organizer_email: actor.email }} />
    </>
  );
}
