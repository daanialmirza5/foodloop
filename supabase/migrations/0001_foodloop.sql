-- =====================================================================
-- FoodLoop — PostgreSQL / Supabase schema with Row Level Security
--
-- STATUS: target production schema. The application in this repository
-- runs on the local SQLite database (src/lib/db/schema.ts), which has the
-- same tables and constraints. A Supabase data adapter is NOT yet wired
-- into the app — see README "Known limitations".
--
-- Apply with:  supabase db push   (or paste into the Supabase SQL editor)
-- Auth: Supabase Auth (auth.users). profiles.id = auth.users.id.
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------- enums ----------
create type user_role as enum ('donor','ngo','volunteer','supporter','admin');
create type org_kind as enum ('donor','recipient');
create type org_status as enum ('pending','verified','rejected','suspended');
create type listing_status as enum ('draft','pending_review','available','request_received','accepted','pickup_scheduled','collected','delivered','rejected','cancelled','expired');
create type listing_source as enum ('everyday_surplus','fresh_donation','event_surplus');
create type event_status as enum ('registered','awaiting_confirmation','awaiting_food','ready_for_collection','collection_arranged','completed','cancelled');
create type request_status as enum ('pending','accepted','rejected','withdrawn','cancelled','completed');
create type collection_status as enum ('available','assigned','in_transit','completed','cancelled','failed');
create type transport_mode as enum ('volunteer','recipient','donor');
create type payment_status as enum ('created','pending','succeeded','failed','cancelled','refunded');
create type payment_mode as enum ('simulated','sandbox','live');

