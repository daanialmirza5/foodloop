"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import type { ActionState } from "../action-state";
import { runAction, str, num, bool } from "./run";
import { getActor, setSessionCookie, clearSessionCookie, sessionToken } from "../session";
import { authenticate, createSession, destroySession, registerUser, createPasswordReset, resetPassword, getUserByEmail } from "../auth";
import { rateLimit } from "../rate-limit";
import { invalid, forbidden } from "../errors";
import { requireActor } from "../permissions";
import { isDemoMode } from "../utils";
import { istToIso, parseForm, registerSchema, loginSchema, listingSchema, eventSchema, urgentRescueSchema, orgSchema, donorOrgSchema, requestSchema, needSchema, moneySchema, incidentSchema, partnerSchema, volunteerProfileSchema } from "../validation";
import { saveUpload } from "../uploads";
import * as listings from "../services/listings";
import * as logistics from "../services/logistics";
import * as events from "../services/events";
import * as orgs from "../services/organizations";
import * as incidents from "../services/incidents";
import * as payments from "../services/payments";
import * as users from "../services/users";
import * as needs from "../services/needs";
import { markRead } from "../services/notifications";
import { setSetting } from "../db";
import { PICKUP_CHECKS } from "../safety";

type A = (prev: ActionState, fd: FormData) => Promise<ActionState>;

async function clientKey() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
}

function safeNext(next: string) {
  return next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
}

// ------------------------------------------------------------------ auth

export const loginAction: A = async (_p, fd) =>
  runAction(async () => {
    rateLimit(`login:${await clientKey()}`, 10, 60_000);
    const input = parseForm(loginSchema, fd);
    const user = authenticate(input.email, input.password);
    const { token, expires } = createSession(user.id);
    await setSessionCookie(token, expires);
    redirect(safeNext(str(fd, "next") || (user.role === "admin" ? "/admin" : "/dashboard")));
  });

export const registerAction: A = async (_p, fd) =>
  runAction(async () => {
    rateLimit(`register:${await clientKey()}`, 5, 60_000);
    const input = parseForm(registerSchema, fd);
    const user = registerUser(input);
    const { token, expires } = createSession(user.id);
    await setSessionCookie(token, expires);
    const next = user.role === "ngo" ? "/dashboard/organization?welcome=1" : user.role === "volunteer" ? "/dashboard/volunteer-profile?welcome=1" : user.role === "donor" ? "/dashboard?welcome=1" : "/donate-money?welcome=1";
    redirect(next);
  });

export async function logoutAction() {
  destroySession(await sessionToken());
  await clearSessionCookie();
  redirect("/");
}

export const demoLoginAction: A = async (_p, fd) =>
  runAction(async () => {
    if (!isDemoMode()) throw forbidden("Demo access is disabled on this deployment.");
    const email = str(fd, "email");
    const u = getUserByEmail(email);
    if (!u || !u.is_demo) throw invalid("Unknown demo account. Reset the demo data first.");
    const { token, expires } = createSession(u.id);
    await setSessionCookie(token, expires);
    redirect(u.role === "admin" ? "/admin" : "/dashboard");
  });

export const forgotPasswordAction: A = async (_p, fd) =>
  runAction(async () => {
    rateLimit(`forgot:${await clientKey()}`, 5, 60_000);
    const email = str(fd, "email");
    if (!email) throw invalid("Enter your email.", { email: "Required" });
    const token = createPasswordReset(email);
    // No email service is configured. In demo mode we show the link on screen and say so;
    // otherwise we respond identically whether or not the account exists.
    if (token && isDemoMode()) return { ok: true, message: "Email delivery is not configured in this build. DEMO MODE: use the link below to reset your password.", data: { link: `/reset-password?token=${token}` } };
    return "If an account exists for that email, reset instructions will be sent once email delivery is configured by the administrator.";
  });

export const resetPasswordAction: A = async (_p, fd) =>
  runAction(async () => {
    if (str(fd, "password") !== str(fd, "confirm")) throw invalid("Passwords do not match.", { confirm: "Passwords do not match." });
    resetPassword(str(fd, "token"), str(fd, "password"));
    redirect("/login?reason=reset");
  });

export const updateProfileAction: A = async (_p, fd) =>
  runAction(async () => {
    users.updateProfile(await getActor(), { name: str(fd, "name"), phone: str(fd, "phone"), city: str(fd, "city") });
    return "Profile updated.";
  });

// -------------------------------------------------------------- listings

