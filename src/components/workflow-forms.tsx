"use client";

import { ActionForm, Checkbox, Input, Select, SubmitButton, Textarea } from "./forms";
import {
  requestFoodAction, reviewListingAction, confirmDeliveryAction, recordPickupAction, recordHandoverAction, assignVolunteerAction, schedulePickupAction,
  reportIncidentAction, claimTaskAction, createNeedAction, reviewIncidentAction, reviewVerificationAction, disburseAction, saveSettingsAction, createAdminAction,
} from "@/lib/actions";
import { CATEGORY_LABELS, FOOD_CATEGORIES, INCIDENT_KINDS } from "@/lib/constants";
import { PICKUP_CHECKS } from "@/lib/safety";
import { toLocalInput } from "@/lib/format";

export function RequestForm({ listingId, hasTransport, canDonorDeliver }: { listingId: string; hasTransport: boolean; canDonorDeliver: boolean }) {
  const modes = [
    { value: "volunteer", label: "FoodLoop volunteer collects and delivers" },
    ...(hasTransport ? [{ value: "recipient", label: "We will collect with our own transport" }] : []),
    ...(canDonorDeliver ? [{ value: "donor", label: "Donor offered to deliver" }] : []),
  ];
  return (
    <ActionForm action={requestFoodAction} className="space-y-3">
      <input type="hidden" name="listing_id" value={listingId} />
      <Select label="Collection method" name="transport_mode" options={modes} defaultValue="volunteer" />
      <Textarea label="Message to the donor (optional)" name="message" placeholder="How you will use the food, when you can receive it…" />
      <SubmitButton className="w-full">Request this food</SubmitButton>
    </ActionForm>
  );
}

export function ReviewForm({ listingId }: { listingId: string }) {
  return (
    <ActionForm action={reviewListingAction} className="space-y-3">
      <input type="hidden" name="id" value={listingId} />
      <Checkbox
        name="checklist"
        label="Manual safety checklist confirmed"
        hint="I checked preparation time, temperature, storage, packaging and allergen details with the donor and found no reason to doubt safety."
      />
      <Textarea label="Review notes" name="notes" placeholder="e.g. Called donor; temperature log 66°C; lidded containers." hint="Required when rejecting." />
      <div className="flex flex-wrap gap-2">
        <SubmitButton name="decision" value="approve">
          Approve & publish
        </SubmitButton>
        <SubmitButton name="decision" value="reject" variant="danger" formNoValidate>
          Reject
        </SubmitButton>
      </div>
    </ActionForm>
  );
}

export function ConfirmDeliveryForm({ listingId, maxKg }: { listingId: string; maxKg: number }) {
  return (
    <ActionForm action={confirmDeliveryAction} className="space-y-3">
      <input type="hidden" name="listing_id" value={listingId} />
      <Input label="Quantity received (kg)" name="qty" type="number" step="0.1" min="0" max={maxKg} defaultValue={maxKg} required hint={`Up to ${maxKg} kg handed over`} />
      <Select
        label="Condition on arrival"
        name="condition"
        options={[
          { value: "ok", label: "Received in safe, acceptable condition" },
          { value: "refused", label: "Refused — unsafe or unacceptable (creates an incident)" },
        ]}
      />
      <Textarea label="Notes" name="notes" placeholder="Temperature on arrival, any issues…" />
      <SubmitButton className="w-full">Confirm receipt</SubmitButton>
    </ActionForm>
  );
}

export function PickupForm({ collectionId, maxKg }: { collectionId: string; maxKg: number }) {
  return (
    <ActionForm action={recordPickupAction} className="space-y-3">
      <input type="hidden" name="id" value={collectionId} />
      <p className="text-sm font-medium text-ink">Pickup safety checklist</p>
      <div className="grid gap-2">
        {PICKUP_CHECKS.map((c) => (
          <Checkbox key={c.key} name={`check_${c.key}`} label={c.label} />
        ))}
      </div>
      <p className="text-xs text-muted">If any item cannot be confirmed, leave it unticked: the food will be blocked and an incident created — never transport unsafe food.</p>
      <Input label="Quantity collected (kg)" name="qty" type="number" step="0.1" min="0.1" max={Math.round(maxKg * 1.1 * 10) / 10} defaultValue={maxKg} required />
      <Textarea label="Notes" name="notes" />
      <SubmitButton className="w-full">Record pickup</SubmitButton>
    </ActionForm>
  );
}

