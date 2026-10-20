import { beforeEach, describe, expect, it } from "vitest";
import { actor, freshDb, hours, listingInput } from "./helpers";
import { all, get, run } from "@/lib/db";
import { createListing, expireStale, getListing, reviewListing, cancelListing, rejectUnsafe } from "@/lib/services/listings";
import { claimCollection, confirmDelivery, createRequest, decideRequest, failCollection, rearrangeCollection, recordHandover, recordPickup, assignVolunteer } from "@/lib/services/logistics";
import { computeImpact } from "@/lib/services/impact";
import { cancelEvent, createEvent, confirmEvent, getEvent } from "@/lib/services/events";
import { reportIncident, reviewIncident } from "@/lib/services/incidents";
import type { EventInput } from "@/lib/validation";

const ALL_OK = { covered: true, temperature: true, no_spoilage: true, clean_vehicle: true };

beforeEach(async () => {
  await freshDb();
});

function approvedListing(over = {}) {
  const admin = actor("admin@foodloop.demo");
  const { listing } = createListing(actor("restaurant@foodloop.demo"), listingInput(over));
  expect(listing.status).toBe("pending_review");
  reviewListing(admin, listing.id, "approve", "ok", true);
  return getListing(listing.id)!;
}

describe("Scenario A — restaurant surplus to NGO", () => {
  it("runs the full lifecycle and updates impact exactly once", () => {
    const before = computeImpact({ includeDemo: true });
    const l = approvedListing();
    expect(l.status).toBe("available");
    const ngo = actor("ngo@foodloop.demo");
    const reqId = createRequest(ngo, { listing_id: l.id, transport_mode: "volunteer" });
    expect(getListing(l.id)!.status).toBe("request_received");
    const colId = decideRequest(actor("restaurant@foodloop.demo"), reqId, "accept")!;
    expect(getListing(l.id)!.status).toBe("accepted");
    claimCollection(actor("volunteer@foodloop.demo"), colId, hours(1));
    expect(getListing(l.id)!.status).toBe("pickup_scheduled");
    recordPickup(actor("volunteer@foodloop.demo"), colId, 20, ALL_OK);
    expect(getListing(l.id)!.status).toBe("collected");
    recordHandover(actor("volunteer@foodloop.demo"), colId, 20, 45);
    confirmDelivery(ngo, l.id, 19.5, true);
    expect(getListing(l.id)!.status).toBe("delivered");
    const after = computeImpact({ includeDemo: true });
    expect(after.delivered.kg - before.delivered.kg).toBeCloseTo(19.5);
    expect(after.delivered.n - before.delivered.n).toBe(1);
    expect(after.collected.kg - before.collected.kg).toBeCloseTo(20);
    // a second confirmation must not double count
    expect(() => confirmDelivery(ngo, l.id, 19.5, true)).toThrow();
    expect(computeImpact({ includeDemo: true }).delivered.kg).toBeCloseTo(after.delivered.kg);
  });

  it("never publishes food automatically — admin review is required", () => {
    const { listing } = createListing(actor("restaurant@foodloop.demo"), listingInput());
    expect(listing.status).toBe("pending_review");
    expect(() => createRequest(actor("ngo@foodloop.demo"), { listing_id: listing.id, transport_mode: "volunteer" })).toThrow(/no longer open/);
  });

  it("rejects invalid listings at validation and screening", () => {
    const r = createListing(actor("restaurant@foodloop.demo"), listingInput({ storage_condition: "ambient_covered", storage_temp_c: undefined, prepared_at: hours(-4) }));
    expect(r.listing.status).toBe("rejected");
    const r2 = createListing(actor("restaurant@foodloop.demo"), listingInput({ not_served_confirmed: false }));
    expect(r2.listing.status).toBe("rejected");
    const r3 = createListing(actor("restaurant@foodloop.demo"), listingInput({ category: "packaged_food", storage_condition: "ambient_covered", expiry_at: undefined }));
    expect(r3.listing.status).toBe("rejected");
  });
});

describe("Authorization", () => {
  it("blocks NGOs from approving listings and pending NGOs from requesting", () => {
    const { listing } = createListing(actor("restaurant@foodloop.demo"), listingInput());
    expect(() => reviewListing(actor("ngo@foodloop.demo"), listing.id, "approve", "x", true)).toThrow(/permission/);
    reviewListing(actor("admin@foodloop.demo"), listing.id, "approve", "ok", true);
    expect(() => createRequest(actor("newngo@foodloop.demo"), { listing_id: listing.id, transport_mode: "volunteer" })).toThrow(/verified/);
  });

  it("donors cannot decide requests for someone else's food", () => {
    const l = approvedListing();
    const req = createRequest(actor("ngo@foodloop.demo"), { listing_id: l.id, transport_mode: "volunteer" });
    expect(() => decideRequest(actor("bakery@foodloop.demo"), req, "accept")).toThrow(/donor or a coordinator/);
  });

  it("donors cannot cancel others' listings and completed donations cannot be changed", () => {
    const l = approvedListing();
    expect(() => cancelListing(actor("bakery@foodloop.demo"), l.id, "nope")).toThrow();
    const delivered = get<{ id: string }>("SELECT id FROM food_listings WHERE status = 'delivered' LIMIT 1")!;
    expect(() => cancelListing(actor("restaurant@foodloop.demo"), delivered.id, "change")).toThrow();
  });

  it("prevents duplicate volunteer assignment", () => {
    const l = approvedListing();
    const req = createRequest(actor("ngo@foodloop.demo"), { listing_id: l.id, transport_mode: "volunteer" });
    const col = decideRequest(actor("restaurant@foodloop.demo"), req, "accept")!;
    claimCollection(actor("volunteer@foodloop.demo"), col);
    expect(() => claimCollection(actor("volunteer2@foodloop.demo"), col)).toThrow(/already been taken/);
  });
});

