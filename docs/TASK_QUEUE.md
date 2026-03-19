# TASK_QUEUE

## Now
- Execute the first internal Railway launch using the explicit web/scheduler split.
- Verify DB-backed readiness behavior and failure messaging in a Railway-like environment.
- Keep repo-memory docs aligned with the actual shipped system after each merged hardening pass.

## Next
- Run the Railway first-launch verification checklist end to end against a fresh internal deployment.
- Expand tests only where they improve deploy-safety signal: readiness, env validation, posture visibility, and role separation.
- Watch for any operator confusion between one-off cycle execution, recurring scheduler execution, and the web service.

## Later
- Add small internal-only runbook refinements if the first Railway launch reveals ambiguity.
- Expand fixture coverage for mixed source-degradation vs true region-risk scenarios.
- Consider lightweight scheduler alerting only after launch behavior is stable.

## Not now
- Public marketing-facing UI.
- Auth or broader access-control work.
- Scoring/explainability changes, non-deterministic narratives, or deployment over-engineering.

## Completed
- [x] Operational guardrails / source degradation pass is canonical in analyst + ops surfaces.
- [x] Release-readiness checklist covers Focus Mode, pinned sections, compare, posture/policy visibility, and degraded-source workflows.
- [x] Railway deployment prep documents the two-service app split and internal-first launch posture.
- [x] Startup/readiness hardening now fails early on missing/invalid DB wiring and documents first-launch verification.