export function HandoverForm({ collectionId, maxKg }: { collectionId: string; maxKg: number }) {
  return (
    <ActionForm action={recordHandoverAction} className="space-y-3">
      <input type="hidden" name="id" value={collectionId} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Input label="Quantity handed over (kg)" name="qty" type="number" step="0.1" min="0.1" max={maxKg} defaultValue={maxKg} required />
        <Input label="Time spent (minutes)" name="minutes" type="number" min="1" max="600" defaultValue={60} hint="Logged as volunteer hours" />
      </div>
      <Textarea label="Handover notes" name="notes" placeholder="Received by…, temperature, etc." />
      <SubmitButton className="w-full">Record handover</SubmitButton>
    </ActionForm>
  );
}

export function ClaimForm({ collectionId, defaultEta }: { collectionId: string; defaultEta: string }) {
  return (
    <ActionForm action={claimTaskAction} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="id" value={collectionId} />
      <Input label="I can pick up at" name="eta" type="datetime-local" defaultValue={toLocalInput(defaultEta)} className="min-w-52 flex-1" />
      <SubmitButton>Accept task</SubmitButton>
    </ActionForm>
  );
}

export function AssignVolunteerForm({ collectionId, volunteers, defaultEta }: { collectionId: string; volunteers: { id: string; name: string; active_count: number; service_areas: string | null }[]; defaultEta: string }) {
  return (
    <ActionForm action={assignVolunteerAction} className="space-y-3">
      <input type="hidden" name="id" value={collectionId} />
      <Select label="Volunteer" name="volunteer_id" required placeholder="Choose a volunteer" options={volunteers.map((v) => ({ value: v.id, label: `${v.name} · ${v.active_count} active${v.service_areas ? ` · ${v.service_areas}` : ""}` }))} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Input label="Pickup time" name="eta" type="datetime-local" defaultValue={toLocalInput(defaultEta)} />
        <Input label="Transport partner (optional)" name="transport_partner" placeholder="e.g. Partner van #2" />
      </div>
      <SubmitButton>Assign</SubmitButton>
    </ActionForm>
  );
}

export function SchedulePickupForm({ collectionId, defaultWhen }: { collectionId: string; defaultWhen: string }) {
  return (
    <ActionForm action={schedulePickupAction} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="id" value={collectionId} />
      <Input label="Pickup time" name="when" type="datetime-local" required defaultValue={toLocalInput(defaultWhen)} className="min-w-52 flex-1" />
      <SubmitButton>Schedule pickup</SubmitButton>
    </ActionForm>
  );
}

export function IncidentForm({ listingId, collectionId, eventId }: { listingId?: string; collectionId?: string; eventId?: string }) {
  return (
    <ActionForm action={reportIncidentAction} className="space-y-3" resetOnSuccess>
      {listingId && <input type="hidden" name="listing_id" value={listingId} />}
      {collectionId && <input type="hidden" name="collection_id" value={collectionId} />}
      {eventId && <input type="hidden" name="event_id" value={eventId} />}
      <div className="grid gap-3 sm:grid-cols-2">
        <Select label="Type" name="kind" options={Object.entries(INCIDENT_KINDS).map(([value, label]) => ({ value, label }))} />
        <Select
          label="Severity"
          name="severity"
          defaultValue="medium"
          options={[
            { value: "low", label: "Low" },
            { value: "medium", label: "Medium" },
            { value: "high", label: "High — put food on hold" },
          ]}
        />
      </div>
      <Textarea label="What happened?" name="description" required minLength={10} />
      <SubmitButton variant="secondary">Report incident</SubmitButton>
    </ActionForm>
  );
}

export function NeedForm() {
  return (
    <ActionForm action={createNeedAction} className="space-y-3" resetOnSuccess>
      <Input label="Requirement" name="title" required placeholder="e.g. Dry rations for weekly distribution" />
      <div className="grid gap-3 sm:grid-cols-3">
        <Select label="Category" name="category" options={FOOD_CATEGORIES.map((c) => ({ value: c, label: CATEGORY_LABELS[c] }))} defaultValue="groceries" />
        <Input label="Quantity (kg)" name="quantity_kg" type="number" min="1" required />
        <Select
          label="Food type"
          name="food_type"
          options={[
            { value: "any", label: "Any" },
            { value: "veg", label: "Vegetarian only" },
            { value: "non_veg", label: "Non-vegetarian" },
            { value: "mixed", label: "Mixed" },
          ]}
        />
      </div>
      <Input label="Needed by (optional)" name="needed_by" type="datetime-local" />
      <Textarea label="Notes" name="notes" />
      <SubmitButton>Publish requirement</SubmitButton>
    </ActionForm>
  );
}

