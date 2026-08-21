-- Phase 1 kernel. Source content is append-only; source_versions records upstream revisions.
create extension if not exists pgcrypto;

create type source_tier as enum ('PRIMARY','AUTHORITATIVE_SECONDARY','SECONDARY','DISCOVERY_ONLY');
create type parse_status as enum ('PENDING','PARSED','FAILED','UNSUPPORTED');
create type entity_type as enum ('COMPANY','PRODUCT','TECHNOLOGY','INDUSTRY','THEME','PERSON','ORGANIZATION','GOVERNMENT_AGENCY','GEOGRAPHY','EVENT');
create type claim_type as enum ('FACT','MANAGEMENT_CLAIM','ESTIMATE','INFERENCE','HYPOTHESIS_STATEMENT','OPINION');
create type claim_status as enum ('CANDIDATE','SUPPORTED','WEAKLY_SUPPORTED','CONFLICTED','INSUFFICIENT_EVIDENCE','REJECTED','STALE');
create type evidence_direction as enum ('SUPPORTS','CONTRADICTS','CONTEXT','NEUTRAL');
create type question_status as enum ('OPEN','INVESTIGATING','PARTIALLY_ANSWERED','ANSWERED','UNRESOLVED','UNKNOWABLE','ARCHIVED');

create table entities (
  id uuid primary key default gen_random_uuid(), type entity_type not null, name text not null,
  aliases text[] not null default '{}', metadata jsonb not null default '{}', created_at timestamptz not null default now()
);
create table companies (
  id uuid primary key references entities(id), legal_name text not null, common_name text,
  ticker text, exchange text, cik text unique, website text, investor_relations_url text, status text not null default 'ACTIVE'
);
create table sources (
  id uuid primary key default gen_random_uuid(), provider_id text not null, provider_external_id text,
  source_type text not null, tier source_tier not null, title text, canonical_url text,
  company_id uuid references entities(id), entity_ids uuid[] not null default '{}', published_at timestamptz,
  retrieved_at timestamptz not null, raw_storage_location text, normalized_text text,
  checksum text not null, metadata jsonb not null default '{}', parse_status parse_status not null,
  created_at timestamptz not null default now(), unique(provider_id, checksum)
);
create table source_versions (
  source_id uuid not null references sources(id), successor_source_id uuid not null references sources(id),
  detected_at timestamptz not null default now(), primary key(source_id, successor_source_id)
);
create table research_runs (
  id uuid primary key default gen_random_uuid(), workflow text not null, status text not null,
  input jsonb not null default '{}', output jsonb, started_at timestamptz not null default now(), completed_at timestamptz
);
create table observations (
  id uuid primary key default gen_random_uuid(), source_id uuid not null references sources(id), text text not null,
  source_locator jsonb, entity_ids uuid[] not null default '{}', observed_at timestamptz,
  extraction_run_id uuid references research_runs(id), extraction_confidence numeric check (extraction_confidence between 0 and 1),
  created_at timestamptz not null default now()
);
create table claims (
  id uuid primary key default gen_random_uuid(), text text not null, type claim_type not null, status claim_status not null,
  entity_ids uuid[] not null default '{}', theme_ids uuid[] not null default '{}', valid_from timestamptz, valid_until timestamptz,
  confidence numeric check (confidence between 0 and 1), created_by text not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table evidence (
  id uuid primary key default gen_random_uuid(), claim_id uuid not null references claims(id), observation_id uuid references observations(id),
  source_id uuid not null references sources(id), direction evidence_direction not null, strength numeric check (strength between 0 and 1),
  rationale text, created_at timestamptz not null default now(), check (observation_id is not null or source_id is not null)
);
create table research_questions (
  id uuid primary key default gen_random_uuid(), question text not null, status question_status not null default 'OPEN',
  importance numeric not null check (importance between 0 and 1), uncertainty numeric not null check (uncertainty between 0 and 1),
  thesis_impact numeric not null check (thesis_impact between 0 and 1), parent_question_id uuid references research_questions(id),
  entity_ids uuid[] not null default '{}', required_evidence jsonb, current_answer text, answer_confidence numeric check (answer_confidence between 0 and 1),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), resolved_at timestamptz
);
create table research_run_steps (
  id uuid primary key default gen_random_uuid(), run_id uuid not null references research_runs(id), step text not null,
  status text not null, input jsonb not null default '{}', output jsonb, error text, started_at timestamptz not null default now(), completed_at timestamptz
);
create index sources_company_id_idx on sources(company_id);
create index observations_source_id_idx on observations(source_id);
create index evidence_claim_id_idx on evidence(claim_id);
create index research_questions_parent_idx on research_questions(parent_question_id);
