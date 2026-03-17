# ANALYST_UX_VALIDATION

A lightweight internal checklist for analyst-facing detail panel changes. Keep this short, deterministic, and repeatable.

## Quick pass checklist (10–15 minutes)

For at least 3 representative snapshots (normal, disagreement-heavy, stale-heavy):

- **First-scan usefulness in Focus Mode**
  - Can an analyst answer “should I escalate?” in under 60 seconds from the first visible stack?
  - Confirm scan path is visible in one pass: escalation posture → freshness/confidence/evidence → divergence cue (when active) → disagreement summary → stale high-impact sources → snapshot compare summary.
  - Confirm deep-detail sections remain collapsed by default in Focus Mode.

- **Compare readability (“what changed?”)**
  - Can analyst identify composite delta, status/confidence/freshness/evidence changes, and sub-score deltas without reading prose?
  - Confirm disagreement-change and divergence-change flags are obvious and deterministic.
  - Confirm compare remains table/card based (no opaque narrative summaries).

- **Pinned-section usefulness vs clutter**
  - Empty pinned state clearly explains what to do next.
  - Pin/unpin behavior is obvious and stable; pinned sections do not confusingly duplicate original sections.
  - Pin persistence survives region changes and refreshes (`worldwatch.analyst.pins`).

- **Escalation judgment confidence + speed**
  - Analyst can deterministically answer both:
    - “what changed?” from compare,
    - “should I escalate?” from posture/trust/disagreement/staleness cues.
  - Posture and policy visibility remain present after layout and mode toggles.

## Validation scenarios (fixture-backed)

Use these canonical fixture scenarios for spot checks:

1. `highSeverityLowConfidenceScenario` → ensure **investigate carefully** posture.
2. `narrativeLedSpikeFlatPhysicalScenario` → ensure **narrative-leading caution** posture and active divergence cue.
3. `mixedMultiDomainDisagreementScenario` → ensure disagreement ordering and mixed-signal scan clarity.
4. `freshVsStaleUnevenCoverageScenario` or `singleSourceSpikeVsBroaderStaleSupportScenario` → ensure stale high-impact evidence is obvious.

## Command hints

- `npm test -- src/api/analystPayload.test.ts`
- `npm test -- src/console/renderAnalystConsole.test.ts`

## Sprint addendum: compare/pinning/map polish checks

Run these after any detail-panel UX change touching compare, pins, or map sync:

- **Compare first-scan readability**
  - Verify compact state-change strip and trust-cue strip are visible above compare tables/cards and remain deterministic.
  - Confirm top compare cards answer in <10 seconds: what changed, trust direction (improved/degraded/flat), disagreement appeared/disappeared, narrative-leading divergence activated/deactivated.
  - Confirm compare remains deterministic: grouped cards/tables (score+state, trust cues, sub-score deltas, factor changes) with no black-box prose summary.

- **Pinned sections usefulness vs clutter**
  - Empty state should explain why to pin and suggest likely sections (compare/disagreement/stale evidence).
  - Pinned source section should be de-emphasized/annotated in original location, not duplicated in full.
  - Verify pin/unpin controls remain consistent in both original and pinned cards.

- **Map usefulness for faster region selection**
  - Verify active region treatment is unmistakable and remains stable after hover transitions.
  - Verify click-to-lock selection on map keeps active region sync with table/detail selection.
  - Confirm table-origin region switches immediately update map active state.
  - Tooltip should answer “is this worth clicking?” with compact deterministic fields only (region, composite score, status band, confidence band, Δ24h, freshness/evidence cue).
  - Confirm tooltip remains compact and does not duplicate detail-panel depth.

- **Focus Mode speed check (including map-origin selection)**
  - Reconfirm Focus Mode still supports a <60 second trust read for at least 3 fixture scenarios when the selected region originated from map click.

