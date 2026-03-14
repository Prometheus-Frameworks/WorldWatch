# Ingestion + Scoring Snapshot Implementation

This phase adds four ingestion adapters and source runner jobs plus a scoring snapshot job while keeping schema/scoring contracts canonical.

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
3. buffered proximity search (`ST_DWithin`) for near-boundary and maritime events, then
4. optional region slug/name hint fallback.

## Adapters

- `acledAdapter.ts`
- `gdeltAdapter.ts`
- `imfPortWatchAdapter.ts`
- `eiaAdapter.ts`

Each adapter follows the same persistence contract:

1. persist source payload into `raw_events`
2. resolve one-or-many region ids
3. emit normalized signals into `normalized_signals`

`normalized_signals` now has a dedupe key on `(region_id, source_id, signal_type, event_time)` and ingestion uses upsert semantics to keep reruns idempotent.

## Source runner jobs

`src/jobs/sourceRunners/*` adds source-specific runner jobs that:

1. fetch source payloads
2. transform raw records to adapter event contracts
3. ingest through existing adapters

Runner files:

- `runAcledSourceJob.ts`
- `runGdeltSourceJob.ts`
- `runImfPortWatchSourceJob.ts`
- `runEiaSourceJob.ts`

## Snapshot scoring job

`src/jobs/scoringSnapshot/runScoringSnapshotJob.ts` computes per-region snapshots and writes:

- `region_scores`
- `region_deltas`
- `alerts_feed`

Signal selection for scoring now uses the latest signal per signal type inside the lookback window.

All normalization caps, per-subscore signal weights, lookback windows, and alert thresholds are in
`src/jobs/scoringSnapshot/config.ts`.