export const createListingAction: A = async (_p, fd) =>
  runAction(async () => {
    const actor = await getActor();
    rateLimit(`listing:${actor?.id}`, 20, 60_000);
    const input = parseForm(listingSchema, fd);
    const photo = await saveUpload(fd.get("photo") as File | null, "photos");
    const { listing } = listings.createListing(actor, input, { photo_path: photo });
    redirect(`/dashboard/listings/${listing.id}?created=1`);
  });

export const updateListingAction: A = async (_p, fd) =>
  runAction(async () => {
    const actor = await getActor();
    const id = str(fd, "id");
    const input = parseForm(listingSchema, fd);
    const photo = await saveUpload(fd.get("photo") as File | null, "photos");
    listings.updateListing(actor, id, input, { photo_path: photo });
    redirect(`/dashboard/listings/${id}?updated=1`);
  });

export const submitDraftAction: A = async (_p, fd) =>
  runAction(async () => {
    const outcome = listings.submitDraft(await getActor(), str(fd, "id"));
    return outcome.result === "fail" ? { ok: false, error: `Safety screening failed: ${outcome.failures.join(" ")}` } : "Submitted for coordinator review.";
  });

export const cancelListingAction: A = async (_p, fd) =>
  runAction(async () => {
    listings.cancelListing(await getActor(), str(fd, "id"), str(fd, "reason"));
    return "Donation cancelled. Anyone involved has been notified in-app.";
  });

export const reviewListingAction: A = async (_p, fd) =>
  runAction(async () => {
    const decision = str(fd, "decision") === "approve" ? "approve" : "reject";
    const res = listings.reviewListing(await getActor(), str(fd, "id"), decision, str(fd, "notes"), bool(fd, "checklist"));
    if (decision === "reject") return "Listing rejected. The donor has been notified.";
    return res && res.eligibleCount === 0
      ? { ok: true, message: "Approved — but NO verified recipient can currently receive this donation safely. Coordinators and the donor have been alerted." }
      : `Approved and published. ${res?.eligibleCount ?? 0} eligible organisation(s) alerted in-app.`;
  });

export const rejectUnsafeAction: A = async (_p, fd) =>
  runAction(async () => {
    listings.rejectUnsafe(await getActor(), str(fd, "id"), str(fd, "reason"));
    return "Donation blocked and rejected for safety.";
  });

export const urgentRescueAction: A = async (_p, fd) =>
  runAction(async () => {
    const actor = requireActor(await getActor());
    rateLimit(`urgent:${actor.id}`, 10, 60_000);
    const input = parseForm(urgentRescueSchema, fd);
    let eventId = input.event_id;
    if (!eventId) {
      const ev = events.createEvent(actor, {
        name: input.event_name, event_type: (str(fd, "event_type") || "other") as never, event_date: new Date(Date.now() + 5.5 * 36e5).toISOString().slice(0, 10),
        venue_name: input.event_name, venue_address: input.pickup_address, city: input.city, lat: input.lat, lng: input.lng,
        organizer_name: input.contact_name, organizer_phone: input.contact_phone, food_type: input.food_type,
        containers_available: false, transport_available: false, consent_contact: true,
      } as never, true);
      eventId = ev.id;
    }
    const now = Date.now();
    const { listing, screening } = listings.createListing(actor, {
      source: "event_surplus", event_id: eventId, is_urgent: true, title: input.title, category: "event_surplus", description: input.description,
      quantity: input.quantity_kg, unit: "kg", quantity_kg: input.quantity_kg, prepared_at: input.prepared_at, storage_condition: input.storage_condition,
      storage_temp_c: input.storage_temp_c, packaging_condition: input.packaging_condition, allergens: input.allergens, food_type: input.food_type,
      not_served_confirmed: input.not_served_confirmed, hygiene_confirmed: input.hygiene_confirmed, pickup_address: input.pickup_address, city: input.city,
      lat: input.lat, lng: input.lng, pickup_window_start: new Date(now + 5 * 6e4).toISOString(), pickup_window_end: input.collection_deadline,
      collection_deadline: input.collection_deadline, contact_name: input.contact_name, contact_phone: input.contact_phone, instructions: input.instructions,
      safety_concerns: input.safety_concerns, save_as_draft: false,
    });
    if (listing.status === "rejected") return { ok: false, error: `This food cannot be redistributed safely: ${screening?.failures.join(" ")}`, data: { listingId: listing.id } };
    const eligible = listings.matchesForListing(listing).filter((m) => m.eligible).length;
    return {
      ok: true,
      message: eligible
        ? `Urgent rescue logged and coordinators alerted. ${eligible} verified organisation(s) could potentially receive this food once a coordinator completes the safety review.`
        : "Urgent rescue logged and coordinators alerted — but no verified recipient currently has the capacity, location or storage to receive this food safely. This food has NOT been rescued yet; a coordinator will contact you.",
      data: { listingId: listing.id, eligible },
    };
  });

