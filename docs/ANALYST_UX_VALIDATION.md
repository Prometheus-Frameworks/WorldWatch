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
