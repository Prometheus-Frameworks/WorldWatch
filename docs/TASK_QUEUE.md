# TASK_QUEUE

## Now
- Run analyst UX validation checklist for each detail/compare interaction change.
- Keep Focus Mode first-scan stack concise and visible without regressing trust/posture cues.
- Keep compare deterministic and quickly scannable (composite/state/sub-score/flag deltas).

## Next
- Validate reset-layout affordance and persistence behavior across broader fixture scenarios.
- Reconfirm posture banner/policy visibility after any future detail-layout adjustments.
- Add any missing low-cost tests around region-switch interaction defaults.

## Later
- Add additional operational guardrails/observability around recurring source degradation patterns.
- Continue hardening docs as live repo-memory during each landed sprint.

## Not now
- Public marketing-facing map experience.
- Non-deterministic or opaque scoring narratives.
- Features that imply military/targeting posture or non-civilian use.

## Completed: PR28 Analyst interaction polish + defaults
- [x] Focus Mode first-scan stack tightened and kept as default analyst path.
- [x] Snapshot compare readability improved with deterministic highlights + expanded state-change rows.
- [x] Pinned section empty-state and duplication behavior improved while preserving localStorage persistence.
- [x] Added reset-analyst-layout control for clearing persisted detail/compare/pin preferences.
- [x] Updated analyst UX validation documentation for “what changed?” + “should I escalate?” speed checks.

## Completed: PR29 Compare/pinning/map ergonomics polish
- [x] Grouped snapshot compare into first-scan cards + deterministic table clusters (state/trust/sub-score/factor).
- [x] Added explicit compare answer cards for what changed + trust direction + disagreement/divergence state shifts.
- [x] Tightened pin UX (empty-state clarity, stronger controls, no confusing duplicate full-content rendering).
- [x] Improved map triage ergonomics (clearer active emphasis, richer tooltip cues, preserved map-subordinate workflow).
- [x] Updated analyst UX validation checklist for compare/pinning/map checks and <60-second Focus Mode confirmation.

## Next
- Validate edge-case behavior with many pinned sections and rapid filter/sort region switching.
- Decide whether next increment should prioritize analyst polish (density management), operational guardrails (default resets), or map hardening (geometry edge cases).


## Completed: PR30 Analyst interaction polish pass (compare/pins/map sync)
- [x] Added compact deterministic compare summary strips (state changes + trust-cue changes) above detailed compare groups.
- [x] Improved pin UX clarity (empty/default guidance, stronger pin/unpin labels, explicit de-emphasized original-section behavior).
- [x] Tightened map selection ergonomics (click-to-lock active region, clearer active/hover distinction, triage-oriented tooltip copy).
- [x] Preserved Focus Mode default and existing compare/scoring determinism.


## Completed: PR31 Internal map ergonomics hardening pass
- [x] Strengthened active vs hover map states and tightened map/table/detail selection sync.
- [x] Upgraded tooltip structure to compact deterministic triage cues (score, status, confidence, Δ24h, freshness/evidence).
- [x] Simplified map legend/guidance copy to keep map useful but subordinate to table/detail workflow.
- [x] Preserved Focus Mode, compare, pinning, posture/policy behavior while selection originates from map.

## Next
- Run another fixture-backed validation sweep to decide between operational guardrail work and stop-and-stabilize before further map edge-case hardening.


## Completed: Operational guardrails + recurring source degradation pass
- [x] Added source degradation trend indicators to ops summary (stale-source and source-failure 24h deltas).
- [x] Added deterministic recurring failure/stale pattern detection per source.
- [x] Added analyst-facing region trust cues for source freshness/coverage degradation impact.
- [x] Updated project/session state docs so repository memory reflects this hardening pass.

## Next
- Add alert thresholds for consecutive-failure pattern escalation in scheduler notifications.
- Expand fixture tests for mixed region-risk vs source-quality-degradation scenarios.
