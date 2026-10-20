// Client-safe domain constants and labels. No server imports here.

export const ROLES = ["donor", "ngo", "volunteer", "supporter", "admin"] as const;
export type Role = (typeof ROLES)[number];
/** Roles a member of the public may choose at registration. Admin is never self-assignable. */
export const PUBLIC_ROLES = ["donor", "ngo", "volunteer", "supporter"] as const;

export const ROLE_LABELS: Record<Role, string> = {
  donor: "Food Donor",
  ngo: "NGO / Recipient Organisation",
  volunteer: "Volunteer",
  supporter: "Individual Supporter",
  admin: "Administrator",
};

export const FOOD_CATEGORIES = [
  "cooked_meals",
  "packaged_food",
  "bakery",
  "fruits",
  "vegetables",
  "groceries",
  "fresh_meals",
  "event_surplus",
  "other",
] as const;
export type FoodCategory = (typeof FOOD_CATEGORIES)[number];

export const CATEGORY_LABELS: Record<FoodCategory, string> = {
  cooked_meals: "Cooked Meals",
  packaged_food: "Packaged Food",
  bakery: "Bakery Products",
  fruits: "Fruits",
  vegetables: "Vegetables",
  groceries: "Groceries",
  fresh_meals: "Freshly Prepared Meals",
  event_surplus: "Wedding & Event Surplus",
  other: "Other",
};

/** Stock imagery (Unsplash, bundled locally) used when a donor has not uploaded a photo. */
export const CATEGORY_IMAGES: Record<string, string> = {
  cooked_meals: "/images/indian.jpg",
  fresh_meals: "/images/meal.jpg",
  event_surplus: "/images/buffet.jpg",
  bakery: "/images/bread.jpg",
  packaged_food: "/images/groceries.jpg",
  groceries: "/images/groceries.jpg",
  fruits: "/images/hero.jpg",
  vegetables: "/images/vegetables.jpg",
  other: "/images/meal.jpg",
};

/** Ready-to-eat categories that need time/temperature control. */
export const PERISHABLE_CATEGORIES: FoodCategory[] = ["cooked_meals", "fresh_meals", "event_surplus"];
/** Shelf-stable categories that must carry an expiry / best-before date. */
export const DATED_CATEGORIES: FoodCategory[] = ["packaged_food", "groceries"];

export const SOURCES = ["everyday_surplus", "fresh_donation", "event_surplus"] as const;
export type Source = (typeof SOURCES)[number];
export const SOURCE_LABELS: Record<Source, string> = {
  everyday_surplus: "Everyday Surplus",
  fresh_donation: "Planned Fresh Donation",
  event_surplus: "Registered Event",
};

export const UNITS = ["kg", "portions", "packets", "litres", "trays", "boxes", "items"] as const;

export const STORAGE_CONDITIONS = ["hot_held", "refrigerated", "frozen", "ambient_covered", "exposed_unknown"] as const;
export type StorageCondition = (typeof STORAGE_CONDITIONS)[number];
export const STORAGE_LABELS: Record<StorageCondition, string> = {
  hot_held: "Hot-held (kept at 60°C or above)",
  refrigerated: "Refrigerated (5°C or below)",
  frozen: "Frozen (-18°C or below)",
  ambient_covered: "Room temperature, covered",
  exposed_unknown: "Left uncovered / conditions unknown",
};

export const PACKAGING_CONDITIONS = ["sealed_intact", "covered_food_grade", "open_uncovered", "damaged"] as const;
export type PackagingCondition = (typeof PACKAGING_CONDITIONS)[number];
export const PACKAGING_LABELS: Record<PackagingCondition, string> = {
  sealed_intact: "Sealed and intact",
  covered_food_grade: "Covered, food-grade containers",
  open_uncovered: "Open / uncovered",
  damaged: "Damaged or leaking packaging",
};

export const FOOD_TYPES = ["veg", "non_veg", "mixed"] as const;
export type FoodType = (typeof FOOD_TYPES)[number];
export const FOOD_TYPE_LABELS: Record<FoodType, string> = {
  veg: "Vegetarian",
  non_veg: "Non-vegetarian",
  mixed: "Mixed",
};

export const LISTING_STATUSES = [
  "draft",
  "pending_review",
  "available",
  "request_received",
  "accepted",
  "pickup_scheduled",
  "collected",
  "delivered",
  "rejected",
  "cancelled",
  "expired",
] as const;
export type ListingStatus = (typeof LISTING_STATUSES)[number];

export const LISTING_STATUS_LABELS: Record<ListingStatus, string> = {
  draft: "Draft",
  pending_review: "Pending Review",
  available: "Available",
  request_received: "Request Received",
  accepted: "Accepted",
  pickup_scheduled: "Pickup Scheduled",
  collected: "Collected",
  delivered: "Delivered",
  rejected: "Rejected",
  cancelled: "Cancelled",
  expired: "Expired",
};

