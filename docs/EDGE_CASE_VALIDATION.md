# EDGE_CASE_VALIDATION

## Scope covered
- Fresh-vs-stale evidence behavior under uneven coverage and single-source freshness spikes.
- Confidence/severity mismatch scenarios (high severity + low confidence, moderate severity + high confidence).
- Disagreement integrity (directional conflict, stale-vs-fresh conflict, reliability-weighted disagreement tags).
- Domain odd cases: chokepoint conflict patterns, thermal-only spikes, displacement-limited support, and narrative-led spikes with flat physical/logistical domains.

## What passed
- Freshness logic remains domain-aware and resists one-source freshness domination in both cross-domain and single-domain coverage tests.
- Confidence remains independent from score severity; high score can still be low confidence under disagreement.
- Evidence-state behavior remains conservative for single-source spikes and narrow-domain support (stays `incomplete` where warranted).
- Explainability groupings correctly preserve stale high-impact sources and source disagreement metadata.
- Explainability summary copy remains aligned with payload conditions for freshness/confidence/evidence in mixed and stale scenarios.

## Still weak / heuristic
- Mixed-signal interpretation is still phrase-based and depends on first disagreement cluster ordering in evidence copy.
- Narrative-led spikes with flat physical/logistical inputs are visible, but no dedicated "narrative-leading" marker exists yet.
- Domain granularity is still coarse (`narrativeHeat`, `chokepointStress`, etc.); richer sub-domain labels could improve analyst adjudication speed.

## Follow-up priorities
1. Add a tiny reusable region-scenario fixture helper for scoring/explainability edge cases to reduce test duplication.
2. Add explicit explainability flag for narrative-vs-physical divergence to speed analyst trust checks.
3. Consider deterministic ordering guarantees for disagreement clusters in summary text when multiple domains disagree.