// ---------------------------------------------------------------- events

export const createEventAction: A = async (_p, fd) =>
  runAction(async () => {
    const input = parseForm(eventSchema, fd);
    const ev = events.createEvent(await getActor(), input, str(fd, "intent") !== "save");
    redirect(`/dashboard/events/${ev.id}?created=1`);
  });

export const updateEventAction: A = async (_p, fd) =>
  runAction(async () => {
    const id = str(fd, "id");
    events.updateEvent(await getActor(), id, parseForm(eventSchema, fd));
    redirect(`/dashboard/events/${id}?updated=1`);
  });

export const submitEventAction: A = async (_p, fd) =>
  runAction(async () => {
    events.submitEvent(await getActor(), str(fd, "id"));
    return "Event submitted. A coordinator will confirm the collection plan.";
  });

export const confirmEventAction: A = async (_p, fd) =>
  runAction(async () => {
    events.confirmEvent(await getActor(), str(fd, "id"), str(fd, "note"));
    return "Event confirmed. The organiser has been notified.";
  });

export const cancelEventAction: A = async (_p, fd) =>
  runAction(async () => {
    events.cancelEvent(await getActor(), str(fd, "id"), str(fd, "reason"));
    return "Event cancelled.";
  });

export const closeEventAction: A = async (_p, fd) =>
  runAction(async () => {
    events.closeEventNoSurplus(await getActor(), str(fd, "id"));
    return "Event closed.";
  });

export const partnerApplyAction: A = async (_p, fd) =>
  runAction(async () => {
    rateLimit(`partner:${await clientKey()}`, 5, 60_000);
    events.createPartnerApplication(await getActor(), parseForm(partnerSchema, fd));
    return "Thank you! Your partnership interest has been recorded. A coordinator will contact you — no partnership exists until an agreement is signed.";
  });

export const reviewPartnerAction: A = async (_p, fd) =>
  runAction(async () => {
    events.reviewPartner(await getActor(), str(fd, "id"), str(fd, "status") as never, str(fd, "note"));
    return "Application updated.";
  });

// -------------------------------------------------------------- requests

export const requestFoodAction: A = async (_p, fd) =>
  runAction(async () => {
    const actor = await getActor();
    rateLimit(`request:${actor?.id}`, 30, 60_000);
    logistics.createRequest(actor, parseForm(requestSchema, fd));
    return "Request sent to the donor. You'll be notified when they respond.";
  });

export const withdrawRequestAction: A = async (_p, fd) =>
  runAction(async () => {
    logistics.withdrawRequest(await getActor(), str(fd, "id"));
    return "Request withdrawn.";
  });

export const decideRequestAction: A = async (_p, fd) =>
  runAction(async () => {
    const decision = str(fd, "decision") === "accept" ? "accept" : "reject";
    logistics.decideRequest(await getActor(), str(fd, "id"), decision, str(fd, "reason") || undefined);
    return decision === "accept" ? "Request accepted. A collection has been created." : "Request declined.";
  });

// ----------------------------------------------------------- collections

const dt = (fd: FormData, k: string) => (str(fd, k) ? istToIso(str(fd, k)) : undefined);

export const claimTaskAction: A = async (_p, fd) =>
  runAction(async () => {
    logistics.claimCollection(await getActor(), str(fd, "id"), dt(fd, "eta"));
    return "Task accepted. Pickup details are now visible in My Assignments.";
  });

export const assignVolunteerAction: A = async (_p, fd) =>
  runAction(async () => {
    logistics.assignVolunteer(await getActor(), str(fd, "id"), str(fd, "volunteer_id"), dt(fd, "eta"), str(fd, "transport_partner") || undefined);
    return "Volunteer assigned and notified.";
  });

export const schedulePickupAction: A = async (_p, fd) =>
  runAction(async () => {
    const when = dt(fd, "when");
    if (!when) throw invalid("Choose a pickup time.");
    logistics.schedulePickup(await getActor(), str(fd, "id"), when);
    return "Pickup scheduled.";
  });

export const releaseTaskAction: A = async (_p, fd) =>
  runAction(async () => {
    logistics.releaseCollection(await getActor(), str(fd, "id"), str(fd, "reason"));
    return "Task released back to the pool.";
  });