describe("Matching and capacity", () => {
  it("blocks requests that exceed recipient capacity or diet", () => {
    const big = approvedListing({ quantity: 90, quantity_kg: 90, pickup_address: "Koramangala", lat: 12.9352, lng: 77.6245 });
    expect(() => createRequest(actor("shelter@foodloop.demo"), { listing_id: big.id, transport_mode: "volunteer" })).toThrow(/capacity/i);
    const nonVeg = approvedListing({ food_type: "non_veg", lat: 12.9352, lng: 77.6245 });
    expect(() => createRequest(actor("shelter@foodloop.demo"), { listing_id: nonVeg.id, transport_mode: "volunteer" })).toThrow(/vegetarian/);
  });

  it("reports when no eligible recipient exists instead of pretending", () => {
    const admin = actor("admin@foodloop.demo");
    const { listing } = createListing(actor("restaurant@foodloop.demo"), listingInput({ quantity_kg: 900, quantity: 900, lat: 13.2, lng: 77.9 }));
    const res = reviewListing(admin, listing.id, "approve", "ok", true)!;
    expect(res.eligibleCount).toBe(0);
    const n = get<{ n: number }>("SELECT COUNT(*) AS n FROM notifications WHERE type = 'listing.no_match'")!.n;
    expect(n).toBeGreaterThan(0);
  });
});

describe("Food safety enforcement", () => {
  it("failed pickup checks reject the food and create an incident", () => {
    const l = approvedListing();
    const req = createRequest(actor("ngo@foodloop.demo"), { listing_id: l.id, transport_mode: "volunteer" });
    const col = decideRequest(actor("restaurant@foodloop.demo"), req, "accept")!;
    claimCollection(actor("volunteer@foodloop.demo"), col);
    const res = recordPickup(actor("volunteer@foodloop.demo"), col, 20, { ...ALL_OK, temperature: false });
    expect(res.rejected).toBe(true);
    expect(getListing(l.id)!.status).toBe("rejected");
    expect(get("SELECT 1 FROM incidents WHERE listing_id = ? AND kind = 'food_safety'", l.id)).toBeTruthy();
    expect(() => confirmDelivery(actor("ngo@foodloop.demo"), l.id, 10, true)).toThrow();
  });

  it("recipient refusal on arrival rejects and is not counted as delivered", () => {
    const before = computeImpact({ includeDemo: true }).delivered.kg;
    const l = approvedListing();
    const req = createRequest(actor("ngo@foodloop.demo"), { listing_id: l.id, transport_mode: "recipient" });
    const col = decideRequest(actor("restaurant@foodloop.demo"), req, "accept")!;
    recordPickup(actor("ngo@foodloop.demo"), col, 20, ALL_OK);
    confirmDelivery(actor("ngo@foodloop.demo"), l.id, 0, false, "Smelled sour");
    expect(getListing(l.id)!.status).toBe("rejected");
    expect(computeImpact({ includeDemo: true }).delivered.kg).toBeCloseTo(before);
  });

  it("high-severity safety reports place a hold that blocks distribution", () => {
    const l = approvedListing();
    const { held, id } = reportIncident(actor("restaurant@foodloop.demo"), { listing_id: l.id, kind: "food_safety", severity: "high", description: "Possible contamination of one tray" });
    expect(held).toBe(true);
    expect(() => createRequest(actor("ngo@foodloop.demo"), { listing_id: l.id, transport_mode: "volunteer" })).toThrow();
    reviewIncident(actor("admin@foodloop.demo"), id, "resolved", "Tray removed, rest inspected", "release_hold");
    expect(createRequest(actor("ngo@foodloop.demo"), { listing_id: l.id, transport_mode: "volunteer" })).toBeTruthy();
  });

  it("admins can block unsafe food before delivery", () => {
    const l = approvedListing();
    rejectUnsafe(actor("admin@foodloop.demo"), l.id, "Temperature log missing on inspection");
    expect(getListing(l.id)!.status).toBe("rejected");
  });

  it("expired listings cannot be accepted", () => {
    const l = approvedListing();
    const req = createRequest(actor("ngo@foodloop.demo"), { listing_id: l.id, transport_mode: "volunteer" });
    run("UPDATE food_listings SET collection_deadline = ? WHERE id = ?", hours(-0.1), l.id);
    expect(() => decideRequest(actor("restaurant@foodloop.demo"), req, "accept")).toThrow();
    expireStale();
    expect(getListing(l.id)!.status).toBe("expired");
  });
});

