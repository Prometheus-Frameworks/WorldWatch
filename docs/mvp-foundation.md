# WorldWatch MVP Foundation (Phase 0 + Scoring Contract)

This repository now includes the minimum foundation to unblock ingestion and API work:

- Postgres/PostGIS schema for region-aware ingestion, normalized signals, scoring snapshots, and change feed output.
- Seed file with 12 initial regions/chokepoints from the MVP scope.
- Deterministic score contract in TypeScript with config-driven composite weights.
- Confidence, evidence, and freshness derivation helpers separated from severity.

## Why this order

Per product direction, the schema and scoring contract are built first to prevent UI-first drift.
This defines what every downstream service (ingestion workers, API handlers, frontend cards) can trust.

## Included artifacts

- `db/schema.sql` — core tables and enums.
- `db/seeds/001_regions.sql` — initial tracked geography.
- `src/shared/scoring/*` — scoring contract, config, and deterministic calculations.

## Current scoring behavior

- Composite score is 0-100, weighted by configuration.
- Status band is derived from composite score thresholds.
- Confidence band is derived from reliability + multi-source directional alignment.
- Freshness is derived from signal recency windows.
- Evidence state resolves to `confirmed`, `mixed`, `incomplete`, or `unknown`.

## Next implementation step

Build source adapters and normalized mapping jobs:
1. ACLED adapter
2. GDELT adapter
3. IMF PortWatch adapter
4. EIA adapter

Then persist normalized signals and run scheduled snapshot scoring.