export const recordPickupAction: A = async (_p, fd) =>
  runAction(async () => {
    const checks = Object.fromEntries(PICKUP_CHECKS.map((c) => [c.key, bool(fd, `check_${c.key}`)]));
    const res = logistics.recordPickup(await getActor(), str(fd, "id"), num(fd, "qty"), checks, str(fd, "notes") || undefined);
    return res.rejected ? { ok: false, error: "Pickup safety check failed — the food has been blocked from distribution and an incident was created." } : "Pickup recorded. Food is in transit.";
  });

export const recordHandoverAction: A = async (_p, fd) =>
  runAction(async () => {
    const minutes = num(fd, "minutes");
    logistics.recordHandover(await getActor(), str(fd, "id"), num(fd, "qty"), Number.isFinite(minutes) ? minutes : undefined, str(fd, "notes") || undefined);
    return "Handover recorded. The recipient will confirm the quantity received.";
  });

export const confirmDeliveryAction: A = async (_p, fd) =>
  runAction(async () => {
    const ok = str(fd, "condition") !== "refused";
    logistics.confirmDelivery(await getActor(), str(fd, "listing_id"), num(fd, "qty"), ok, str(fd, "notes") || undefined);
    return ok ? "Delivery confirmed — thank you! Impact figures have been updated." : "Food refused and recorded. A safety incident has been created.";
  });

export const failCollectionAction: A = async (_p, fd) =>
  runAction(async () => {
    logistics.failCollection(await getActor(), str(fd, "id"), str(fd, "reason"));
    return "Recorded as a missed pickup. Coordinators have been alerted.";
  });

export const rearrangeAction: A = async (_p, fd) =>
  runAction(async () => {
    logistics.rearrangeCollection(await getActor(), str(fd, "listing_id"), (str(fd, "mode") || "volunteer") as never);
    return "A new collection has been opened.";
  });

export const closeRequestAction: A = async (_p, fd) =>
  runAction(async () => {
    logistics.closeAcceptedRequest(await getActor(), str(fd, "listing_id"), str(fd, "reason"));
    return "Request closed; the donation is open to other organisations again.";
  });

// --------------------------------------------------------- organisations

export const saveRecipientOrgAction: A = async (_p, fd) =>
  runAction(async () => {
    orgs.saveRecipientOrg(await getActor(), parseForm(orgSchema, fd));
    return "Organisation profile saved.";
  });

export const saveDonorOrgAction: A = async (_p, fd) =>
  runAction(async () => {
    orgs.saveDonorOrg(await getActor(), parseForm(donorOrgSchema, fd));
    return "Business profile saved.";
  });

export const submitVerificationAction: A = async (_p, fd) =>
  runAction(async () => {
    const file = fd.get("document") as File | null;
    const docPath = await saveUpload(file, "documents");
    orgs.submitVerification(await getActor(), { registration_number: str(fd, "registration_number"), notes: str(fd, "notes"), document_path: docPath, document_name: docPath && file ? file.name.slice(0, 120) : null });
    return "Verification request submitted. An administrator will review it.";
  });

export const reviewVerificationAction: A = async (_p, fd) =>
  runAction(async () => {
    const decision = str(fd, "decision") === "verified" ? "verified" : "rejected";
    orgs.reviewVerification(await getActor(), str(fd, "id"), decision, str(fd, "reason"));
    return decision === "verified" ? "Organisation verified." : "Verification rejected.";
  });

export const suspendOrgAction: A = async (_p, fd) =>
  runAction(async () => {
    orgs.setOrgSuspension(await getActor(), str(fd, "id"), str(fd, "suspend") === "1", str(fd, "reason"));
    return "Organisation status updated.";
  });

export const createNeedAction: A = async (_p, fd) =>
  runAction(async () => {
    needs.createNeed(await getActor(), parseForm(needSchema, fd));
    return "Requirement published to donors.";
  });

export const closeNeedAction: A = async (_p, fd) =>
  runAction(async () => {
    needs.closeNeed(await getActor(), str(fd, "id"), str(fd, "status") === "fulfilled" ? "fulfilled" : "closed");
    return "Requirement updated.";
  });

export const saveVolunteerProfileAction: A = async (_p, fd) =>
  runAction(async () => {
    logistics.saveVolunteerProfile(await getActor(), parseForm(volunteerProfileSchema, fd));
    return "Volunteer profile saved.";
  });

// -------------------------------------------------------------- incidents

export const reportIncidentAction: A = async (_p, fd) =>
  runAction(async () => {
    const res = incidents.reportIncident(await getActor(), parseForm(incidentSchema, fd));
    return res.held ? "Incident reported. Distribution of this donation is ON HOLD until a coordinator reviews it." : "Incident reported. A coordinator will review it.";
  });