describe("Missed pickups", () => {
  it("marks failure, then a coordinator re-arranges collection", () => {
    const l = approvedListing();
    const req = createRequest(actor("ngo@foodloop.demo"), { listing_id: l.id, transport_mode: "volunteer" });
    const col = decideRequest(actor("restaurant@foodloop.demo"), req, "accept")!;
    claimCollection(actor("volunteer@foodloop.demo"), col);
    failCollection(actor("volunteer@foodloop.demo"), col, "Vehicle broke down");
    expect(getListing(l.id)!.status).toBe("accepted");
    const col2 = rearrangeCollection(actor("admin@foodloop.demo"), l.id);
    assignVolunteer(actor("admin@foodloop.demo"), col2, actor("volunteer2@foodloop.demo").id);
    expect(getListing(l.id)!.status).toBe("pickup_scheduled");
  });
});

describe("Scenario B — wedding event rescue", () => {
  const ev = (): EventInput =>
    ({
      name: "Test Wedding",
      event_type: "wedding",
      event_date: new Date().toISOString().slice(0, 10),
      venue_name: "Hall",
      venue_address: "Jayanagar 4th Block",
      city: "Bengaluru",
      lat: 12.925,
      lng: 77.5938,
      organizer_name: "Meera",
      organizer_phone: "+91 90000 30001",
      food_type: "veg",
      containers_available: true,
      transport_available: false,
      consent_contact: true,
    }) as EventInput;

  it("registration is not food; leftover donation flows to delivery and updates event impact", () => {
    const organiser = actor("wedding@foodloop.demo");
    const before = computeImpact({ includeDemo: true });
    const e = createEvent(organiser, { ...ev(), estimated_surplus_kg: 100 }, true);
    expect(e.status).toBe("awaiting_confirmation");
    expect(computeImpact({ includeDemo: true }).offered.kg).toBe(before.offered.kg); // estimates never count
    confirmEvent(actor("admin@foodloop.demo"), e.id, "ok");
    const { listing } = createListing(organiser, listingInput({ source: "event_surplus", event_id: e.id, category: "event_surplus", quantity_kg: 40, quantity: 40, lat: 12.925, lng: 77.5938 }));
    expect(listing.event_id).toBe(e.id);
    reviewListing(actor("admin@foodloop.demo"), listing.id, "approve", "ok", true);
    expect(getEvent(e.id)!.status).toBe("ready_for_collection");
    const req = createRequest(actor("ngo@foodloop.demo"), { listing_id: listing.id, transport_mode: "volunteer" });
    const col = decideRequest(organiser, req, "accept")!;
    assignVolunteer(actor("admin@foodloop.demo"), col, actor("volunteer@foodloop.demo").id);
    expect(getEvent(e.id)!.status).toBe("collection_arranged");
    recordPickup(actor("volunteer@foodloop.demo"), col, 40, ALL_OK);
    recordHandover(actor("volunteer@foodloop.demo"), col, 40, 60);
    confirmDelivery(actor("ngo@foodloop.demo"), listing.id, 38, true);
    expect(getEvent(e.id)!.status).toBe("completed");
    const after = computeImpact({ includeDemo: true });
    expect(after.eventDeliveredKg - before.eventDeliveredKg).toBeCloseTo(38);
    expect(after.events.completedCollections - before.events.completedCollections).toBe(1);
  });

  it("organisers cannot attach food to someone else's event", () => {
    const e = createEvent(actor("wedding@foodloop.demo"), ev(), true);
    expect(() => createListing(actor("bakery@foodloop.demo"), listingInput({ source: "event_surplus", event_id: e.id }))).toThrow(/events you registered/);
  });

  it("cancelling an event cancels its open donations", () => {
    const organiser = actor("wedding@foodloop.demo");
    const e = createEvent(organiser, ev(), true);
    const { listing } = createListing(organiser, listingInput({ source: "event_surplus", event_id: e.id, category: "event_surplus" }));
    reviewListing(actor("admin@foodloop.demo"), listing.id, "approve", "ok", true);
    cancelEvent(organiser, e.id, "Function postponed");
    expect(getEvent(e.id)!.status).toBe("cancelled");
    expect(getListing(listing.id)!.status).toBe("cancelled");
    expect(() => createListing(organiser, listingInput({ source: "event_surplus", event_id: e.id }))).toThrow(/cancelled/);
    const open = all("SELECT 1 FROM food_listings WHERE event_id = ? AND status IN ('available','request_received')", e.id);
    expect(open.length).toBe(0);
  });
});
