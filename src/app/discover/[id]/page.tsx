import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarHeart, CheckCircle2, Lock, ShieldCheck, Truck, XCircle, AlertTriangle } from "lucide-react";
import { getActor } from "@/lib/session";
import { get } from "@/lib/db";
import { canSeePrivateDetails, expireStale, getListing, matchesForListing, redactListing, screeningsFor, inflightKgForOrg } from "@/lib/services/listings";
import { availableVolunteers, collectionsForListing, deliveryFor, requestsForListing } from "@/lib/services/logistics";
import { getOrgForUser } from "@/lib/services/organizations";
import { historyFor } from "@/lib/services/audit";
import { evaluateMatch } from "@/lib/matching";
import { isAdmin } from "@/lib/permissions";
import { CATEGORY_LABELS, FOOD_TYPE_LABELS, PACKAGING_LABELS, SOURCE_LABELS, STORAGE_LABELS, TRANSPORT_MODE_LABELS, type FoodCategory } from "@/lib/constants";
import { DONOR_CANCELLABLE, DONOR_EDITABLE } from "@/lib/workflow";
import { formatDateTime, formatKg, timeUntil } from "@/lib/format";
import { Alert, DemoBadge, KeyValue, Pill, Section, StatusBadge, Timeline, UrgencyBadge } from "@/components/ui";
import { listingImage } from "@/components/listing-card";
import { LocationMap } from "@/components/map";
import { ConfirmAction, InlineAction } from "@/components/forms";
import { AssignVolunteerForm, ClaimForm, ConfirmDeliveryForm, HandoverForm, IncidentForm, PickupForm, RequestForm, ReviewForm, SchedulePickupForm } from "@/components/workflow-forms";
import { cancelListingAction, closeRequestAction, decideRequestAction, failCollectionAction, rearrangeAction, rejectUnsafeAction, releaseTaskAction, submitDraftAction, withdrawRequestAction } from "@/lib/actions";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const l = getListing((await params).id);
  return { title: l ? l.title : "Food listing" };
}

