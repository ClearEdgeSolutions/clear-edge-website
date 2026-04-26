-- Run this in Supabase SQL Editor before testing the forms.
-- It keeps the client forms together in leads and partner applications in partners.

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text,
  email text,
  phone text,
  company text,
  service text,
  message text,
  status text not null default 'NEW',
  lead_type text,
  form_source text,
  next_action text,
  button_context text,
  service_address_city text,
  property_type text,
  quote_details jsonb
);

alter table public.leads add column if not exists email text;
alter table public.leads add column if not exists company text;
alter table public.leads add column if not exists lead_type text;
alter table public.leads add column if not exists form_source text;
alter table public.leads add column if not exists next_action text;
alter table public.leads add column if not exists button_context text;
alter table public.leads add column if not exists service_address_city text;
alter table public.leads add column if not exists property_type text;
alter table public.leads add column if not exists quote_details jsonb;

create table if not exists public.partners (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  status text not null default 'NEW',
  type text,
  company_name text,
  full_name text,
  phone text,
  email text,
  provided_services text,
  operation_areas text,
  years_experience text,
  own_supplies text,
  insurance text,
  work_experience text,
  additional_info text,
  form_source text,
  next_action text,
  raw_submission jsonb
);

alter table public.partners add column if not exists form_source text;
alter table public.partners add column if not exists next_action text;
alter table public.partners add column if not exists raw_submission jsonb;