export const reviewIncidentAction: A = async (_p, fd) =>
  runAction(async () => {
    incidents.reviewIncident(await getActor(), str(fd, "id"), str(fd, "status") as never, str(fd, "resolution"), (str(fd, "listing_action") || "none") as never);
    return "Incident updated.";
  });

// ---------------------------------------------------------- notifications

export async function markReadAction(fd: FormData) {
  const actor = requireActor(await getActor());
  markRead(actor.id, str(fd, "id") || undefined);
  revalidatePath("/", "layout");
  const link = str(fd, "link");
  if (link) redirect(safeNext(link));
}

// ------------------------------------------------------------------ money

export const donateAction: A = async (_p, fd) =>
  runAction(async () => {
    rateLimit(`donate:${await clientKey()}`, 10, 60_000);
    const raw = Object.fromEntries([...fd.entries()].filter(([, v]) => typeof v === "string"));
    if (raw.amount_choice && raw.amount_choice !== "custom") raw.amount_inr = raw.amount_choice;
    const input = parseForm(moneySchema, raw);
    const { donation, token } = await payments.createDonation(await getActor(), input);
    redirect(`/donate-money/checkout/${donation.id}?t=${token}`);
  });

export const simulatePaymentAction: A = async (_p, fd) =>
  runAction(async () => {
    const id = str(fd, "id");
    const token = str(fd, "t");
    const outcome = str(fd, "outcome") as "success" | "failure" | "cancel";
    payments.completeSimulated(await getActor(), id, token, outcome);
    redirect(`/donate-money/receipt/${id}?t=${token}`);
  });

export const refundAction: A = async (_p, fd) =>
  runAction(async () => {
    await payments.refundDonation(await getActor(), str(fd, "id"), str(fd, "reason"));
    return "Refund recorded.";
  });

export const disburseAction: A = async (_p, fd) =>
  runAction(async () => {
    payments.recordDisbursement(await getActor(), str(fd, "program_id"), num(fd, "amount"), str(fd, "description"));
    return "Disbursement recorded.";
  });

// ------------------------------------------------------------------ admin

export const setUserStatusAction: A = async (_p, fd) =>
  runAction(async () => {
    users.setUserStatus(await getActor(), str(fd, "id"), str(fd, "status") === "suspended" ? "suspended" : "active", str(fd, "reason"));
    return "User status updated.";
  });

export const createAdminAction: A = async (_p, fd) =>
  runAction(async () => {
    users.createAdminByAdmin(await getActor(), { name: str(fd, "name"), email: str(fd, "email"), password: str(fd, "password") }, str(fd, "reason"));
    return "Administrator created.";
  });

export const saveSettingsAction: A = async (_p, fd) =>
  runAction(async () => {
    const actor = requireActor(await getActor());
    if (actor.role !== "admin") throw forbidden();
    const rules = {
      ambientMaxHours: num(fd, "ambientMaxHours"),
      hotHeldMinTempC: num(fd, "hotHeldMinTempC"),
      hotHeldMaxHours: num(fd, "hotHeldMaxHours"),
      coldMaxTempC: num(fd, "coldMaxTempC"),
      refrigeratedMaxHours: num(fd, "refrigeratedMaxHours"),
    };
    if (Object.values(rules).some((v) => !Number.isFinite(v))) throw invalid("All safety thresholds must be numbers.");
    if (rules.ambientMaxHours > 4 || rules.hotHeldMinTempC < 60 || rules.coldMaxTempC > 8) throw invalid("These values are less strict than FoodLoop allows (ambient ≤ 4 h, hot ≥ 60°C, cold ≤ 8°C).");
    const kgPerMeal = num(fd, "kg_per_meal");
    if (!(kgPerMeal > 0.1 && kgPerMeal < 2)) throw invalid("kg per meal must be between 0.1 and 2.");
    setSetting("safety_rules", JSON.stringify(rules));
    setSetting("kg_per_meal", String(kgPerMeal));
    const { audit } = await import("../services/audit");
    audit(actor.id, "settings.update", "settings", null, str(fd, "reason") || null, { rules, kgPerMeal });
    return "Settings saved.";
  });

export const resetDemoAction: A = async () =>
  runAction(async () => {
    if (!isDemoMode()) throw forbidden("Demo reset is disabled when DEMO_MODE=false.");
    rateLimit("demo-reset", 3, 60_000);
    const { seedDemo } = await import("../seed");
    await seedDemo();
    await clearSessionCookie();
    return "Demo data reset. All demo records are fictional and labelled DEMO.";
  });
