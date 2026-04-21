# How WorldWatch Works

WorldWatch runs a recurring public-source monitoring cycle.

## Inputs

Signals are ingested from open datasets (ACLED, GDELT, IMF PortWatch, EIA, UNHCR, NASA FIRMS).

## Processing

1. Normalize source records into regional signal formats.
2. Compute region scores and status bands.
3. Track deltas across snapshots.
4. Publish analyst and civilian-facing read-only views.

## Surfaces

- `/` (civilian in `public_read_only` posture)
- `/analyst` (table-first investigation workflow)
- `/ops` (pipeline/runtime visibility)

## Guardrails

- Public-source data only.
- Civilian awareness and lawful analysis only.
- Explicit freshness/confidence/evidence labeling to reduce overclaiming.
