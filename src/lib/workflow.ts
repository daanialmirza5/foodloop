import type { EventStatus, ListingStatus } from "./constants";
import { invalid } from "./errors";

/** Allowed food-listing transitions. Enforced by every service that changes status. */
export const LISTING_TRANSITIONS: Record<ListingStatus, ListingStatus[]> = {
  draft: ["pending_review", "rejected", "cancelled"],
  pending_review: ["available", "rejected", "cancelled", "expired"],
  available: ["request_received", "rejected", "cancelled", "expired"],
  request_received: ["available", "accepted", "rejected", "cancelled", "expired"],
  accepted: ["pickup_scheduled", "request_received", "available", "rejected", "cancelled", "expired"],
  pickup_scheduled: ["collected", "accepted", "rejected", "cancelled", "expired"],
  collected: ["delivered", "rejected"],
  delivered: [],
  rejected: [],
  cancelled: [],
  expired: [],
};

export function assertListingTransition(from: ListingStatus, to: ListingStatus) {
  if (!LISTING_TRANSITIONS[from]?.includes(to)) {
    throw invalid(`A donation cannot move from "${from.replace(/_/g, " ")}" to "${to.replace(/_/g, " ")}".`);
  }
}

/** Statuses in which food is still "open" and may expire when its deadline passes. */
export const EXPIRABLE: ListingStatus[] = ["pending_review", "available", "request_received", "accepted", "pickup_scheduled"];
/** Statuses where the donor may still edit or cancel. */
export const DONOR_EDITABLE: ListingStatus[] = ["draft", "pending_review", "available"];
export const DONOR_CANCELLABLE: ListingStatus[] = ["draft", "pending_review", "available", "request_received", "accepted", "pickup_scheduled"];

export const EVENT_TRANSITIONS: Record<EventStatus, EventStatus[]> = {
  registered: ["awaiting_confirmation", "cancelled"],
  awaiting_confirmation: ["awaiting_food", "cancelled"],
  awaiting_food: ["ready_for_collection", "completed", "cancelled"],
  ready_for_collection: ["collection_arranged", "awaiting_food", "completed", "cancelled"],
  collection_arranged: ["completed", "ready_for_collection", "awaiting_food"],
  completed: [],
  cancelled: [],
};

export function assertEventTransition(from: EventStatus, to: EventStatus) {
  if (!EVENT_TRANSITIONS[from]?.includes(to)) {
    throw invalid(`An event cannot move from "${from.replace(/_/g, " ")}" to "${to.replace(/_/g, " ")}".`);
  }
}

export const PAYMENT_TRANSITIONS: Record<string, string[]> = {
  created: ["pending", "succeeded", "failed", "cancelled"],
  pending: ["succeeded", "failed", "cancelled"],
  succeeded: ["refunded"],
  failed: [],
  cancelled: [],
  refunded: [],
};

export function canPaymentTransition(from: string, to: string) {
  return PAYMENT_TRANSITIONS[from]?.includes(to) ?? false;
}