export default async function ListingPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string; updated?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  expireStale();
  const raw = getListing(id);
  if (!raw) notFound();
  const actor = await getActor();
  const admin = isAdmin(actor);
  const isDonor = !!actor && raw.donor_user_id === actor.id;
  // Drafts and pending/rejected items are only visible to their donor and admins.
  if (["draft", "pending_review", "rejected"].includes(raw.status) && !isDonor && !admin && !canSeePrivateDetails(actor, raw)) notFound();
  const l = redactListing(raw, actor);
  const involved = isDonor || admin || l.private_visible;
  const screenings = screeningsFor(id);
  const auto = screenings.filter((s) => s.stage === "automated").at(-1);
  const autoChecks = auto ? (JSON.parse(auto.checks_json) as { label: string; result: string; detail: string }[]) : [];
  const requests = involved ? requestsForListing(id) : [];
  const collections = collectionsForListing(id);
  const activeCol = collections.find((c) => ["available", "assigned", "in_transit"].includes(c.status));
  const lastCol = collections[0];
  const delivery = deliveryFor(id);
  const history = involved ? historyFor("listing", id) : [];
  const open = ["available", "request_received"].includes(l.status) && !l.safety_hold;

  // NGO context
  const myOrg = actor?.role === "ngo" ? getOrgForUser(actor.id, "recipient") : undefined;
  const myRequest = myOrg ? requestsForListing(id).find((r) => r.recipient_org_id === myOrg.id && ["pending", "accepted", "completed"].includes(r.status)) : undefined;
  const myMatch = myOrg && myOrg.verification_status === "verified" ? evaluateMatch(raw, myOrg, inflightKgForOrg(myOrg.id)) : undefined;
  const acceptedReq = requests.find((r) => r.status === "accepted");
  const isRecipient = !!myOrg && acceptedReq?.recipient_org_id === myOrg.id;
  const isMyVolunteerTask = !!actor && activeCol?.volunteer_user_id === actor.id;
  const matches = admin || isDonor ? matchesForListing(raw) : [];
  const ev = l.event_id ? get<{ id: string; name: string; transport_available: number }>("SELECT id, name, transport_available FROM events WHERE id = ?", l.event_id) : undefined;
  const backHref = actor?.role === "admin" ? "/admin/listings" : isDonor ? "/dashboard/listings" : "/discover";

  return (
    <div className="container-page py-8">
      <Link href={backHref} className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-forest-800">
        <ArrowLeft className="size-4" /> Back
      </Link>
      {sp.created && (
        <Alert tone={l.status === "rejected" ? "error" : "success"} title={l.status === "rejected" ? "This food did not pass automated safety screening" : l.status === "draft" ? "Draft saved" : "Submitted for safety review"} className="mb-6">
          {l.status === "rejected" ? "It has not been published. See the failed checks below." : l.status === "draft" ? "Submit it when you are ready." : "A coordinator will review it before NGOs can see it. You'll be notified in-app."}
        </Alert>
      )}
      {sp.updated && <Alert tone="info" title="Changes saved — the listing went back through safety screening" className="mb-6" />}
      {l.safety_hold ? (
        <Alert tone="error" title="Distribution on hold" className="mb-6">
          A high-severity food-safety report is under review. This donation cannot be requested, collected or confirmed until a coordinator resolves it.
        </Alert>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          <div className="card overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={listingImage(l)} alt={l.photo_path ? `Photo of ${l.title}` : ""} className="aspect-[21/9] w-full object-cover" />
            <div className="p-5 sm:p-6">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={l.status} />
                {l.is_urgent ? <Pill tone="red">Urgent rescue</Pill> : null}
                <Pill tone={l.source === "event_surplus" ? "amber" : "green"}>{SOURCE_LABELS[l.source as keyof typeof SOURCE_LABELS]}</Pill>
                {open && <UrgencyBadge deadline={l.collection_deadline} />}
                <DemoBadge show={l.is_demo} />
                <span className="ml-auto font-mono text-xs text-muted">{l.code}</span>
              </div>
              <h1 className="mt-3 font-display text-2xl font-semibold text-forest-900 sm:text-3xl">{l.title}</h1>
              <p className="mt-1 text-sm text-muted">
                From {l.donor_org_name ?? l.donor_name}
                {ev && (
                  <>
                    {" "}
                    · <CalendarHeart className="inline size-3.5" /> {involved ? <Link className="link" href={isDonor || admin ? `/dashboard/events/${ev.id}` : "#"}>{ev.name}</Link> : ev.name}
                  </>
                )}
              </p>
              {l.description && <p className="mt-4 text-sm text-ink/80">{l.description}</p>}
              {l.status_reason && ["rejected", "cancelled", "expired"].includes(l.status) && (
                <Alert tone="error" className="mt-4">
                  {l.status_reason}
                </Alert>
              )}
            </div>
          </div>

          <Section title="Food details">
            <KeyValue
              items={[
                ["Category", CATEGORY_LABELS[l.category as FoodCategory]],
                ["Food type", FOOD_TYPE_LABELS[l.food_type as keyof typeof FOOD_TYPE_LABELS]],
                ["Quantity", `${l.quantity} ${l.unit} (~${formatKg(l.quantity_kg)})`],
                ["Known allergens", l.allergens],
                ["Prepared / packed", formatDateTime(l.prepared_at)],
                ["Expiry / use-by", formatDateTime(l.expiry_at)],
                ["Storage", STORAGE_LABELS[l.storage_condition as keyof typeof STORAGE_LABELS]],
                ["Recorded temperature", l.storage_temp_c != null ? `${l.storage_temp_c}°C` : "—"],
                ["Packaging", PACKAGING_LABELS[l.packaging_condition as keyof typeof PACKAGING_LABELS]],
                ["Storage history", l.storage_history],
                ["Pickup window", `${formatDateTime(l.pickup_window_start)} – ${formatDateTime(l.pickup_window_end)}`],
                ["Collection deadline", `${formatDateTime(l.collection_deadline)}${open ? ` (${timeUntil(l.collection_deadline)})` : ""}`],
              ]}
            />
          </Section>

          <Section
            title="Pickup location"
            actions={
              !l.private_visible && (
                <span className="inline-flex items-center gap-1 text-xs text-muted">
                  <Lock className="size-3.5" /> Exact address hidden
                </span>
              )
            }
          >
            <KeyValue
              items={[
                ["Address", l.pickup_address],
                ["Contact", l.private_visible ? `${l.contact_name} · ${l.contact_phone}` : l.contact_name],
                ["Instructions", l.private_visible ? l.instructions : "Shared after acceptance"],
              ]}
            />
            {l.lat != null && l.lng != null && (
              <div className="mt-4">
                <LocationMap lat={l.lat} lng={l.lng} approximate={!l.private_visible} label={l.title} />
              </div>
            )}
          </Section>

          <Section title="Safety screening" description="Automated pre-screening against FoodLoop’s operating rules, followed by coordinator review, pickup and delivery checks.">
            {autoChecks.length ? (
              <ul className="space-y-2">
                {autoChecks.map((c) => (
                  <li key={c.label} className="flex gap-3 text-sm">
                    {c.result === "pass" ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-forest-600" /> : c.result === "fail" ? <XCircle className="mt-0.5 size-4 shrink-0 text-red-600" /> : <AlertTriangle className="mt-0.5 size-4 shrink-0 text-saffron-500" />}
                    <span>
                      <span className="font-medium">{c.label}</span> — <span className="text-ink/70">{c.detail}</span>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">Not screened yet (draft).</p>
            )}
            {screenings.filter((s) => s.stage !== "automated").length > 0 && (
              <ul className="mt-4 space-y-1 border-t border-black/5 pt-4 text-sm">
                {screenings
                  .filter((s) => s.stage !== "automated")
                  .map((s) => (
                    <li key={s.id} className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={s.result} />
                      <span className="capitalize">{s.stage} check</span>
                      <span className="text-muted">
                        {formatDateTime(s.created_at)}
                        {involved && s.screener ? ` · ${s.screener}` : ""}
                        {involved && s.notes ? ` — ${s.notes}` : ""}
                      </span>
                    </li>
                  ))}
              </ul>
            )}
          </Section>

          {involved && (
            <Section title="Tracking history">
              <Timeline items={history} />
            </Section>
          )}
        </div>

        {/* ---------------- action column ---------------- */}
        <div className="space-y-6">
          {delivery && (
            <Section title="Delivered">
              <p className="flex items-center gap-2 text-sm text-forest-800">
                <CheckCircle2 className="size-5" /> {formatKg(delivery.qty_received_kg)} confirmed received on {formatDateTime(delivery.confirmed_at)}
              </p>
              {delivery.notes && <p className="mt-2 text-sm text-muted">{delivery.notes}</p>}
            </Section>
          )}

          {/* admin review */}
          {admin && l.status === "pending_review" && (
            <Section title="Coordinator review" description="Required before the food becomes visible to NGOs.">
              <ReviewForm listingId={id} />
            </Section>
          )}

          {/* donor controls */}
          {(isDonor || admin) && (
            <Section title={isDonor ? "Manage this donation" : "Donor controls"}>
              <div className="flex flex-wrap gap-2">
                {l.status === "draft" && (
                  <InlineAction action={submitDraftAction} fields={{ id }} variant="primary">
                    Submit for review
                  </InlineAction>
                )}
                {DONOR_EDITABLE.includes(l.status) && !requests.some((r) => ["pending", "accepted"].includes(r.status)) && (
                  <Link href={`/dashboard/listings/${id}/edit`} className="btn-secondary btn-sm">
                    Edit
                  </Link>
                )}
                {DONOR_CANCELLABLE.includes(l.status) && (
                  <ConfirmAction action={cancelListingAction} fields={{ id }} label="Cancel donation" variant="danger" title="Cancel this donation?" description="Requesting organisations and assigned volunteers will be notified." reasonName="reason" confirmLabel="Cancel donation" />
                )}
                {admin && !["delivered", "rejected", "cancelled", "expired"].includes(l.status) && (
                  <ConfirmAction action={rejectUnsafeAction} fields={{ id }} label="Block as unsafe" variant="danger" title="Reject this donation for safety?" description="Open requests and collections are cancelled. This cannot be undone." reasonName="reason" confirmLabel="Reject" />
                )}
              </div>
              {["delivered", "rejected", "cancelled", "expired"].includes(l.status) && <p className="mt-2 text-xs text-muted">Completed or closed donations cannot be edited.</p>}
            </Section>
          )}

          {(isDonor || admin) && requests.length > 0 && (
            <Section title={`Requests (${requests.length})`}>
              <ul className="space-y-3">
                {requests.map((r) => (
                  <li key={r.id} className="rounded-xl border border-black/5 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-forest-900">{r.org_name}</p>
                      <StatusBadge status={r.status} />
                    </div>
                    <p className="mt-0.5 text-xs text-muted">
                      {r.org_type} · {r.org_city} · capacity {r.org_capacity} kg/day · {TRANSPORT_MODE_LABELS[r.transport_mode]}
                    </p>
                    {r.message && <p className="mt-2 text-sm text-ink/80">“{r.message}”</p>}
                    {r.decision_reason && <p className="mt-1 text-xs text-muted">Note: {r.decision_reason}</p>}
                    {r.status === "pending" && l.status === "request_received" && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <InlineAction action={decideRequestAction} fields={{ id: r.id, decision: "accept" }} variant="primary">
                          Accept
                        </InlineAction>
                        <ConfirmAction action={decideRequestAction} fields={{ id: r.id, decision: "reject" }} label="Decline" title="Decline this request?" reasonName="reason" confirmLabel="Decline" />
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {(isDonor || admin) && open && (
            <Section title="Potential matches" description="Verified organisations that can safely receive this food (capacity, distance, diet, storage, deadline).">
              <ul className="space-y-2 text-sm">
                {matches.slice(0, 6).map((m) => (
                  <li key={m.org.id} className="rounded-xl bg-sand/50 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{m.org.name}</span>
                      {m.eligible ? <Pill tone="green">Eligible · score {m.score}</Pill> : <Pill tone="gray">Not suitable</Pill>}
                    </div>
                    <p className="mt-1 text-xs text-muted">{(m.eligible ? m.reasons : m.blockers).join(" ")}</p>
                  </li>
                ))}
                {!matches.some((m) => m.eligible) && <Alert tone="warning">No verified recipient can currently receive this donation safely. Coordinators have been alerted — it has not been rescued yet.</Alert>}
              </ul>
            </Section>
          )}

          {/* NGO panel */}
          {actor?.role === "ngo" && (
            <Section title="Request this food">
              {!myOrg ? (
                <Alert tone="warning">
                  <Link href="/dashboard/organization" className="link">Register your organisation</Link> to request food.
                </Alert>
              ) : myOrg.verification_status !== "verified" ? (
                <Alert tone="info">Your organisation is {myOrg.verification_status}. Only verified organisations can request food.</Alert>
              ) : myRequest ? (
                <div className="space-y-3 text-sm">
                  <p className="flex items-center gap-2">
                    Your request: <StatusBadge status={myRequest.status} />
                  </p>
                  {myRequest.status === "pending" && (
                    <InlineAction action={withdrawRequestAction} fields={{ id: myRequest.id }}>
                      Withdraw request
                    </InlineAction>
                  )}
                </div>
              ) : open && myMatch ? (
                myMatch.eligible ? (
                  <>
                    <p className="mb-3 text-xs text-muted">{myMatch.reasons.join(" ")}</p>
                    <RequestForm listingId={id} hasTransport={!!myOrg.has_transport} canDonorDeliver={!!ev?.transport_available} />
                  </>
                ) : (
                  <Alert tone="warning" title="Your organisation can’t safely receive this donation">
                    {myMatch.blockers.join(" ")}
                  </Alert>
                )
              ) : (
                <p className="text-sm text-muted">This donation is not open for requests.</p>
              )}
            </Section>
          )}

          {/* collection & delivery */}
          {(involved || actor?.role === "volunteer") && lastCol && (
            <Section title="Collection" actions={<StatusBadge status={lastCol.status} />}>
              <KeyValue
                items={[
                  ["Method", TRANSPORT_MODE_LABELS[lastCol.transport_mode]],
                  ["Recipient", lastCol.org_name],
                  ["Volunteer", lastCol.volunteer_name ?? (lastCol.transport_mode === "volunteer" ? "Not assigned yet" : "—")],
                  ["Scheduled pickup", formatDateTime(lastCol.scheduled_pickup_at)],
                  ["Picked up", lastCol.picked_up_at ? `${formatDateTime(lastCol.picked_up_at)} · ${formatKg(lastCol.qty_collected_kg)}` : "—"],
                  ["Handed over", lastCol.delivered_at ? `${formatDateTime(lastCol.delivered_at)}${lastCol.qty_delivered_kg ? ` · ${formatKg(lastCol.qty_delivered_kg)}` : ""}` : "—"],
                  ...(involved && lastCol.status !== "available" ? ([["Deliver to", lastCol.org_address ?? "—"]] as [string, string][]) : []),
                ]}
              />
              {lastCol.failure_reason && <Alert tone="error" className="mt-3">{lastCol.failure_reason}</Alert>}

              <div className="mt-4 space-y-4">
                {actor?.role === "volunteer" && activeCol?.status === "available" && !l.safety_hold && <ClaimForm collectionId={activeCol.id} defaultEta={l.pickup_window_start} />}
                {admin && activeCol && ["available", "assigned"].includes(activeCol.status) && activeCol.transport_mode === "volunteer" && (
                  <AssignVolunteerForm collectionId={activeCol.id} volunteers={availableVolunteers()} defaultEta={activeCol.scheduled_pickup_at ?? l.pickup_window_start} />
                )}
                {activeCol?.status === "assigned" && activeCol.transport_mode !== "volunteer" && (isDonor || isRecipient || admin) && !activeCol.scheduled_pickup_at && (
                  <SchedulePickupForm collectionId={activeCol.id} defaultWhen={l.pickup_window_start} />
                )}
                {activeCol?.status === "assigned" && (isMyVolunteerTask || admin || (activeCol.transport_mode === "recipient" && isRecipient) || (activeCol.transport_mode === "donor" && isDonor)) && (
                  <div className="rounded-xl border border-forest-100 p-4">
                    <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-forest-900">
                      <Truck className="size-4" /> Record pickup
                    </p>
                    <PickupForm collectionId={activeCol.id} maxKg={l.quantity_kg} />
                  </div>
                )}
                {activeCol?.status === "in_transit" && activeCol.transport_mode !== "recipient" && (isMyVolunteerTask || admin || (activeCol.transport_mode === "donor" && isDonor)) && (
                  <div className="rounded-xl border border-forest-100 p-4">
                    <p className="mb-3 text-sm font-semibold text-forest-900">Record handover at recipient</p>
                    <HandoverForm collectionId={activeCol.id} maxKg={activeCol.qty_collected_kg ?? l.quantity_kg} />
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  {isMyVolunteerTask && activeCol?.status === "assigned" && (
                    <ConfirmAction action={releaseTaskAction} fields={{ id: activeCol.id }} label="Release task" title="Release this task?" description="It returns to the open pool for another volunteer." reasonName="reason" reasonRequired={false} confirmLabel="Release" />
                  )}
                  {activeCol && ["available", "assigned"].includes(activeCol.status) && (isMyVolunteerTask || admin || isDonor || isRecipient) && (
                    <ConfirmAction action={failCollectionAction} fields={{ id: activeCol.id }} label="Report missed pickup" variant="danger" title="Record a missed / failed pickup?" description="A coordinator can then arrange another collection or close the request." reasonName="reason" reasonLabel="What happened?" confirmLabel="Record" />
                  )}
                  {admin && l.status === "accepted" && !activeCol && (
                    <InlineAction action={rearrangeAction} fields={{ listing_id: id, mode: "volunteer" }} variant="primary">
                      Arrange another collection
                    </InlineAction>
                  )}
                  {admin && ["accepted", "pickup_scheduled"].includes(l.status) && (
                    <ConfirmAction action={closeRequestAction} fields={{ listing_id: id }} label="Close request & re-open food" title="Close the accepted request?" description="The food returns to the pool for other organisations, if still within its deadline." reasonName="reason" confirmLabel="Close request" />
                  )}
                </div>
              </div>
            </Section>
          )}

          {(isRecipient || (admin && acceptedReq)) && l.status === "collected" && !l.safety_hold && (
            <Section title="Confirm delivery" description="Only recipient-confirmed quantities count as delivered impact.">
              <ConfirmDeliveryForm listingId={id} maxKg={lastCol?.qty_delivered_kg ?? lastCol?.qty_collected_kg ?? l.quantity_kg} />
            </Section>
          )}

          {actor && involved && actor.role !== "supporter" && (
            <Section title="Report a problem" description="Food safety concern, delay, missed delivery or complaint.">
              <IncidentForm listingId={id} collectionId={lastCol?.id} />
            </Section>
          )}

          {!actor && open && (
            <Section title="Are you an NGO or shelter?">
              <p className="text-sm text-muted">Verified organisations can request this food.</p>
              <div className="mt-3 flex gap-2">
                <Link href={`/login?next=/discover/${id}`} className="btn-primary btn-sm">
                  Sign in
                </Link>
                <Link href="/register?role=ngo" className="btn-secondary btn-sm">
                  Register organisation
                </Link>
              </div>
            </Section>
          )}

          <p className="flex items-start gap-2 text-xs text-muted">
            <ShieldCheck className="mt-0.5 size-3.5 shrink-0" /> FoodLoop coordinates donations but does not replace appropriate handling, safety checks or legal compliance by donors and recipients.
          </p>
        </div>
      </div>
    </div>
  );
}
