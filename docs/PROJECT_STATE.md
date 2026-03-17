# PROJECT_STATE

## Current major subsystems
- **Backend API + HTML surfaces**: single Node HTTP server (`src/api/server.ts`) serving analyst (`/`), ops (`/ops`), and policy/about (`/about`) surfaces plus analyst/ops JSON endpoints.
- **Ingestion + normalization**: source runners and adapters ingest ACLED, GDELT, IMF PortWatch, EIA, UNHCR, and NASA FIRMS data into raw and normalized tables.
- **Scoring snapshot pipeline**: deterministic scoring computes region scores, confidence/freshness/evidence states, deltas, and alert feed outputs.
- **Scheduler/runtime**: recurring scheduler with overlap protection, plus manual cycle execution path (posture-gated).
- **Analyst console**: table-first dashboard with Focus/Full detail modes, pinned sections, snapshot compare summaries, triage notes, explainability groupings, history tables, and optional internal SVG map.
- **Ops console**: cycle health/summary/failures/source freshness visibility plus manual cycle trigger.
- **Posture + policy layer**: deployment posture bannering and explicit civilian/acceptable-use statements across surfaces.

## Production-like vs prototype
### Production-like
- Deterministic ingestion -> scoring -> API flow with test coverage in runtime, API queries/payload shaping, scoring calculator, and snapshot jobs.
- Posture enforcement for `public_read_only` (manual cycle trigger disabled).
- Stable internal analyst + ops workflow powered by consolidated analyst payload (`/api/analyst/dashboard`).
- Explainability disagreement ordering, narrative-leading divergence signaling, and escalation posture cues are deterministic and inspectable.
- Focus Mode defaults + compare readability path are now operational and persistence-backed (detail mode, compare mode, pinning).

### Still prototype / evolving
- Internal map is supporting context, not the primary workflow.
- Source quality handling is deterministic but still dependent on upstream source freshness/availability.
- Detail interpretation remains analyst-dependent under heavy multi-domain disagreement.

## Recently completed sprints (latest)
- Analyst interaction polish/default pass (complete):
  - Tightened Focus Mode first-scan stack and default collapsed deep-detail behavior.
  - Improved compare hierarchy with highlight cards + deterministic change rows for state/flags/sub-scores.
  - Improved pinned-section behavior (clear empty state, stable pin/unpin, no confusing duplicates).
  - Added reset-layout control for persisted analyst preferences.
- Validation + edge-case pressure-test pass landed for freshness, confidence/severity mismatch, disagreement integrity, and domain odd cases in scoring/explainability tests.
- Analyst workflow validation + trust-cue clarity pass landed:
  - lightweight analyst UX validation checklist (`docs/ANALYST_UX_VALIDATION.md`),
  - deterministic escalation posture cue (high-severity/low-confidence vs high-severity/high-confidence vs narrative-leading caution),
  - tightened first-scan ordering/copy for stale high-impact evidence, disagreement groups, and source contribution reliability emphasis.

## Known weak spots
- Detail pane is improved but still cognitively dense in worst-case multi-domain disagreement snapshots.
- Analysts can still over-read narrative-leading spikes if they skip divergence/disagreement cues.
- Freshness degradation still demands operator reruns and explicit analyst verification discipline.

## Immediate next priorities
1. Expand fixture-based interaction checks for region-switch + mode/pin persistence edge cases.
2. Keep compare output compact while retaining deterministic inspectability.
3. Keep posture/policy language and enforcement behavior aligned during future UI/API changes.