-- ---------- profiles & roles ----------
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  phone text,
  city text,
  role user_role not null default 'supporter',
  status text not null default 'active' check (status in ('active','suspended')),
  status_reason text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Role helpers used by policies (SECURITY DEFINER so policies don't recurse on profiles).
create or replace function auth_role() returns user_role language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid() and status = 'active'
$$;
create or replace function is_admin() returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(auth_role() = 'admin', false)
$$;

-- Users can never grant themselves admin (or change role) from the client.
create or replace function guard_profile_update() returns trigger language plpgsql as $$
begin
  if not is_admin() and (new.role is distinct from old.role or new.status is distinct from old.status) then
    raise exception 'role and status can only be changed by an administrator';
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger trg_profile_guard before update on profiles for each row execute function guard_profile_update();

-- New sign-ups: role taken from metadata but 'admin' is always downgraded.
create or replace function handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
declare r user_role;
begin
  r := coalesce(nullif(new.raw_user_meta_data->>'role','')::user_role, 'supporter');
  if r = 'admin' then r := 'supporter'; end if;
  insert into profiles(id, name, role) values (new.id, coalesce(new.raw_user_meta_data->>'name', new.email), r);
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function handle_new_user();

-- ---------- organisations ----------
create table organizations (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references profiles(id) on delete cascade,
  kind org_kind not null,
  name text not null,
  org_type text not null,
  contact_person text not null,
  phone text, email text, address text, city text, service_area text,
  service_radius_km numeric not null default 10,
  lat double precision, lng double precision,
  capacity_kg_per_day numeric not null default 0 check (capacity_kg_per_day >= 0),
  beneficiary_capacity integer,
  operating_hours text,
  food_preference text not null default 'any' check (food_preference in ('any','veg_only','non_veg_ok')),
  has_cold_storage boolean not null default false,
  has_transport boolean not null default false,
  verification_status org_status not null default 'pending',
  verification_note text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on organizations(owner_user_id);
create index on organizations(kind, verification_status);

create or replace function guard_org_update() returns trigger language plpgsql as $$
begin
  if not is_admin() and new.verification_status is distinct from old.verification_status then
    raise exception 'only administrators can change verification status';
  end if;
  return new;
end $$;
create trigger trg_org_guard before update on organizations for each row execute function guard_org_update();

create table verification_requests (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  submitted_by uuid not null references profiles(id),
  registration_number text,
  document_path text,           -- Supabase Storage, private bucket "verification-docs"
  document_name text,
  notes text,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  reviewed_by uuid references profiles(id),
  reviewed_at timestamptz,
  decision_reason text,
  created_at timestamptz not null default now()
);

create table volunteer_profiles (
  user_id uuid primary key references profiles(id) on delete cascade,
  service_areas text, availability text, vehicle_type text,
  food_safety_trained boolean not null default false,
  updated_at timestamptz not null default now()
);

-- ---------- events (plans, never food) ----------
create table events (
  id uuid primary key default gen_random_uuid(),
  organizer_user_id uuid not null references profiles(id),
  name text not null, event_type text not null, event_date date not null,
  start_time time, end_time time,
  venue_name text not null, venue_address text not null, city text,
  lat double precision, lng double precision,
  organizer_name text not null, organizer_phone text not null, organizer_email text,
  caterer text, expected_guests integer,
  estimated_surplus_kg numeric,       -- estimate only, never counted
  expected_food_types text,
  food_type text check (food_type in ('veg','non_veg','mixed')),
  expected_availability_time text, packaging_arrangements text, storage_arrangements text,
  collection_window text, containers_available boolean not null default false,
  access_instructions text, preferred_recipient_org_id uuid references organizations(id),
  transport_available boolean not null default false, instructions text,
  consent_contact boolean not null check (consent_contact),
  status event_status not null default 'registered', status_reason text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index on events(organizer_user_id);
create index on events(event_date);

create table partner_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id),
  business_name text not null, partner_type text not null, contact_person text not null,
  phone text not null, email text not null, city text not null,
  events_per_month integer, recurring_interest boolean not null default false, message text,
  status text not null default 'pending' check (status in ('pending','under_review','agreement_signed','declined')),
  review_note text, is_demo boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------- food ----------
create table food_listings (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  donor_user_id uuid not null references profiles(id),
  donor_org_id uuid references organizations(id),
  event_id uuid references events(id),
  source listing_source not null,
  is_urgent boolean not null default false,
  title text not null, category text not null, description text,
  quantity numeric not null check (quantity > 0), unit text not null,
  quantity_kg numeric not null check (quantity_kg > 0),
  prepared_at timestamptz, expiry_at timestamptz,
  storage_condition text not null, storage_temp_c numeric, storage_history text,
  packaging_condition text not null, allergens text not null,
  food_type text not null check (food_type in ('veg','non_veg','mixed')),
  handling_info text,
  not_served_confirmed boolean not null default false,
  hygiene_confirmed boolean not null default false,
  pickup_address text not null, city text, lat double precision, lng double precision,
  pickup_window_start timestamptz not null, pickup_window_end timestamptz not null,
  collection_deadline timestamptz not null,
  contact_name text not null, contact_phone text not null,
  photo_path text, instructions text, safety_concerns text,
  intended_recipient_org_id uuid references organizations(id),
  status listing_status not null default 'draft', status_reason text,
  approved_at timestamptz, approved_kg numeric,
  safety_hold boolean not null default false,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (pickup_window_end > pickup_window_start),
  check (source <> 'event_surplus' or event_id is not null)
);
create index on food_listings(status);
create index on food_listings(donor_user_id);
create index on food_listings(event_id);
create index on food_listings(collection_deadline);

-- Server-side state machine: rejects invalid transitions even from privileged code.
create or replace function enforce_listing_transition() returns trigger language plpgsql as $$
declare ok boolean;
begin
  if new.status = old.status then return new; end if;
  ok := case old.status
    when 'draft' then new.status in ('pending_review','rejected','cancelled')
    when 'pending_review' then new.status in ('available','rejected','cancelled','expired')
    when 'available' then new.status in ('request_received','rejected','cancelled','expired')
    when 'request_received' then new.status in ('available','accepted','rejected','cancelled','expired')
    when 'accepted' then new.status in ('pickup_scheduled','request_received','available','rejected','cancelled','expired')
    when 'pickup_scheduled' then new.status in ('collected','accepted','rejected','cancelled','expired')
    when 'collected' then new.status in ('delivered','rejected')
    else false end;
  if not ok then raise exception 'invalid listing transition % -> %', old.status, new.status; end if;
  if new.status = 'available' and not is_admin() then raise exception 'only coordinators can publish food'; end if;
  new.updated_at := now();
  return new;
end $$;
create trigger trg_listing_transition before update on food_listings for each row execute function enforce_listing_transition();

create table safety_screenings (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references food_listings(id) on delete cascade,
  stage text not null check (stage in ('automated','manual','pickup','delivery')),
  result text not null check (result in ('pass','needs_review','fail')),
  checks jsonb not null default '[]',
  notes text, screened_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create table food_needs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  created_by uuid not null references profiles(id),
  title text not null, category text not null, quantity_kg numeric not null check (quantity_kg > 0),
  needed_by timestamptz, food_type text not null default 'any', notes text,
  status text not null default 'open' check (status in ('open','fulfilled','closed')),
  is_demo boolean not null default false, created_at timestamptz not null default now()
);

create table donation_requests (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references food_listings(id) on delete cascade,
  recipient_org_id uuid not null references organizations(id),
  requested_by uuid not null references profiles(id),
  quantity_kg numeric not null check (quantity_kg > 0),
  transport_mode transport_mode not null, message text,
  status request_status not null default 'pending',
  decided_by uuid references profiles(id), decided_at timestamptz, decision_reason text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index uq_req_open on donation_requests(listing_id, recipient_org_id) where status in ('pending','accepted');
create unique index uq_req_accepted on donation_requests(listing_id) where status = 'accepted';

create table collections (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references food_listings(id) on delete cascade,
  request_id uuid not null references donation_requests(id),
  transport_mode transport_mode not null,
  volunteer_user_id uuid references profiles(id),
  transport_partner text,
  status collection_status not null,
  scheduled_pickup_at timestamptz, picked_up_at timestamptz, delivered_at timestamptz,
  qty_collected_kg numeric, qty_delivered_kg numeric,
  pickup_checks jsonb, notes text, failure_reason text, volunteer_minutes integer,
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
-- one active collection per listing → no duplicate volunteer assignment
create unique index uq_col_active on collections(listing_id) where status in ('available','assigned','in_transit');

create table delivery_confirmations (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null unique references food_listings(id) on delete cascade, -- never double counted
  collection_id uuid not null unique references collections(id),
  recipient_org_id uuid not null references organizations(id),
  confirmed_by uuid not null references profiles(id),
  qty_received_kg numeric not null check (qty_received_kg > 0),
  condition_ok boolean not null, notes text,
  confirmed_at timestamptz not null default now()
);

-- ---------- money ----------
create table meal_programs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id),
  title text not null, summary text not null, purpose text not null,
  est_cost_per_meal_paise integer, cost_basis_verified boolean not null default false, cost_basis_note text,
  goal_paise bigint, image text, is_active boolean not null default true,
  is_demo boolean not null default false, created_at timestamptz not null default now()
);

create table monetary_donations (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  user_id uuid references profiles(id),
  donor_name text not null, donor_email text not null, donor_phone text,
  amount_paise bigint not null check (amount_paise >= 1000),
  currency text not null default 'INR',
  program_id uuid references meal_programs(id),
  frequency text not null default 'one_time' check (frequency in ('one_time','monthly')),
  acknowledge_publicly boolean not null default false,
  mode payment_mode not null, provider text not null,
  provider_order_id text unique, provider_payment_id text unique,
  status payment_status not null default 'created', failure_reason text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table payment_transactions (            -- idempotent provider events
  id uuid primary key default gen_random_uuid(),
  donation_id uuid not null references monetary_donations(id) on delete cascade,
  provider_event_id text not null unique,
  event_type text not null, from_status payment_status, to_status payment_status,
  verified_by text not null, payload jsonb,
  created_at timestamptz not null default now()
);

create table refunds (
  id uuid primary key default gen_random_uuid(),
  donation_id uuid not null unique references monetary_donations(id),
  amount_paise bigint not null, reason text not null,
  status text not null check (status in ('recorded','processed')),
  created_by uuid not null references profiles(id), created_at timestamptz not null default now()
);

create table disbursements (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references meal_programs(id),
  amount_paise bigint not null check (amount_paise > 0),
  description text not null, recorded_by uuid not null references profiles(id),
  is_demo boolean not null default false, created_at timestamptz not null default now()
);

-- ---------- notifications, incidents, history, audit ----------
create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  type text not null, title text not null, body text, link text,
  read_at timestamptz, created_at timestamptz not null default now()
);
create index on notifications(user_id, read_at);

create table incidents (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references food_listings(id),
  collection_id uuid references collections(id),
  event_id uuid references events(id),
  reported_by uuid not null references profiles(id),
  kind text not null check (kind in ('food_safety','missed_pickup','delay','delivery_problem','complaint','other')),
  severity text not null check (severity in ('low','medium','high')),
  description text not null,
  status text not null default 'open' check (status in ('open','investigating','resolved','dismissed')),
  resolution text, resolved_by uuid references profiles(id), resolved_at timestamptz,
  is_demo boolean not null default false, created_at timestamptz not null default now()
);

create table status_history (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null, entity_id uuid not null,
  from_status text, to_status text not null,
  actor_user_id uuid references profiles(id), note text,
  created_at timestamptz not null default now()
);
create index on status_history(entity_type, entity_id);

create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references profiles(id),
  action text not null, entity_type text not null, entity_id text,
  reason text, details jsonb, created_at timestamptz not null default now()
);

create table settings (key text primary key, value jsonb not null);

-- =====================================================================
-- Row Level Security
-- Writes that change workflow state should go through server-side code
-- (Next.js server actions with the service role) which re-checks
-- permissions; the policies below are the database-level backstop.
-- =====================================================================
alter table profiles enable row level security;
alter table organizations enable row level security;
alter table verification_requests enable row level security;
alter table volunteer_profiles enable row level security;
alter table events enable row level security;
alter table partner_applications enable row level security;
alter table food_listings enable row level security;
alter table safety_screenings enable row level security;
alter table food_needs enable row level security;
alter table donation_requests enable row level security;
alter table collections enable row level security;
alter table delivery_confirmations enable row level security;
alter table meal_programs enable row level security;
alter table monetary_donations enable row level security;
alter table payment_transactions enable row level security;
alter table refunds enable row level security;
alter table disbursements enable row level security;
alter table notifications enable row level security;
alter table incidents enable row level security;
alter table status_history enable row level security;
alter table audit_logs enable row level security;
alter table settings enable row level security;

-- profiles
create policy "own profile" on profiles for select using (id = auth.uid() or is_admin());
create policy "update own profile" on profiles for update using (id = auth.uid() or is_admin());

-- organisations: public can see verified recipients (no private columns should be exposed via a view in production)
create policy "verified recipients are public" on organizations for select using (kind = 'recipient' and verification_status = 'verified');
create policy "owner reads own org" on organizations for select using (owner_user_id = auth.uid() or is_admin());
create policy "owner creates org" on organizations for insert with check (owner_user_id = auth.uid() and verification_status = 'pending');
create policy "owner updates org" on organizations for update using (owner_user_id = auth.uid() or is_admin());

create policy "verification: owner or admin" on verification_requests for select using (is_admin() or exists (select 1 from organizations o where o.id = org_id and o.owner_user_id = auth.uid()));
create policy "verification: owner submits" on verification_requests for insert with check (submitted_by = auth.uid());
create policy "verification: admin decides" on verification_requests for update using (is_admin());

create policy "volunteer profile own" on volunteer_profiles for all using (user_id = auth.uid() or is_admin()) with check (user_id = auth.uid() or is_admin());

-- events: organiser and admins only
create policy "events own" on events for select using (organizer_user_id = auth.uid() or is_admin());
create policy "events create" on events for insert with check (organizer_user_id = auth.uid() and auth_role() in ('donor','admin') and status in ('registered','awaiting_confirmation'));
create policy "events update own" on events for update using (organizer_user_id = auth.uid() or is_admin());

create policy "partners apply" on partner_applications for insert with check (true);
create policy "partners signed are public" on partner_applications for select using (status = 'agreement_signed' or is_admin() or user_id = auth.uid());
create policy "partners admin" on partner_applications for update using (is_admin());

-- food listings: open food visible to all signed-in users; private address columns must be served via a redacting view/RPC
create policy "open listings visible" on food_listings for select using (status in ('available','request_received','accepted','pickup_scheduled','collected','delivered','expired','cancelled') or donor_user_id = auth.uid() or is_admin());
create policy "donor creates listing" on food_listings for insert with check (donor_user_id = auth.uid() and auth_role() in ('donor','admin') and status in ('draft','pending_review','rejected'));
create policy "donor edits own early listing" on food_listings for update using ((donor_user_id = auth.uid() and status in ('draft','pending_review','available')) or is_admin());

create policy "screenings visible with listing" on safety_screenings for select using (exists (select 1 from food_listings l where l.id = listing_id));
create policy "screenings admin write" on safety_screenings for insert with check (is_admin() or screened_by = auth.uid());

create policy "needs public" on food_needs for select using (true);
create policy "needs owner" on food_needs for all using (exists (select 1 from organizations o where o.id = org_id and o.owner_user_id = auth.uid() and o.verification_status = 'verified')) with check (created_by = auth.uid());

-- requests: requesting org, the donor, admins
create policy "requests visible to parties" on donation_requests for select using (
  is_admin() or requested_by = auth.uid()
  or exists (select 1 from food_listings l where l.id = listing_id and l.donor_user_id = auth.uid()));
create policy "verified ngo requests" on donation_requests for insert with check (
  requested_by = auth.uid() and status = 'pending'
  and exists (select 1 from organizations o where o.id = recipient_org_id and o.owner_user_id = auth.uid() and o.verification_status = 'verified'));
create policy "parties update requests" on donation_requests for update using (
  is_admin() or requested_by = auth.uid()
  or exists (select 1 from food_listings l where l.id = listing_id and l.donor_user_id = auth.uid()));

-- collections: open tasks visible to volunteers; details to parties
create policy "collections visible" on collections for select using (
  is_admin() or volunteer_user_id = auth.uid() or (status = 'available' and auth_role() = 'volunteer')
  or exists (select 1 from food_listings l where l.id = listing_id and l.donor_user_id = auth.uid())
  or exists (select 1 from donation_requests r join organizations o on o.id = r.recipient_org_id where r.id = request_id and o.owner_user_id = auth.uid()));
create policy "collections update by parties" on collections for update using (
  is_admin() or volunteer_user_id = auth.uid() or (status = 'available' and auth_role() = 'volunteer'));

create policy "deliveries visible" on delivery_confirmations for select using (true);
create policy "recipient confirms" on delivery_confirmations for insert with check (
  confirmed_by = auth.uid() and exists (select 1 from organizations o where o.id = recipient_org_id and o.owner_user_id = auth.uid()));

-- money
create policy "programs public" on meal_programs for select using (is_active or is_admin());
create policy "programs admin" on meal_programs for all using (is_admin()) with check (is_admin());
create policy "own donations" on monetary_donations for select using (user_id = auth.uid() or is_admin());
-- donations are created and updated ONLY by the server (service role) after gateway verification: no client policies
create policy "payment events admin" on payment_transactions for select using (is_admin());
create policy "refunds admin" on refunds for select using (is_admin());
create policy "disbursements public" on disbursements for select using (true);

create policy "own notifications" on notifications for select using (user_id = auth.uid());
create policy "mark own read" on notifications for update using (user_id = auth.uid());

create policy "incidents reporter or admin" on incidents for select using (reported_by = auth.uid() or is_admin());
create policy "incidents report" on incidents for insert with check (reported_by = auth.uid());
create policy "incidents admin" on incidents for update using (is_admin());

create policy "history admin" on status_history for select using (is_admin());
create policy "audit admin" on audit_logs for select using (is_admin());
-- audit logs are append-only: no update/delete policies exist
create policy "settings read" on settings for select using (true);
create policy "settings admin" on settings for all using (is_admin()) with check (is_admin());

-- Storage (run in Supabase): private bucket for verification documents
-- insert into storage.buckets (id, name, public) values ('verification-docs','verification-docs', false);
-- insert into storage.buckets (id, name, public) values ('food-photos','food-photos', true);
