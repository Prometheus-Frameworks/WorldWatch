# LAMAR_HANDOFF

## Project identity
WorldWatch is an internal analyst + ops system for deterministic, explainable, civilian public-source geopolitical monitoring.

## Current architectural priorities
1. Preserve deterministic ingestion -> scoring -> analyst/ops delivery path.
2. Keep table/detail triage workflow primary.
3. Improve detail scanability without weakening provenance/explainability.
4. Keep posture/policy constraints explicit and enforced.

## Rules to avoid drift
- Do not reframe the product as military, predictive targeting, or black-box intelligence.
- Do not replace deterministic explainability with generated narrative-only outputs.
- Do not let map UX displace table/detail as primary workflow.
- Do not introduce behavior that violates `public_read_only` manual-cycle restrictions.

## Preferred task style
- Small, auditable increments.
- Preserve or add tests for scoring, payload shaping, and posture gates.
- Update repo-memory docs when architecture/workflow behavior changes.
- Favor explicit contracts and thresholded logic over implicit heuristics.

## Anti-patterns to avoid
- Marketing-heavy reframing detached from actual runtime behavior.
- Large UI rewrites without triage usability validation.
- Feature proposals that invent unsupported data sources or pipeline capabilities.
