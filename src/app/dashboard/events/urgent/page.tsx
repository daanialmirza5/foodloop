import { requireUser } from "@/lib/session";
import { listEvents } from "@/lib/services/events";
import { UrgentRescueForm } from "@/components/event-forms";
import { Alert, PageHeader } from "@/components/ui";

export const metadata = { title: "Urgent event food rescue" };

export default async function Urgent() {
  const actor = await requireUser(["donor", "admin"], "/dashboard/events/urgent");
  const events = listEvents({ organizerId: actor.id }).filter((e) => !["cancelled", "completed"].includes(e.status));
  return (
    <>
      <PageHeader eyebrow="Urgent rescue" title="Food available right now?" subtitle="Use this after a wedding or event when suitable food is ready immediately. Coordinators are alerted at once." />
      <Alert tone="warning" title="Safety first" className="mb-6">
        Only donate food that was kept hot (60°C+) or chilled (5°C or below), packed in covered containers, and never served on plates. Cooked food at room temperature for more than about 2 hours will be rejected.
        If no verified recipient can receive the food safely, FoodLoop will tell you — it will not pretend the food was rescued.
      </Alert>
      <UrgentRescueForm events={events} />
    </>
  );
}