export function IncidentReviewForm({ id, hasListing, held }: { id: string; hasListing: boolean; held: boolean }) {
  return (
    <ActionForm action={reviewIncidentAction} className="space-y-3">
      <input type="hidden" name="id" value={id} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Select
          label="Status"
          name="status"
          options={[
            { value: "investigating", label: "Investigating" },
            { value: "resolved", label: "Resolved" },
            { value: "dismissed", label: "Dismissed" },
          ]}
        />
        {hasListing && (
          <Select
            label="Action on the donation"
            name="listing_action"
            options={[
              { value: "none", label: "No change" },
              ...(held ? [{ value: "release_hold", label: "Release safety hold" }] : []),
              { value: "reject_listing", label: "Reject the donation as unsafe" },
            ]}
          />
        )}
      </div>
      <Textarea label="Findings / resolution" name="resolution" required minLength={5} />
      <SubmitButton>Save decision</SubmitButton>
    </ActionForm>
  );
}

export function VerificationReviewForm({ orgId }: { orgId: string }) {
  return (
    <ActionForm action={reviewVerificationAction} className="space-y-3">
      <input type="hidden" name="id" value={orgId} />
      <Textarea label="Reason (recorded in the audit log)" name="reason" required minLength={5} placeholder="e.g. Trust registration certificate and address proof checked." />
      <div className="flex gap-2">
        <SubmitButton name="decision" value="verified">
          Verify organisation
        </SubmitButton>
        <SubmitButton name="decision" value="rejected" variant="danger">
          Reject
        </SubmitButton>
      </div>
    </ActionForm>
  );
}

export function DisburseForm({ programs }: { programs: { id: string; title: string }[] }) {
  return (
    <ActionForm action={disburseAction} className="space-y-3" resetOnSuccess>
      <Select label="Programme" name="program_id" options={programs.map((p) => ({ value: p.id, label: p.title }))} />
      <Input label="Amount (₹)" name="amount" type="number" min="1" required />
      <Textarea label="Description & reference" name="description" required minLength={5} placeholder="What was funded, paid to whom, transfer reference" />
      <SubmitButton>Record disbursement</SubmitButton>
    </ActionForm>
  );
}

export function SettingsForm({ rules, kgPerMeal }: { rules: Record<string, number>; kgPerMeal: number }) {
  return (
    <ActionForm action={saveSettingsAction} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Input label="Max hours at room temperature (cooked food)" name="ambientMaxHours" type="number" step="0.5" defaultValue={rules.ambientMaxHours} required />
        <Input label="Min hot-holding temperature (°C)" name="hotHeldMinTempC" type="number" defaultValue={rules.hotHeldMinTempC} required />
        <Input label="Max hours hot-held" name="hotHeldMaxHours" type="number" step="0.5" defaultValue={rules.hotHeldMaxHours} required />
        <Input label="Max cold-holding temperature (°C)" name="coldMaxTempC" type="number" defaultValue={rules.coldMaxTempC} required />
        <Input label="Max hours refrigerated (cooked food)" name="refrigeratedMaxHours" type="number" defaultValue={rules.refrigeratedMaxHours} required />
        <Input label="Kg per meal (for estimates)" name="kg_per_meal" type="number" step="0.05" defaultValue={kgPerMeal} required hint="Used only for labelled meal estimates" />
      </div>
      <Input label="Reason for change" name="reason" placeholder="Recorded in the audit log" />
      <SubmitButton>Save settings</SubmitButton>
    </ActionForm>
  );
}

export function CreateAdminForm() {
  return (
    <ActionForm action={createAdminAction} className="space-y-3" resetOnSuccess>
      <div className="grid gap-3 sm:grid-cols-2">
        <Input label="Name" name="name" required />
        <Input label="Email" name="email" type="email" required />
      </div>
      <Input label="Temporary password" name="password" type="password" required minLength={8} />
      <Textarea label="Reason" name="reason" required minLength={5} />
      <SubmitButton>Create administrator</SubmitButton>
    </ActionForm>
  );
}
