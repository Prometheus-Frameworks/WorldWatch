# ANALYST_UX_VALIDATION

A lightweight internal checklist for analyst-facing detail panel changes. Keep this short, deterministic, and repeatable.

## Quick pass checklist (10–15 minutes)

For at least 3 representative snapshots (normal, disagreement-heavy, stale-heavy):

- **Speed to interpret detail panel**
  - Can an analyst state escalation posture and trust status in under 60 seconds?
  - Confirm first scan path: escalation posture → freshness/confidence/evidence → mixed disagreement → stale high-impact evidence.

- **Misread risk: stale + high-risk**
  - If status is high/critical while freshness is aging/stale, does the panel clearly signal verification before escalation?
  - Check that stale high-impact count and rows are visible without scrolling deep into raw signals.

- **Mixed-signal disagreement clarity**
  - Can analyst identify disagreement domains and the strongest source split (direction + reliability) in one pass?
  - Verify disagreement group ordering is deterministic and stable across refreshes.

- **Narrative-vs-physical divergence clarity**
  - If active, confirm cue appears with explicit caution framing.
  - Confirm cue is absent when physical domains are rising.

- **Escalation judgment confidence**
  - Analyst should be able to choose one deterministic posture:
    - high severity, low confidence → investigate carefully,
    - high severity, high confidence → strong attention signal,
    - narrative-leading without physical confirmation → caution,
    - otherwise routine monitoring.

## Validation scenarios (fixture-backed)

Use these canonical fixture scenarios for spot checks:

1. `highSeverityLowConfidenceScenario` → ensure **investigate carefully** posture.
2. `narrativeLedSpikeFlatPhysicalScenario` → ensure **narrative-leading caution** posture and active divergence cue.
3. `mixedMultiDomainDisagreementScenario` → ensure disagreement ordering and mixed-signal scan clarity.
4. `freshVsStaleUnevenCoverageScenario` or `singleSourceSpikeVsBroaderStaleSupportScenario` → ensure stale high-impact evidence is obvious.

## Command hints

- `npm test -- src/api/analystPayload.test.ts`
- `npm test -- src/console/renderAnalystConsole.test.ts`


## PR27 focus + compare acceptance updates
- Region detail now defaults to **Focus mode** with first-scan stack: escalation posture, state cards, narrative-vs-physical cue (when active), disagreement summary, and stale high-impact sources.
- Full detail remains available via mode toggle and analyst-specific section pinning (`worldwatch.analyst.pins`).
- Snapshot compare supports deterministic **Latest vs Previous** (default) and **Latest vs 24h-ago** when history permits, with explicit score/sub-score/factor/disagreement/divergence deltas.
- Scan-order reinforcement copy is visible in focus mode: `Escalation → States → Disagreement → Stale high-impact → (expand sections as needed)`.
