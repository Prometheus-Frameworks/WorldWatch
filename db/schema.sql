CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TYPE region_type AS ENUM ('state', 'cluster', 'chokepoint', 'maritime');
CREATE TYPE status_band AS ENUM ('low', 'elevated', 'high', 'critical');
CREATE TYPE confidence_band AS ENUM ('low', 'medium', 'high');
CREATE TYPE freshness_state AS ENUM ('fresh', 'aging', 'stale');
CREATE TYPE evidence_state AS ENUM ('confirmed', 'mixed', 'incomplete', 'unknown');
CREATE TYPE job_run_type AS ENUM ('source', 'snapshot', 'cycle');
CREATE TYPE job_run_status AS ENUM ('success', 'partial', 'failed');

CREATE TABLE regions (
  id BIGSERIAL PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  type region_type NOT NULL,
  geometry GEOGRAPHY(GEOMETRY, 4326) NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX regions_geometry_gix ON regions USING GIST (geometry);

CREATE TABLE data_sources (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  freshness_minutes INTEGER NOT NULL CHECK (freshness_minutes > 0),
  reliability_weight NUMERIC(4,3) NOT NULL CHECK (reliability_weight >= 0 AND reliability_weight <= 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE raw_events (
  id BIGSERIAL PRIMARY KEY,
  source_id BIGINT NOT NULL REFERENCES data_sources(id),
  external_id TEXT NOT NULL,
  payload_json JSONB NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL,
  event_time TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(source_id, external_id)
);

CREATE INDEX raw_events_source_event_time_idx ON raw_events (source_id, event_time DESC);
CREATE INDEX raw_events_fetched_at_idx ON raw_events (fetched_at DESC);

CREATE TABLE normalized_signals (
  id BIGSERIAL PRIMARY KEY,
  region_id BIGINT NOT NULL REFERENCES regions(id),
  source_id BIGINT NOT NULL REFERENCES data_sources(id),
  signal_type TEXT NOT NULL,
  value NUMERIC(12,4) NOT NULL,
  unit TEXT,
  event_time TIMESTAMPTZ NOT NULL,
  ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX normalized_signals_region_time_idx ON normalized_signals (region_id, event_time DESC);
CREATE INDEX normalized_signals_source_type_time_idx ON normalized_signals (source_id, signal_type, event_time DESC);
CREATE UNIQUE INDEX normalized_signals_dedupe_idx
  ON normalized_signals (region_id, source_id, signal_type, event_time);

CREATE TABLE region_scores (
  id BIGSERIAL PRIMARY KEY,
  region_id BIGINT NOT NULL REFERENCES regions(id),
  snapshot_time TIMESTAMPTZ NOT NULL,
  composite_score NUMERIC(5,2) NOT NULL CHECK (composite_score >= 0 AND composite_score <= 100),
  conflict_score NUMERIC(5,2) NOT NULL CHECK (conflict_score >= 0 AND conflict_score <= 100),
  oil_score NUMERIC(5,2) NOT NULL CHECK (oil_score >= 0 AND oil_score <= 100),
  chokepoint_score NUMERIC(5,2) NOT NULL CHECK (chokepoint_score >= 0 AND chokepoint_score <= 100),
  displacement_score NUMERIC(5,2) NOT NULL CHECK (displacement_score >= 0 AND displacement_score <= 100),
  narrative_score NUMERIC(5,2) NOT NULL CHECK (narrative_score >= 0 AND narrative_score <= 100),
  status_band status_band NOT NULL,
  confidence_band confidence_band NOT NULL,
  evidence_state evidence_state NOT NULL,
  freshness_state freshness_state NOT NULL,
  factors_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  second_order_effects_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(region_id, snapshot_time)
);

CREATE INDEX region_scores_region_snapshot_idx ON region_scores (region_id, snapshot_time DESC);
CREATE INDEX region_scores_snapshot_idx ON region_scores (snapshot_time DESC);

CREATE TABLE region_deltas (
  id BIGSERIAL PRIMARY KEY,
  region_id BIGINT NOT NULL REFERENCES regions(id),
  snapshot_time TIMESTAMPTZ NOT NULL,
  delta_24h NUMERIC(6,2) NOT NULL,
  delta_7d NUMERIC(6,2) NOT NULL,
  rank_movement INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(region_id, snapshot_time)
);

CREATE INDEX region_deltas_snapshot_rank_idx ON region_deltas (snapshot_time DESC, rank_movement ASC);

CREATE TABLE alerts_feed (
  id BIGSERIAL PRIMARY KEY,
  region_id BIGINT NOT NULL REFERENCES regions(id),
  snapshot_time TIMESTAMPTZ NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  severity status_band NOT NULL,
  explanation_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX alerts_feed_snapshot_idx ON alerts_feed (snapshot_time DESC);
CREATE INDEX alerts_feed_region_snapshot_idx ON alerts_feed (region_id, snapshot_time DESC);

CREATE TABLE job_runs (
  id BIGSERIAL PRIMARY KEY,
  job_name TEXT NOT NULL,
  job_type job_run_type NOT NULL,
  status job_run_status NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  finished_at TIMESTAMPTZ NOT NULL,
  duration_ms BIGINT NOT NULL CHECK (duration_ms >= 0),
  records_processed INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX job_runs_job_type_started_idx ON job_runs (job_type, started_at DESC);
CREATE INDEX job_runs_job_name_started_idx ON job_runs (job_name, started_at DESC);
