# ARCHITECTURE

## 1) Service split
- **Web service** (`npm run deploy:web` / `npm run web:start`): analyst dashboard, ops console, policy/about surface, and JSON API only.
- **Scheduler service** (`npm run deploy:scheduler` / `npm run scheduler:start`): recurring cycle execution only.
- **Shared dependency**: both services require the same Postgres `DATABASE_URL` and canonical source endpoint configuration.

## 2) Boot + readiness contract
1. Runtime config is loaded and validated.
2. Required env failures stop boot immediately with a role-specific error.
3. Postgres pool is created and probed with `SELECT 1` before the service is considered started.
4. Web begins listening only after DB connectivity succeeds.
5. `/healthz` returns `200` only when the web service can still complete its deterministic DB readiness probe; otherwise it returns `503`.

## 3) Source ingestion flow
1. Scheduler or manual ops trigger starts `runWorldWatchCycle`.
2. Source jobs run sequentially for ACLED, GDELT, IMF PortWatch, EIA, UNHCR, and NASA FIRMS.
3. Each runner fetches upstream JSON, maps events/signals to tracked regions, and persists results.

## 4) Normalization
- Raw source payloads are persisted to `raw_events`.
- Region-mapped normalized metrics are written to `normalized_signals`.
- Adapters in `src/ingestion/adapters/*` standardize source-specific schemas before scoring.

## 5) Scoring snapshot pipeline
- Snapshot job runs when at least one source job succeeds.
- It uses config-driven normalization and deterministic weights.
- Outputs remain `region_scores`, `region_deltas`, and `alerts_feed` with canonical scoring semantics unchanged.

## 6) Analyst surface
- Primary analyst surface: `GET /` (also `/analyst`).
- Preferred bootstrap payload: `GET /api/analyst/dashboard`.
- Canonical interaction model: table/detail first, Focus Mode by default, pinned sections, deterministic explainability, compare, and optional internal map support.

## 7) Ops surface
- Ops surface: `GET /ops`.
- Key endpoints: `/api/ops/health`, `/api/ops/summary`, cycle history, source run history, source freshness, failures, and posture-gated manual cycle trigger.
- Operational guardrails expose source degradation drift without changing score math.

## 8) Posture + policy layer
- Deployment posture resolves to `internal`, `invite_only`, or `public_read_only`.
- Policy/about surface remains explicit about civilian/public-source use.
- `public_read_only` continues to block manual cycle execution.
