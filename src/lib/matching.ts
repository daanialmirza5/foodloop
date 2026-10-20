import { haversineKm } from "./utils";

export type MatchListing = {
  quantity_kg: number;
  food_type: string;
  storage_condition: string;
  collection_deadline: string;
  city: string | null;
  lat: number | null;
  lng: number | null;
};

export type MatchOrg = {
  id: string;
  name: string;
  city: string | null;
  lat: number | null;
  lng: number | null;
  service_radius_km: number;
  capacity_kg_per_day: number;
  food_preference: string;
  has_cold_storage: number;
  has_transport: number;
  verification_status: string;
};

export type MatchResult = {
  org: MatchOrg;
  eligible: boolean;
  score: number;
  distanceKm: number | null;
  travelMinutes: number | null;
  remainingCapacityKg: number;
  reasons: string[];   // why it fits
  blockers: string[];  // why it cannot safely receive this donation
};

const AVG_CITY_SPEED_KMH = 20;
const HANDLING_MINUTES = 20;

/**
 * Decide whether an organisation can SAFELY receive a listing. Proximity alone is
 * never enough: capacity, diet, storage and the delivery window must all fit.
 */
export function evaluateMatch(listing: MatchListing, org: MatchOrg, inflightKg: number, now = new Date()): MatchResult {
  const reasons: string[] = [];
  const blockers: string[] = [];
  let score = 50;

  if (org.verification_status !== "verified") blockers.push("Organisation is not verified.");

  let distanceKm: number | null = null;
  let travelMinutes: number | null = null;
  if (listing.lat != null && listing.lng != null && org.lat != null && org.lng != null) {
    distanceKm = haversineKm(listing.lat, listing.lng, org.lat, org.lng);
    travelMinutes = Math.round((distanceKm / AVG_CITY_SPEED_KMH) * 60 + HANDLING_MINUTES);
    if (distanceKm > org.service_radius_km) blockers.push(`Outside service area (${distanceKm.toFixed(1)} km away, serves ${org.service_radius_km} km).`);
    else {
      reasons.push(`${distanceKm.toFixed(1)} km away (~${travelMinutes} min).`);
      score += Math.max(0, 25 - distanceKm * 2);
    }
  } else if (listing.city && org.city && listing.city.trim().toLowerCase() === org.city.trim().toLowerCase()) {
    reasons.push(`Same city (${org.city}).`);
  } else {
    blockers.push("Location could not be matched to the organisation's service area.");
  }

  const minutesLeft = (new Date(listing.collection_deadline).getTime() - now.getTime()) / 6e4;
  if (travelMinutes != null && travelMinutes > minutesLeft) blockers.push(`Cannot reach before the collection deadline (needs ~${travelMinutes} min).`);

  const remaining = Math.max(0, org.capacity_kg_per_day - inflightKg);
  if (listing.quantity_kg > remaining) blockers.push(`Insufficient capacity: ${remaining.toFixed(0)} kg available today, donation is ${listing.quantity_kg} kg.`);
  else {
    reasons.push(`Capacity available (${remaining.toFixed(0)} kg free today).`);
    score += Math.min(10, (remaining - listing.quantity_kg) / 10);
  }

  if (org.food_preference === "veg_only" && listing.food_type !== "veg") blockers.push("Organisation accepts vegetarian food only.");
  else reasons.push("Dietary preference compatible.");

  if ((listing.storage_condition === "refrigerated" || listing.storage_condition === "frozen") && !org.has_cold_storage)
    blockers.push("Chilled/frozen food needs a recipient with cold storage.");
  else if (org.has_cold_storage) {
    reasons.push("Has cold storage.");
    score += 5;
  }

  if (org.has_transport) {
    reasons.push("Can collect with own transport.");
    score += 10;
  }

  return {
    org,
    eligible: blockers.length === 0,
    score: Math.round(blockers.length ? 0 : score),
    distanceKm,
    travelMinutes,
    remainingCapacityKg: remaining,
    reasons,
    blockers,
  };
}
