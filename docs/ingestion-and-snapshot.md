# Ingestion + Scoring Snapshot Implementation

This phase adds four ingestion adapters and a scoring snapshot job while keeping schema/scoring contracts canonical.

## Seeded sources

`db/seeds/002_data_sources.sql` seeds canonical source metadata:

- `acled`
- `gdelt`
- `imf-portwatch`
- `eia`

## Normalized signal contract

`src/shared/signals/types.ts` defines normalized signal types and domains:

- conflict: fatalities, event intensity, tension
- narrative: mentions, negative tone
- chokepoint: congestion, delay hours, transit volume stress proxy
- oil: price, price volatility

These types are persisted to `normalized_signals.signal_type`.

## Region mapping layer

`src/ingestion/regionMapper.ts` resolves regions by:

1. manual chokepoint overrides (human-readable hint -> canonical region slug), then
2. PostGIS spatial intersection (`ST_Intersects`) for region geometry, then
3. optional region slug/name hint fallback.

## Adapters

- `acledAdapter.ts`
- `gdeltAdapter.ts`
- `imfPortWatchAdapter.ts`
- `eiaAdapter.ts`

Each adapter follows the same persistence contract:

1. persist source payload into `raw_events`
2. resolve one-or-many region ids
3. emit normalized signals into `normalized_signals`

## Snapshot scoring job

`src/jobs/scoringSnapshot/runScoringSnapshotJob.ts` computes per-region snapshots and writes:

- `region_scores`
- `region_deltas`
- `alerts_feed`

All normalization caps, per-subscore signal weights, lookback windows, and alert thresholds are in
`src/jobs/scoringSnapshot/config.ts`.
