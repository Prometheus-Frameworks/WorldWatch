# EDGE_CASE_VALIDATION

## Scope covered
- Fresh-vs-stale evidence behavior under uneven coverage and single-source freshness spikes.
- Confidence/severity mismatch scenarios (high severity + low confidence, moderate severity + high confidence).
- Disagreement integrity (directional conflict, stale-vs-fresh conflict, reliability-weighted disagreement tags).
- Domain odd cases: chokepoint conflict patterns, thermal-only spikes, displacement-limited support, and narrative-led spikes with flat physical/logistical domains.
- Reusable region scenario fixtures for scoring and explainability tests.

## What passed
- Freshness logic remains domain-aware and resists one-source freshness domination in both cross-domain and single-domain coverage tests.
- Confidence remains independent from score severity; high score can still be low confidence under disagreement.
- Evidence-state behavior remains conservative for single-source spikes and narrow-domain support (stays `incomplete` where warranted).
- Explainability groupings correctly preserve stale high-impact sources, source disagreement metadata, and deterministic disagreement ordering.
- Explainability payload now includes an explicit narrative-leading divergence cue when narrative rises without matching physical/logistical confirmation.

## Hardened in this pass
- Added tiny reusable region scenario fixtures under `src/test/regionScenarioFixtures.ts` and reused them in scoring/explainability tests.
- Added deterministic `narrative_physical_divergence` payload section with rule-based domain-state inspection.
- Tightened disagreement ordering to a deterministic rule: reliability first, then normalized contribution, then recency, then domain/source tie-breakers.

## Remaining constraints
- Domain labels are still coarse (`narrativeHeat`, `chokepointStress`, etc.) and intentionally simple.
- Explainability copy remains deterministic and intentionally concise rather than narrative-rich.

## Next likely focus
1. Add analyst-oriented validation checks for false-positive/false-negative trust-cue rates under replayed historical snapshots.
2. Expand fixture catalog only when new deterministic explainability rules are added.
3. Keep deterministic copy stable and avoid introducing generated or black-box narrative text.
