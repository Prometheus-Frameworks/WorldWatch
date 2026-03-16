# SCORING_PHILOSOPHY

## Severity vs confidence
- **Severity** is represented by composite score + status band (`low`, `elevated`, `high`, `critical`).
- **Confidence** is separate (`low`, `medium`, `high`) and depends on signal reliability/coverage/alignment.
- High severity does **not** imply high confidence; the model preserves this split to force analyst judgment.

## Freshness vs evidence state
- **Freshness state** (`fresh`, `aging`, `stale`) reflects recency and domain coverage.
- **Evidence state** (`confirmed`, `mixed`, `incomplete`, `unknown`) reflects whether reliable sources align or disagree.
- A region can be high severity but stale/incomplete; this is surfaced directly as a triage concern, not hidden.

## Deterministic explainability
- Scoring and explainability are config-driven and deterministic, not narrative generation.
- Detail view derives repeatable summaries from explicit thresholds (fresh windows, contribution floors, reliability floors/spread).
- Same input rows yield the same explainability states and triage notes.

## Multi-source disagreement handling
- System explicitly groups disagreement by domain and source.
- It distinguishes directional disagreement, stale-vs-fresh conflicts, and reliability-weighted disagreements.
- Mixed-signal domains are shown as first-class output, not collapsed away.

## What WorldWatch avoids
- **Prediction theater**: no speculative certainty when evidence is stale or conflicting.
- **Black-box narrative**: no opaque scoring without factor-level provenance.
- **Military posture**: product posture remains civilian, public-source monitoring and analysis only.
