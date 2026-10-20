/**
 * FoodLoop relational schema (SQLite dialect, used for local + demo mode).
 * The equivalent PostgreSQL / Supabase schema with Row Level Security lives in
 * supabase/migrations/0001_foodloop.sql.
 *
 * Conventions: TEXT primary keys with type prefixes, ISO-8601 UTC timestamps,
 * quantities in kilograms stored as REAL, money stored as INTEGER paise.
 */
export const SCHEMA_VERSION = 1;

export const SCHEMA_SQL = /* sql */ `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS schema_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  city TEXT,
  role TEXT NOT NULL CHECK (role IN ('donor','ngo','volunteer','supporter','admin')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended')),
  status_reason TEXT,
  is_demo INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,               -- sha256 of the cookie token
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

CREATE TABLE IF NOT EXISTS password_resets (
  id TEXT PRIMARY KEY,               -- sha256 of the reset token
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  used_at TEXT
);

-- Donor organisations, recipient organisations (NGOs) and event partners.
CREATE TABLE IF NOT EXISTS organizations (
  id TEXT PRIMARY KEY,
  owner_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('donor','recipient')),
  name TEXT NOT NULL,
  org_type TEXT NOT NULL,
  contact_person TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  city TEXT,
  service_area TEXT,
  service_radius_km REAL NOT NULL DEFAULT 10,
  lat REAL,
  lng REAL,
  capacity_kg_per_day REAL NOT NULL DEFAULT 0,
  beneficiary_capacity INTEGER,
  operating_hours TEXT,
  food_preference TEXT NOT NULL DEFAULT 'any' CHECK (food_preference IN ('any','veg_only','non_veg_ok')),
  has_cold_storage INTEGER NOT NULL DEFAULT 0,
  has_transport INTEGER NOT NULL DEFAULT 0,
  verification_status TEXT NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending','verified','rejected','suspended')),
  verification_note TEXT,
  is_demo INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_org_owner ON organizations(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_org_kind_status ON organizations(kind, verification_status);

CREATE TABLE IF NOT EXISTS verification_requests (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  submitted_by TEXT NOT NULL REFERENCES users(id),
  registration_number TEXT,
  document_name TEXT,
  document_path TEXT,                -- stored in protected storage, never public
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  reviewed_by TEXT REFERENCES users(id),
  reviewed_at TEXT,
  decision_reason TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_verif_org ON verification_requests(org_id);

CREATE TABLE IF NOT EXISTS volunteer_profiles (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  service_areas TEXT,
  availability TEXT,
  vehicle_type TEXT,
  food_safety_trained INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);

-- Weddings, receptions, festivals and other gatherings registered in advance.
-- An event is NOT food. Food only exists once a linked food_listing is created.
CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  organizer_user_id TEXT NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_date TEXT NOT NULL,
  start_time TEXT,
  end_time TEXT,
  venue_name TEXT NOT NULL,
  venue_address TEXT NOT NULL,
  city TEXT,
  lat REAL,
  lng REAL,
  organizer_name TEXT NOT NULL,
  organizer_phone TEXT NOT NULL,
  organizer_email TEXT,
  caterer TEXT,
  expected_guests INTEGER,
  estimated_surplus_kg REAL,        -- ESTIMATE only, never counted as rescued
  expected_food_types TEXT,
  food_type TEXT CHECK (food_type IN ('veg','non_veg','mixed')),
  expected_availability_time TEXT,
  packaging_arrangements TEXT,
  storage_arrangements TEXT,
  collection_window TEXT,
  containers_available INTEGER NOT NULL DEFAULT 0,
  access_instructions TEXT,
  preferred_recipient_org_id TEXT REFERENCES organizations(id),
  transport_available INTEGER NOT NULL DEFAULT 0,
  instructions TEXT,
  consent_contact INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'registered' CHECK (status IN ('registered','awaiting_confirmation','awaiting_food','ready_for_collection','collection_arranged','completed','cancelled')),
  status_reason TEXT,
  is_demo INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_events_organizer ON events(organizer_user_id);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(event_date);

CREATE TABLE IF NOT EXISTS partner_applications (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  business_name TEXT NOT NULL,
  partner_type TEXT NOT NULL,
  contact_person TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  city TEXT NOT NULL,
  events_per_month INTEGER,
  recurring_interest INTEGER NOT NULL DEFAULT 0,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','under_review','agreement_signed','declined')),
  review_note TEXT,
  is_demo INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

-- Every donation of food: everyday surplus, planned fresh food, or event surplus.
CREATE TABLE IF NOT EXISTS food_listings (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,         -- human-friendly tracking id e.g. FL-2026-0001
  donor_user_id TEXT NOT NULL REFERENCES users(id),
  donor_org_id TEXT REFERENCES organizations(id),
  event_id TEXT REFERENCES events(id),
  source TEXT NOT NULL CHECK (source IN ('everyday_surplus','fresh_donation','event_surplus')),
  is_urgent INTEGER NOT NULL DEFAULT 0,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  quantity REAL NOT NULL CHECK (quantity > 0),
  unit TEXT NOT NULL,
  quantity_kg REAL NOT NULL CHECK (quantity_kg > 0),   -- measured / declared weight
  prepared_at TEXT,
  expiry_at TEXT,
  storage_condition TEXT NOT NULL,
  storage_temp_c REAL,
  storage_history TEXT,
  packaging_condition TEXT NOT NULL,
  allergens TEXT NOT NULL,
  food_type TEXT NOT NULL CHECK (food_type IN ('veg','non_veg','mixed')),
  handling_info TEXT,
  not_served_confirmed INTEGER NOT NULL DEFAULT 0,
  hygiene_confirmed INTEGER NOT NULL DEFAULT 0,
  pickup_address TEXT NOT NULL,
  city TEXT,
  lat REAL,
  lng REAL,
  pickup_window_start TEXT NOT NULL,
  pickup_window_end TEXT NOT NULL,
  collection_deadline TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  photo_path TEXT,
  instructions TEXT,
  safety_concerns TEXT,
  intended_recipient_org_id TEXT REFERENCES organizations(id),
  status TEXT NOT NULL CHECK (status IN ('draft','pending_review','available','request_received','accepted','pickup_scheduled','collected','delivered','rejected','cancelled','expired')),
  status_reason TEXT,
  approved_at TEXT,
  approved_kg REAL,                  -- quantity accepted after screening
  safety_hold INTEGER NOT NULL DEFAULT 0,  -- distribution blocked pending incident review
  is_demo INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_listings_status ON food_listings(status);
CREATE INDEX IF NOT EXISTS idx_listings_donor ON food_listings(donor_user_id);
CREATE INDEX IF NOT EXISTS idx_listings_event ON food_listings(event_id);
CREATE INDEX IF NOT EXISTS idx_listings_deadline ON food_listings(collection_deadline);

CREATE TABLE IF NOT EXISTS safety_screenings (
  id TEXT PRIMARY KEY,
  listing_id TEXT NOT NULL REFERENCES food_listings(id) ON DELETE CASCADE,
  stage TEXT NOT NULL CHECK (stage IN ('automated','manual','pickup','delivery')),
  result TEXT NOT NULL CHECK (result IN ('pass','needs_review','fail')),
  checks_json TEXT NOT NULL,
  notes TEXT,
  screened_by TEXT REFERENCES users(id),   -- NULL = automated rules engine
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_screen_listing ON safety_screenings(listing_id);

-- NGO standing requirements ("we need 30 kg of dry rations weekly")
CREATE TABLE IF NOT EXISTS food_needs (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by TEXT NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  quantity_kg REAL NOT NULL CHECK (quantity_kg > 0),
  needed_by TEXT,
  food_type TEXT NOT NULL DEFAULT 'any',
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','fulfilled','closed')),
  is_demo INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS donation_requests (
  id TEXT PRIMARY KEY,
  listing_id TEXT NOT NULL REFERENCES food_listings(id) ON DELETE CASCADE,
  recipient_org_id TEXT NOT NULL REFERENCES organizations(id),
  requested_by TEXT NOT NULL REFERENCES users(id),
  quantity_kg REAL NOT NULL CHECK (quantity_kg > 0),
  transport_mode TEXT NOT NULL CHECK (transport_mode IN ('volunteer','recipient','donor')),
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected','withdrawn','cancelled','completed')),
  decided_by TEXT REFERENCES users(id),
  decided_at TEXT,
  decision_reason TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_req_listing ON donation_requests(listing_id);
CREATE INDEX IF NOT EXISTS idx_req_org ON donation_requests(recipient_org_id);
-- One organisation may hold only one open request per listing
CREATE UNIQUE INDEX IF NOT EXISTS uq_req_open ON donation_requests(listing_id, recipient_org_id) WHERE status IN ('pending','accepted');
-- A listing can only have one accepted request at a time
CREATE UNIQUE INDEX IF NOT EXISTS uq_req_accepted ON donation_requests(listing_id) WHERE status = 'accepted';

CREATE TABLE IF NOT EXISTS collections (
  id TEXT PRIMARY KEY,
  listing_id TEXT NOT NULL REFERENCES food_listings(id) ON DELETE CASCADE,
  request_id TEXT NOT NULL REFERENCES donation_requests(id),
  transport_mode TEXT NOT NULL CHECK (transport_mode IN ('volunteer','recipient','donor')),
  volunteer_user_id TEXT REFERENCES users(id),
  transport_partner TEXT,
  status TEXT NOT NULL CHECK (status IN ('available','assigned','in_transit','completed','cancelled','failed')),
  scheduled_pickup_at TEXT,
  picked_up_at TEXT,
  delivered_at TEXT,
  qty_collected_kg REAL,
  qty_delivered_kg REAL,
  pickup_checks_json TEXT,
  notes TEXT,
  failure_reason TEXT,
  volunteer_minutes INTEGER,
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_col_listing ON collections(listing_id);
CREATE INDEX IF NOT EXISTS idx_col_volunteer ON collections(volunteer_user_id);
-- Only ONE active collection per listing: prevents duplicate volunteer assignments
CREATE UNIQUE INDEX IF NOT EXISTS uq_col_active ON collections(listing_id) WHERE status IN ('available','assigned','in_transit');

-- Recipient acknowledgement. UNIQUE(listing_id) makes double-counting impossible.
CREATE TABLE IF NOT EXISTS delivery_confirmations (
  id TEXT PRIMARY KEY,
  listing_id TEXT NOT NULL UNIQUE REFERENCES food_listings(id) ON DELETE CASCADE,
  collection_id TEXT NOT NULL UNIQUE REFERENCES collections(id),
  recipient_org_id TEXT NOT NULL REFERENCES organizations(id),
  confirmed_by TEXT NOT NULL REFERENCES users(id),
  qty_received_kg REAL NOT NULL CHECK (qty_received_kg > 0),
  condition_ok INTEGER NOT NULL,
  notes TEXT,
  confirmed_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS meal_programs (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organizations(id),
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  purpose TEXT NOT NULL,
  est_cost_per_meal_paise INTEGER,  -- ILLUSTRATIVE estimate until verified
  cost_basis_verified INTEGER NOT NULL DEFAULT 0,
  cost_basis_note TEXT,
  goal_paise INTEGER,
  image TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  is_demo INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS monetary_donations (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  user_id TEXT REFERENCES users(id),
  donor_name TEXT NOT NULL,
  donor_email TEXT NOT NULL,
  donor_phone TEXT,
  amount_paise INTEGER NOT NULL CHECK (amount_paise >= 1000),
  currency TEXT NOT NULL DEFAULT 'INR',
  program_id TEXT REFERENCES meal_programs(id),
  frequency TEXT NOT NULL DEFAULT 'one_time' CHECK (frequency IN ('one_time','monthly')),
  acknowledge_publicly INTEGER NOT NULL DEFAULT 0,
  mode TEXT NOT NULL CHECK (mode IN ('simulated','sandbox','live')),
  provider TEXT NOT NULL,
  provider_order_id TEXT UNIQUE,
  provider_payment_id TEXT UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('created','pending','succeeded','failed','cancelled','refunded')),
  failure_reason TEXT,
  access_token TEXT NOT NULL,        -- lets a guest donor view their own receipt
  is_demo INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_money_user ON monetary_donations(user_id);

-- Every payment provider event processed exactly once (idempotency).
CREATE TABLE IF NOT EXISTS payment_transactions (
  id TEXT PRIMARY KEY,
  donation_id TEXT NOT NULL REFERENCES monetary_donations(id) ON DELETE CASCADE,
  provider_event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT,
  verified_by TEXT NOT NULL,        -- 'signature', 'webhook', 'simulation', 'admin'
  payload_json TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS refunds (
  id TEXT PRIMARY KEY,
  donation_id TEXT NOT NULL UNIQUE REFERENCES monetary_donations(id),
  amount_paise INTEGER NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('recorded','processed')),
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS disbursements (
  id TEXT PRIMARY KEY,
  program_id TEXT NOT NULL REFERENCES meal_programs(id),
  amount_paise INTEGER NOT NULL CHECK (amount_paise > 0),
  description TEXT NOT NULL,
  recorded_by TEXT NOT NULL REFERENCES users(id),
  is_demo INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  read_at TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id, read_at);

CREATE TABLE IF NOT EXISTS incidents (
  id TEXT PRIMARY KEY,
  listing_id TEXT REFERENCES food_listings(id),
  collection_id TEXT REFERENCES collections(id),
  event_id TEXT REFERENCES events(id),
  reported_by TEXT NOT NULL REFERENCES users(id),
  kind TEXT NOT NULL CHECK (kind IN ('food_safety','missed_pickup','delay','delivery_problem','complaint','other')),
  severity TEXT NOT NULL CHECK (severity IN ('low','medium','high')),
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','investigating','resolved','dismissed')),
  resolution TEXT,
  resolved_by TEXT REFERENCES users(id),
  resolved_at TEXT,
  is_demo INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

-- Generic status history: every transition with actor + timestamp.
CREATE TABLE IF NOT EXISTS status_history (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT NOT NULL,
  actor_user_id TEXT REFERENCES users(id),
  note TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_hist_entity ON status_history(entity_type, entity_id);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  actor_user_id TEXT REFERENCES users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  reason TEXT,
  details_json TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`;