export const EVENT_TYPES = [
  "wedding",
  "marriage_ceremony",
  "reception",
  "engagement",
  "birthday",
  "anniversary",
  "religious",
  "festival",
  "community",
  "corporate",
  "college_fest",
  "conference",
  "family_function",
  "other",
] as const;
export type EventType = (typeof EVENT_TYPES)[number];
export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  wedding: "Wedding",
  marriage_ceremony: "Marriage Ceremony",
  reception: "Wedding Reception",
  engagement: "Engagement Ceremony",
  birthday: "Birthday Party",
  anniversary: "Anniversary Celebration",
  religious: "Religious Gathering",
  festival: "Festival",
  community: "Community Celebration",
  corporate: "Corporate Event",
  college_fest: "College Festival",
  conference: "Conference",
  family_function: "Large Family Function",
  other: "Other Gathering",
};

export const EVENT_STATUSES = [
  "registered",
  "awaiting_confirmation",
  "awaiting_food",
  "ready_for_collection",
  "collection_arranged",
  "completed",
  "cancelled",
] as const;
export type EventStatus = (typeof EVENT_STATUSES)[number];
export const EVENT_STATUS_LABELS: Record<EventStatus, string> = {
  registered: "Registered",
  awaiting_confirmation: "Awaiting Confirmation",
  awaiting_food: "Awaiting Food Availability",
  ready_for_collection: "Ready for Collection",
  collection_arranged: "Collection Arranged",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const REQUEST_STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  accepted: "Accepted",
  rejected: "Declined",
  withdrawn: "Withdrawn",
  cancelled: "Cancelled",
  completed: "Completed",
};

export const COLLECTION_STATUS_LABELS: Record<string, string> = {
  available: "Available",
  assigned: "Assigned",
  in_transit: "In Transit",
  completed: "Completed",
  cancelled: "Cancelled",
  failed: "Failed / Missed",
};

export const TRANSPORT_MODE_LABELS: Record<string, string> = {
  volunteer: "FoodLoop volunteer",
  recipient: "Recipient collects",
  donor: "Donor delivers",
};

export const ORG_STATUS_LABELS: Record<string, string> = {
  pending: "Pending Verification",
  verified: "Verified",
  rejected: "Rejected",
  suspended: "Suspended",
};

export const RECIPIENT_ORG_TYPES = [
  "NGO",
  "Shelter",
  "Community Kitchen",
  "Orphanage / Children's Home",
  "Old-age Home",
  "Food Bank",
  "Religious / Charitable Trust",
  "Other",
];

export const DONOR_ORG_TYPES = [
  "Restaurant",
  "Hotel",
  "Cafe",
  "Bakery",
  "Supermarket",
  "Caterer",
  "College Canteen",
  "Corporate",
  "Event Organiser",
  "Banquet / Marriage Hall",
  "Individual",
  "Other",
];

export const PARTNER_TYPES = [
  "Wedding Planner",
  "Caterer",
  "Marriage Hall",
  "Banquet Hall",
  "Hotel",
  "Event Management Company",
  "Other",
];

export const INCIDENT_KINDS: Record<string, string> = {
  food_safety: "Food safety concern",
  missed_pickup: "Missed pickup",
  delay: "Delay",
  delivery_problem: "Delivery problem",
  complaint: "Complaint",
  other: "Other",
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  created: "Created",
  pending: "Pending",
  succeeded: "Successful",
  failed: "Failed",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

export const SUGGESTED_AMOUNTS_INR = [250, 500, 1000, 2500, 5000];

/** Tone used by StatusBadge for any status string in the system. */
export function statusTone(status: string): "green" | "amber" | "red" | "blue" | "gray" | "violet" {
  switch (status) {
    case "available":
    case "verified":
    case "delivered":
    case "completed":
    case "succeeded":
    case "accepted":
    case "resolved":
    case "approved":
    case "agreement_signed":
    case "ready_for_collection":
    case "pass":
      return "green";
    case "pending_review":
    case "pending":
    case "request_received":
    case "awaiting_confirmation":
    case "awaiting_food":
    case "investigating":
    case "needs_review":
    case "under_review":
    case "created":
    case "open":
      return "amber";
    case "rejected":
    case "failed":
    case "suspended":
    case "expired":
    case "fail":
    case "declined":
      return "red";
    case "pickup_scheduled":
    case "collected":
    case "assigned":
    case "in_transit":
    case "collection_arranged":
    case "registered":
      return "blue";
    case "refunded":
      return "violet";
    default:
      return "gray";
  }
}

export function humanize(s: string | null | undefined) {
  if (!s) return "—";
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function statusLabel(status: string) {
  return (
    (LISTING_STATUS_LABELS as Record<string, string>)[status] ??
    (EVENT_STATUS_LABELS as Record<string, string>)[status] ??
    COLLECTION_STATUS_LABELS[status] ??
    REQUEST_STATUS_LABELS[status] ??
    PAYMENT_STATUS_LABELS[status] ??
    ORG_STATUS_LABELS[status] ??
    humanize(status)
  );
}
