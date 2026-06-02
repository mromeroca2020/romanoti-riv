-- ============================================================
-- Romanoti RIV - Supabase Schema v1
-- File: supabase/schema_riv_pilot_v1.sql
--
-- Purpose:
-- - Create the initial database model for Romanoti RIV Pilot.
-- - Support real device images.
-- - Support interactive port hotspots over device front panels.
-- - Support racks, devices, ports, cable segments, connectivity
--   paths and Smart Hands workflows.
--
-- Product direction:
-- - Frontend must not query Supabase directly.
-- - Flask backend will expose protected /api/riv/* endpoints.
-- - Supabase keys must stay in backend environment variables.
-- - Frontend pages only call the backend.
--
-- Main visual feature supported:
-- - Device image appears inside rack RU.
-- - Ports are clickable using x/y/width/height percentages.
-- - Selected ports can be highlighted.
-- - Port details can open Connectivity Map, Connection Details
--   or Smart Hands.
-- ============================================================


-- ============================================================
-- EXTENSIONS
-- ============================================================

create extension if not exists pgcrypto;


-- ============================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================================

create or replace function public.riv_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


-- ============================================================
-- COMPANIES
-- ============================================================

create table if not exists public.riv_companies (
  id uuid primary key default gen_random_uuid(),

  name text not null,
  legal_name text,
  status text not null default 'active',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_riv_companies_updated_at on public.riv_companies;

create trigger trg_riv_companies_updated_at
before update on public.riv_companies
for each row
execute function public.riv_set_updated_at();


-- ============================================================
-- DATA CENTERS / SITES
-- ============================================================

create table if not exists public.riv_data_centers (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null references public.riv_companies(id) on delete cascade,

  name text not null,
  code text not null,
  city text,
  country text,
  status text not null default 'active',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique(company_id, code)
);

drop trigger if exists trg_riv_data_centers_updated_at on public.riv_data_centers;

create trigger trg_riv_data_centers_updated_at
before update on public.riv_data_centers
for each row
execute function public.riv_set_updated_at();


-- ============================================================
-- RACKS
-- ============================================================

create table if not exists public.riv_racks (
  id uuid primary key default gen_random_uuid(),

  data_center_id uuid not null references public.riv_data_centers(id) on delete cascade,

  name text not null,
  row_name text,
  room_name text,
  total_ru integer not null default 42,
  status text not null default 'active',

  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique(data_center_id, name)
);

drop trigger if exists trg_riv_racks_updated_at on public.riv_racks;

create trigger trg_riv_racks_updated_at
before update on public.riv_racks
for each row
execute function public.riv_set_updated_at();


-- ============================================================
-- DEVICE ASSETS
--
-- This table defines the visual/model template.
-- Example:
-- - Cisco Catalyst 9300-24T front image
-- - FortiGate 100F front image
-- - Dell/HPE generic 1U server front image
--
-- image_url can point to:
-- - /assets/devices/cisco-catalyst-9300-24t-front.png
-- - Supabase Storage public/signed URL later
-- ============================================================

create table if not exists public.riv_device_assets (
  id uuid primary key default gen_random_uuid(),

  vendor text not null,
  model text not null,
  device_type text not null,

  display_name text not null,
  image_url text not null,
  image_storage_path text,

  image_width integer,
  image_height integer,

  front_panel_height_ru integer not null default 1,

  approved_for_demo boolean not null default false,
  status text not null default 'active',
  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique(vendor, model)
);

drop trigger if exists trg_riv_device_assets_updated_at on public.riv_device_assets;

create trigger trg_riv_device_assets_updated_at
before update on public.riv_device_assets
for each row
execute function public.riv_set_updated_at();


-- ============================================================
-- DEVICE ASSET PORTS
--
-- This table maps visual/clickable ports over a real device image.
--
-- Coordinates are percentages:
-- x_percent      = left position over image
-- y_percent      = top position over image
-- width_percent  = hotspot width
-- height_percent = hotspot height
--
-- Example:
-- Eth5 could be:
-- x_percent: 22.5
-- y_percent: 48.2
-- width_percent: 2.2
-- height_percent: 9.8
--
-- The frontend will render absolute hotspots over the image.
-- ============================================================

create table if not exists public.riv_device_asset_ports (
  id uuid primary key default gen_random_uuid(),

  device_asset_id uuid not null references public.riv_device_assets(id) on delete cascade,

  port_name text not null,
  port_label text not null,
  port_type text not null,

  x_percent numeric(6,3) not null,
  y_percent numeric(6,3) not null,
  width_percent numeric(6,3) not null,
  height_percent numeric(6,3) not null,

  sort_order integer not null default 0,
  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique(device_asset_id, port_name)
);

drop trigger if exists trg_riv_device_asset_ports_updated_at on public.riv_device_asset_ports;

create trigger trg_riv_device_asset_ports_updated_at
before update on public.riv_device_asset_ports
for each row
execute function public.riv_set_updated_at();


-- ============================================================
-- DEVICES
--
-- Installed devices inside racks.
-- The device uses a visual asset.
--
-- ru_start / ru_end:
-- - Example switch occupying RU39-38:
--   ru_start = 38
--   ru_end = 39
--
-- The frontend can render the device at the proper RU.
-- ============================================================

create table if not exists public.riv_devices (
  id uuid primary key default gen_random_uuid(),

  rack_id uuid not null references public.riv_racks(id) on delete cascade,
  device_asset_id uuid references public.riv_device_assets(id) on delete set null,

  name text not null,
  role text,
  device_type text not null,

  vendor text,
  model text,
  serial_number text,

  ru_start integer not null,
  ru_end integer not null,

  management_ip inet,
  status text not null default 'operational',

  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique(rack_id, name),

  check (ru_start >= 1),
  check (ru_end >= ru_start)
);

drop trigger if exists trg_riv_devices_updated_at on public.riv_devices;

create trigger trg_riv_devices_updated_at
before update on public.riv_devices
for each row
execute function public.riv_set_updated_at();


-- ============================================================
-- DEVICE PORTS
--
-- Real logical/physical ports of an installed device.
-- asset_port_id links the real port to the visual hotspot.
-- ============================================================

create table if not exists public.riv_device_ports (
  id uuid primary key default gen_random_uuid(),

  device_id uuid not null references public.riv_devices(id) on delete cascade,
  asset_port_id uuid references public.riv_device_asset_ports(id) on delete set null,

  port_name text not null,
  port_label text,
  port_type text not null,

  speed text,
  vlan text,
  ip_address inet,

  status text not null default 'available',

  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique(device_id, port_name)
);

drop trigger if exists trg_riv_device_ports_updated_at on public.riv_device_ports;

create trigger trg_riv_device_ports_updated_at
before update on public.riv_device_ports
for each row
execute function public.riv_set_updated_at();


-- ============================================================
-- CABLE SEGMENTS
--
-- One physical cable run from one port/location to another.
--
-- This is the key Smart Hands concept:
-- - Not only total cable length.
-- - Every connection-to-connection segment has cable type,
--   length, connector and label.
-- ============================================================

create table if not exists public.riv_cable_segments (
  id uuid primary key default gen_random_uuid(),

  data_center_id uuid not null references public.riv_data_centers(id) on delete cascade,

  from_port_id uuid references public.riv_device_ports(id) on delete set null,
  to_port_id uuid references public.riv_device_ports(id) on delete set null,

  from_label text not null,
  to_label text not null,

  cable_type text not null,
  cable_length_m numeric(8,2) not null,
  connector_type text,

  cable_label text not null,
  status text not null default 'planned',

  technician_note text,
  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_riv_cable_segments_updated_at on public.riv_cable_segments;

create trigger trg_riv_cable_segments_updated_at
before update on public.riv_cable_segments
for each row
execute function public.riv_set_updated_at();


-- ============================================================
-- CONNECTIVITY PATHS
--
-- High-level end-to-end path.
-- Example:
-- CORE-SW-01 Eth5 -> SRV-APP-01 NIC1
-- ============================================================

create table if not exists public.riv_connectivity_paths (
  id uuid primary key default gen_random_uuid(),

  data_center_id uuid not null references public.riv_data_centers(id) on delete cascade,

  name text not null,
  source_port_id uuid references public.riv_device_ports(id) on delete set null,
  destination_port_id uuid references public.riv_device_ports(id) on delete set null,

  service_type text,
  speed text,
  vlan text,

  status text not null default 'operational',
  validation_score integer not null default 0,

  description text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_riv_connectivity_paths_updated_at on public.riv_connectivity_paths;

create trigger trg_riv_connectivity_paths_updated_at
before update on public.riv_connectivity_paths
for each row
execute function public.riv_set_updated_at();


-- ============================================================
-- CONNECTIVITY PATH HOPS
--
-- Ordered list of hops for visual path:
-- Device -> OH -> MDF -> Backbone -> OH -> Device
-- ============================================================

create table if not exists public.riv_connectivity_path_hops (
  id uuid primary key default gen_random_uuid(),

  connectivity_path_id uuid not null references public.riv_connectivity_paths(id) on delete cascade,
  cable_segment_id uuid references public.riv_cable_segments(id) on delete set null,

  hop_order integer not null,
  hop_type text not null,

  title text not null,
  subtitle text,
  location_label text,

  status text not null default 'ok',
  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique(connectivity_path_id, hop_order)
);

drop trigger if exists trg_riv_connectivity_path_hops_updated_at on public.riv_connectivity_path_hops;

create trigger trg_riv_connectivity_path_hops_updated_at
before update on public.riv_connectivity_path_hops
for each row
execute function public.riv_set_updated_at();


-- ============================================================
-- SMART HANDS TASKS
-- ============================================================

create table if not exists public.riv_smart_hands_tasks (
  id uuid primary key default gen_random_uuid(),

  data_center_id uuid not null references public.riv_data_centers(id) on delete cascade,
  connectivity_path_id uuid references public.riv_connectivity_paths(id) on delete set null,

  title text not null,
  ticket_ref text,
  priority text not null default 'normal',
  task_type text not null default 'field_execution',

  status text not null default 'ready',

  source_summary text,
  destination_summary text,

  dispatch_note text,
  closure_summary text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_riv_smart_hands_tasks_updated_at on public.riv_smart_hands_tasks;

create trigger trg_riv_smart_hands_tasks_updated_at
before update on public.riv_smart_hands_tasks
for each row
execute function public.riv_set_updated_at();


-- ============================================================
-- SMART HANDS STEPS
-- ============================================================

create table if not exists public.riv_smart_hands_steps (
  id uuid primary key default gen_random_uuid(),

  smart_hands_task_id uuid not null references public.riv_smart_hands_tasks(id) on delete cascade,

  step_order integer not null,
  title text not null,
  instruction text not null,
  expected_result text,

  status text not null default 'pending',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique(smart_hands_task_id, step_order)
);

drop trigger if exists trg_riv_smart_hands_steps_updated_at on public.riv_smart_hands_steps;

create trigger trg_riv_smart_hands_steps_updated_at
before update on public.riv_smart_hands_steps
for each row
execute function public.riv_set_updated_at();


-- ============================================================
-- SMART HANDS EVIDENCE REQUIREMENTS
-- ============================================================

create table if not exists public.riv_smart_hands_evidence_requirements (
  id uuid primary key default gen_random_uuid(),

  smart_hands_task_id uuid not null references public.riv_smart_hands_tasks(id) on delete cascade,

  evidence_order integer not null,
  title text not null,
  description text not null,
  evidence_type text not null default 'photo',

  required boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique(smart_hands_task_id, evidence_order)
);

drop trigger if exists trg_riv_smart_hands_evidence_requirements_updated_at on public.riv_smart_hands_evidence_requirements;

create trigger trg_riv_smart_hands_evidence_requirements_updated_at
before update on public.riv_smart_hands_evidence_requirements
for each row
execute function public.riv_set_updated_at();


-- ============================================================
-- INDEXES
-- ============================================================

create index if not exists idx_riv_data_centers_company_id
on public.riv_data_centers(company_id);

create index if not exists idx_riv_racks_data_center_id
on public.riv_racks(data_center_id);

create index if not exists idx_riv_devices_rack_id
on public.riv_devices(rack_id);

create index if not exists idx_riv_devices_asset_id
on public.riv_devices(device_asset_id);

create index if not exists idx_riv_device_ports_device_id
on public.riv_device_ports(device_id);

create index if not exists idx_riv_device_ports_asset_port_id
on public.riv_device_ports(asset_port_id);

create index if not exists idx_riv_cable_segments_data_center_id
on public.riv_cable_segments(data_center_id);

create index if not exists idx_riv_connectivity_paths_data_center_id
on public.riv_connectivity_paths(data_center_id);

create index if not exists idx_riv_connectivity_path_hops_path_id
on public.riv_connectivity_path_hops(connectivity_path_id);

create index if not exists idx_riv_smart_hands_tasks_data_center_id
on public.riv_smart_hands_tasks(data_center_id);

create index if not exists idx_riv_smart_hands_steps_task_id
on public.riv_smart_hands_steps(smart_hands_task_id);


-- ============================================================
-- ROW LEVEL SECURITY
--
-- We enable RLS because the frontend must not access Supabase
-- directly. The Flask backend should use the service role key
-- through environment variables.
--
-- Later, if we add user-based Supabase Auth policies, we can
-- add explicit policies here.
-- ============================================================

alter table public.riv_companies enable row level security;
alter table public.riv_data_centers enable row level security;
alter table public.riv_racks enable row level security;
alter table public.riv_device_assets enable row level security;
alter table public.riv_device_asset_ports enable row level security;
alter table public.riv_devices enable row level security;
alter table public.riv_device_ports enable row level security;
alter table public.riv_cable_segments enable row level security;
alter table public.riv_connectivity_paths enable row level security;
alter table public.riv_connectivity_path_hops enable row level security;
alter table public.riv_smart_hands_tasks enable row level security;
alter table public.riv_smart_hands_steps enable row level security;
alter table public.riv_smart_hands_evidence_requirements enable row level security;


-- ============================================================
-- DEMO SEED DATA
--
-- All operational names are demo names.
-- Replace image_url values when real approved images are added.
-- ============================================================

insert into public.riv_companies (name, legal_name)
values ('Romanoti Demo Company', 'RomanoTI-Solutions Inc.')
on conflict do nothing;


insert into public.riv_data_centers (company_id, name, code, city, country)
select
  c.id,
  'DemoDC-01',
  'DEMODC01',
  'Ottawa',
  'Canada'
from public.riv_companies c
where c.name = 'Romanoti Demo Company'
on conflict do nothing;


insert into public.riv_racks (data_center_id, name, row_name, room_name, total_ru, notes)
select
  dc.id,
  'Rack R42',
  'Row A',
  'Demo Room',
  42,
  'Main demo rack for RIV pilot.'
from public.riv_data_centers dc
where dc.code = 'DEMODC01'
on conflict do nothing;


insert into public.riv_racks (data_center_id, name, row_name, room_name, total_ru, notes)
select
  dc.id,
  'Rack R44',
  'Row A',
  'Demo Room',
  42,
  'Secondary demo rack for RIV pilot.'
from public.riv_data_centers dc
where dc.code = 'DEMODC01'
on conflict do nothing;


-- ============================================================
-- DEVICE ASSETS
-- image_url points to local project path for now.
-- Later this can point to Supabase Storage.
-- ============================================================

insert into public.riv_device_assets (
  vendor,
  model,
  device_type,
  display_name,
  image_url,
  image_width,
  image_height,
  front_panel_height_ru,
  approved_for_demo,
  notes
)
values
(
  'Cisco',
  'Catalyst 9300-24T',
  'switch',
  'Cisco Catalyst 9300-24T Front Panel',
  '/assets/devices/cisco-catalyst-9300-24t-front.png',
  1600,
  320,
  1,
  true,
  'Demo front panel asset for core switch visualization.'
),
(
  'Fortinet',
  'FortiGate 100F',
  'firewall',
  'Fortinet FortiGate 100F Front Panel',
  '/assets/devices/fortigate-100f-front.png',
  1600,
  320,
  1,
  true,
  'Demo front panel asset for firewall visualization.'
),
(
  'Dell',
  'PowerEdge R650',
  'server',
  'Dell PowerEdge R650 Front Panel',
  '/assets/devices/dell-poweredge-r650-front.png',
  1600,
  320,
  1,
  true,
  'Demo front panel asset for application server visualization.'
),
(
  'Dell',
  'PowerVault ME4024',
  'storage',
  'Dell PowerVault ME4024 Front Panel',
  '/assets/devices/dell-powervault-me4024-front.png',
  1600,
  320,
  2,
  true,
  'Demo front panel asset for storage visualization.'
)
on conflict do nothing;


-- ============================================================
-- DEVICE ASSET PORT HOTSPOTS
--
-- These are initial approximate coordinates.
-- We will fine-tune them once the real images are placed in:
-- src/web/assets/devices/
-- ============================================================

-- Cisco Catalyst 9300-24T: Eth1 to Eth24
insert into public.riv_device_asset_ports (
  device_asset_id,
  port_name,
  port_label,
  port_type,
  x_percent,
  y_percent,
  width_percent,
  height_percent,
  sort_order
)
select
  a.id,
  'Eth' || gs.port_number,
  'Eth' || gs.port_number,
  'RJ45/SFP',
  18.0 + ((gs.port_number - 1) * 2.55),
  case when gs.port_number <= 12 then 38.0 else 57.0 end,
  1.80,
  10.50,
  gs.port_number
from public.riv_device_assets a
cross join generate_series(1, 24) as gs(port_number)
where a.vendor = 'Cisco'
  and a.model = 'Catalyst 9300-24T'
on conflict do nothing;


-- FortiGate 100F: Port1 to Port16
insert into public.riv_device_asset_ports (
  device_asset_id,
  port_name,
  port_label,
  port_type,
  x_percent,
  y_percent,
  width_percent,
  height_percent,
  sort_order
)
select
  a.id,
  'Port ' || gs.port_number,
  'Port ' || gs.port_number,
  'RJ45/SFP',
  25.0 + ((gs.port_number - 1) * 3.20),
  case when gs.port_number <= 8 then 40.0 else 58.0 end,
  2.10,
  11.00,
  gs.port_number
from public.riv_device_assets a
cross join generate_series(1, 16) as gs(port_number)
where a.vendor = 'Fortinet'
  and a.model = 'FortiGate 100F'
on conflict do nothing;


-- Dell PowerEdge R650: NIC1 to NIC4
insert into public.riv_device_asset_ports (
  device_asset_id,
  port_name,
  port_label,
  port_type,
  x_percent,
  y_percent,
  width_percent,
  height_percent,
  sort_order
)
select
  a.id,
  'NIC' || gs.port_number,
  'NIC' || gs.port_number,
  'Ethernet',
  72.0 + ((gs.port_number - 1) * 3.50),
  48.0,
  2.40,
  12.00,
  gs.port_number
from public.riv_device_assets a
cross join generate_series(1, 4) as gs(port_number)
where a.vendor = 'Dell'
  and a.model = 'PowerEdge R650'
on conflict do nothing;


-- Dell PowerVault ME4024: iSCSI1 to iSCSI4
insert into public.riv_device_asset_ports (
  device_asset_id,
  port_name,
  port_label,
  port_type,
  x_percent,
  y_percent,
  width_percent,
  height_percent,
  sort_order
)
select
  a.id,
  'iSCSI' || gs.port_number,
  'iSCSI' || gs.port_number,
  'Ethernet',
  68.0 + ((gs.port_number - 1) * 3.60),
  52.0,
  2.60,
  12.00,
  gs.port_number
from public.riv_device_assets a
cross join generate_series(1, 4) as gs(port_number)
where a.vendor = 'Dell'
  and a.model = 'PowerVault ME4024'
on conflict do nothing;


-- ============================================================
-- INSTALLED DEVICES
-- ============================================================

insert into public.riv_devices (
  rack_id,
  device_asset_id,
  name,
  role,
  device_type,
  vendor,
  model,
  ru_start,
  ru_end,
  management_ip,
  status,
  notes
)
select
  r.id,
  a.id,
  'CORE-SW-01',
  'Core Switch',
  'switch',
  'Cisco',
  'Catalyst 9300-24T',
  38,
  39,
  '10.10.10.1',
  'operational',
  'Primary demo core switch.'
from public.riv_racks r
join public.riv_data_centers dc on dc.id = r.data_center_id
join public.riv_device_assets a on a.vendor = 'Cisco' and a.model = 'Catalyst 9300-24T'
where dc.code = 'DEMODC01'
  and r.name = 'Rack R42'
on conflict do nothing;


insert into public.riv_devices (
  rack_id,
  device_asset_id,
  name,
  role,
  device_type,
  vendor,
  model,
  ru_start,
  ru_end,
  management_ip,
  status,
  notes
)
select
  r.id,
  a.id,
  'FW-01',
  'Firewall',
  'firewall',
  'Fortinet',
  'FortiGate 100F',
  26,
  27,
  '10.10.30.1',
  'warning',
  'Firewall handoff path requires physical label confirmation.'
from public.riv_racks r
join public.riv_data_centers dc on dc.id = r.data_center_id
join public.riv_device_assets a on a.vendor = 'Fortinet' and a.model = 'FortiGate 100F'
where dc.code = 'DEMODC01'
  and r.name = 'Rack R42'
on conflict do nothing;


insert into public.riv_devices (
  rack_id,
  device_asset_id,
  name,
  role,
  device_type,
  vendor,
  model,
  ru_start,
  ru_end,
  management_ip,
  status,
  notes
)
select
  r.id,
  a.id,
  'SRV-APP-01',
  'Application Server',
  'server',
  'Dell',
  'PowerEdge R650',
  18,
  19,
  '10.10.40.21',
  'operational',
  'Application server demo endpoint.'
from public.riv_racks r
join public.riv_data_centers dc on dc.id = r.data_center_id
join public.riv_device_assets a on a.vendor = 'Dell' and a.model = 'PowerEdge R650'
where dc.code = 'DEMODC01'
  and r.name = 'Rack R42'
on conflict do nothing;


insert into public.riv_devices (
  rack_id,
  device_asset_id,
  name,
  role,
  device_type,
  vendor,
  model,
  ru_start,
  ru_end,
  management_ip,
  status,
  notes
)
select
  r.id,
  a.id,
  'STORAGE-01',
  'Storage Array',
  'storage',
  'Dell',
  'PowerVault ME4024',
  14,
  15,
  '10.10.50.10',
  'operational',
  'Storage demo endpoint.'
from public.riv_racks r
join public.riv_data_centers dc on dc.id = r.data_center_id
join public.riv_device_assets a on a.vendor = 'Dell' and a.model = 'PowerVault ME4024'
where dc.code = 'DEMODC01'
  and r.name = 'Rack R42'
on conflict do nothing;


insert into public.riv_devices (
  rack_id,
  device_asset_id,
  name,
  role,
  device_type,
  vendor,
  model,
  ru_start,
  ru_end,
  management_ip,
  status,
  notes
)
select
  r.id,
  a.id,
  'BACKUP-01',
  'Backup Server',
  'server',
  'Dell',
  'PowerEdge R650',
  31,
  34,
  '10.10.55.10',
  'operational',
  'Backup server demo endpoint.'
from public.riv_racks r
join public.riv_data_centers dc on dc.id = r.data_center_id
join public.riv_device_assets a on a.vendor = 'Dell' and a.model = 'PowerEdge R650'
where dc.code = 'DEMODC01'
  and r.name = 'Rack R44'
on conflict do nothing;


-- ============================================================
-- DEVICE PORTS
-- Core switch selected demo ports
-- ============================================================

insert into public.riv_device_ports (
  device_id,
  asset_port_id,
  port_name,
  port_label,
  port_type,
  speed,
  vlan,
  ip_address,
  status,
  notes
)
select
  d.id,
  ap.id,
  ap.port_name,
  ap.port_label,
  ap.port_type,
  case
    when ap.port_name = 'Eth5' then '10 Gbps'
    when ap.port_name = 'Eth14' then '1 Gbps'
    else '1 Gbps'
  end,
  case
    when ap.port_name = 'Eth5' then '120'
    when ap.port_name = 'Eth14' then 'WAN / Edge'
    else null
  end,
  null,
  case
    when ap.port_name in ('Eth5', 'Eth14') then 'connected'
    else 'available'
  end,
  'Auto-created demo switch port.'
from public.riv_devices d
join public.riv_device_assets a on a.id = d.device_asset_id
join public.riv_device_asset_ports ap on ap.device_asset_id = a.id
where d.name = 'CORE-SW-01'
on conflict do nothing;


-- Firewall ports
insert into public.riv_device_ports (
  device_id,
  asset_port_id,
  port_name,
  port_label,
  port_type,
  speed,
  vlan,
  status,
  notes
)
select
  d.id,
  ap.id,
  ap.port_name,
  ap.port_label,
  ap.port_type,
  case when ap.port_name = 'Port 3' then '1 Gbps' else null end,
  case when ap.port_name = 'Port 3' then 'WAN / Edge' else null end,
  case when ap.port_name = 'Port 3' then 'warning' else 'available' end,
  'Auto-created demo firewall port.'
from public.riv_devices d
join public.riv_device_assets a on a.id = d.device_asset_id
join public.riv_device_asset_ports ap on ap.device_asset_id = a.id
where d.name = 'FW-01'
on conflict do nothing;


-- Server ports
insert into public.riv_device_ports (
  device_id,
  asset_port_id,
  port_name,
  port_label,
  port_type,
  speed,
  vlan,
  ip_address,
  status,
  notes
)
select
  d.id,
  ap.id,
  ap.port_name,
  ap.port_label,
  ap.port_type,
  case when ap.port_name = 'NIC1' then '10 Gbps' else null end,
  case when ap.port_name = 'NIC1' then '120' else null end,
  case when d.name = 'SRV-APP-01' and ap.port_name = 'NIC1' then '10.10.40.21'::inet else null end,
  case when ap.port_name = 'NIC1' then 'connected' else 'available' end,
  'Auto-created demo server port.'
from public.riv_devices d
join public.riv_device_assets a on a.id = d.device_asset_id
join public.riv_device_asset_ports ap on ap.device_asset_id = a.id
where d.name in ('SRV-APP-01', 'BACKUP-01')
on conflict do nothing;


-- Storage ports
insert into public.riv_device_ports (
  device_id,
  asset_port_id,
  port_name,
  port_label,
  port_type,
  speed,
  vlan,
  ip_address,
  status,
  notes
)
select
  d.id,
  ap.id,
  ap.port_name,
  ap.port_label,
  ap.port_type,
  case when ap.port_name = 'iSCSI1' then '10 Gbps' else null end,
  case when ap.port_name = 'iSCSI1' then '150' else null end,
  case when ap.port_name = 'iSCSI1' then '10.10.50.10'::inet else null end,
  case when ap.port_name = 'iSCSI1' then 'connected' else 'available' end,
  'Auto-created demo storage port.'
from public.riv_devices d
join public.riv_device_assets a on a.id = d.device_asset_id
join public.riv_device_asset_ports ap on ap.device_asset_id = a.id
where d.name = 'STORAGE-01'
on conflict do nothing;


-- ============================================================
-- INITIAL CABLE SEGMENTS
-- These are physical connection-to-connection runs.
-- ============================================================

insert into public.riv_cable_segments (
  data_center_id,
  from_port_id,
  to_port_id,
  from_label,
  to_label,
  cable_type,
  cable_length_m,
  connector_type,
  cable_label,
  status,
  technician_note
)
select
  dc.id,
  p1.id,
  null,
  'CORE-SW-01 Eth5 / Rack R42 RU39',
  'OH-A12 Port 05 / Row A',
  'LC-LC MM Fiber patch',
  3,
  'LC-LC / SFP+ SR',
  'R42-CORE-Eth5_to_OH-A12-05',
  'planned',
  'Install from source switch front panel to overhead panel.'
from public.riv_data_centers dc
join public.riv_devices d1 on d1.name = 'CORE-SW-01'
join public.riv_device_ports p1 on p1.device_id = d1.id and p1.port_name = 'Eth5'
where dc.code = 'DEMODC01';


insert into public.riv_cable_segments (
  data_center_id,
  from_port_id,
  to_port_id,
  from_label,
  to_label,
  cable_type,
  cable_length_m,
  connector_type,
  cable_label,
  status,
  technician_note
)
select
  dc.id,
  null,
  p2.id,
  'OH-B08 Port 09',
  'SRV-APP-01 NIC1 / Rack R42 RU19',
  'LC-LC MM Fiber patch',
  1,
  'LC-LC / SFP+ SR',
  'OH-B08-09_to_R42-SRVAPP-NIC1',
  'planned',
  'Patch to server NIC1. Confirm link LED and speed after connection.'
from public.riv_data_centers dc
join public.riv_devices d2 on d2.name = 'SRV-APP-01'
join public.riv_device_ports p2 on p2.device_id = d2.id and p2.port_name = 'NIC1'
where dc.code = 'DEMODC01';


-- ============================================================
-- INITIAL CONNECTIVITY PATH
-- ============================================================

insert into public.riv_connectivity_paths (
  data_center_id,
  name,
  source_port_id,
  destination_port_id,
  service_type,
  speed,
  vlan,
  status,
  validation_score,
  description
)
select
  dc.id,
  'CORE-SW-01 Eth5 → SRV-APP-01 NIC1',
  p1.id,
  p2.id,
  'Application Access',
  '10 Gbps',
  '120',
  'operational',
  96,
  'Demo application server access path with real device visual support.'
from public.riv_data_centers dc
join public.riv_devices d1 on d1.name = 'CORE-SW-01'
join public.riv_device_ports p1 on p1.device_id = d1.id and p1.port_name = 'Eth5'
join public.riv_devices d2 on d2.name = 'SRV-APP-01'
join public.riv_device_ports p2 on p2.device_id = d2.id and p2.port_name = 'NIC1'
where dc.code = 'DEMODC01';


-- ============================================================
-- INITIAL SMART HANDS TASK
-- ============================================================

insert into public.riv_smart_hands_tasks (
  data_center_id,
  connectivity_path_id,
  title,
  ticket_ref,
  priority,
  task_type,
  status,
  source_summary,
  destination_summary,
  dispatch_note
)
select
  dc.id,
  cp.id,
  'Patch CORE-SW-01 Eth5 to SRV-APP-01 NIC1',
  'RIV-PILOT-1001',
  'normal',
  'new_patch_validation',
  'ready',
  'CORE-SW-01 Eth5 / Rack R42 RU39',
  'SRV-APP-01 NIC1 / Rack R42 RU19',
  'Task is ready for execution. Capture source, destination and link LED evidence.'
from public.riv_data_centers dc
join public.riv_connectivity_paths cp on cp.name = 'CORE-SW-01 Eth5 → SRV-APP-01 NIC1'
where dc.code = 'DEMODC01';


insert into public.riv_smart_hands_steps (
  smart_hands_task_id,
  step_order,
  title,
  instruction,
  expected_result
)
select
  t.id,
  gs.step_order,
  case gs.step_order
    when 1 then 'Confirm work order and safety scope'
    when 2 then 'Verify source rack and source port'
    when 3 then 'Install source cable run'
    when 4 then 'Validate intermediate path'
    when 5 then 'Patch destination endpoint'
    when 6 then 'Confirm link and capture evidence'
  end,
  case gs.step_order
    when 1 then 'Review ticket, source/destination endpoints, change window and cable list before touching equipment.'
    when 2 then 'Go to Rack R42, locate CORE-SW-01 at RU39-38 and identify Eth5.'
    when 3 then 'Patch CORE-SW-01 Eth5 to OH-A12 Port 05 using LC-LC MM Fiber patch, 3m.'
    when 4 then 'Follow the approved runs through OH-A12, MDF-A, BB-01 and OH-B08.'
    when 5 then 'Patch OH-B08 Port 09 to SRV-APP-01 NIC1 using LC-LC MM Fiber patch, 1m.'
    when 6 then 'Confirm link LED / interface status and capture evidence.'
  end,
  case gs.step_order
    when 1 then 'Technician confirms scope.'
    when 2 then 'Source port is physically identified.'
    when 3 then 'Cable label is applied.'
    when 4 then 'Intermediate labels are confirmed.'
    when 5 then 'Destination is patched and label is visible.'
    when 6 then 'Link is active and evidence captured.'
  end
from public.riv_smart_hands_tasks t
cross join generate_series(1, 6) as gs(step_order)
where t.ticket_ref = 'RIV-PILOT-1001'
on conflict do nothing;


insert into public.riv_smart_hands_evidence_requirements (
  smart_hands_task_id,
  evidence_order,
  title,
  description,
  evidence_type,
  required
)
select
  t.id,
  gs.evidence_order,
  case gs.evidence_order
    when 1 then 'Source Port Photo'
    when 2 then 'Destination Port Photo'
    when 3 then 'Link Validation'
  end,
  case gs.evidence_order
    when 1 then 'Capture CORE-SW-01 Eth5 with visible label and cable connected.'
    when 2 then 'Capture SRV-APP-01 NIC1 with visible label and cable connected.'
    when 3 then 'Capture link LED or interface status confirmation after patching.'
  end,
  'photo',
  true
from public.riv_smart_hands_tasks t
cross join generate_series(1, 3) as gs(evidence_order)
where t.ticket_ref = 'RIV-PILOT-1001'
on conflict do nothing;


-- ============================================================
-- VERIFICATION QUERIES
-- Run these manually after schema creation if needed:
--
-- select * from public.riv_device_assets;
-- select * from public.riv_devices;
-- select * from public.riv_device_asset_ports;
-- select * from public.riv_device_ports;
-- select * from public.riv_connectivity_paths;
-- select * from public.riv_smart_hands_tasks;
-- ============================================================