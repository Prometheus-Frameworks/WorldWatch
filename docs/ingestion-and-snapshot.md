# Ingestion + Snapshot Runtime (Current)

This doc reflects the current canonical ingestion/scoring pipeline used by the analyst dashboard and ops console.

## Source coverage

`db/seeds/002_data_sources.sql` and `src/jobs/sourceRunners/` cover:

- ACLED
- GDELT
- IMF PortWatch
- EIA
- UNHCR
- NASA FIRMS

Each source runner fetches public-source data, maps events/signals to tracked regions, and writes normalized data for scoring.

## Pipeline shape

1. Source runners fetch and normalize records.
2. Raw payloads persist to `raw_events`.
3. Normalized metrics persist to `normalized_signals`.
4. Snapshot job computes per-region scores/deltas and alert feed entries.
5. Analyst endpoints read latest snapshots/history.

## Runtime entrypoints

- `src/scripts/runCycle.ts` — one full world-state cycle.
- `src/scripts/runScheduler.ts` — recurring scheduler loop.
- `src/scripts/startApi.ts` — API + analyst/ops surfaces.

## Scoring snapshot output

`src/jobs/scoringSnapshot/runScoringSnapshotJob.ts` writes:

- `region_scores`
- `region_deltas`
- `alerts_feed`

The scoring contract remains deterministic and config-driven (`src/shared/scoring/*`, `src/jobs/scoringSnapshot/config.ts`).

## Civilian-use boundary

WorldWatch is positioned as an internal, civilian public-source monitoring and analysis system. It is not a military targeting or covert surveillance product.
