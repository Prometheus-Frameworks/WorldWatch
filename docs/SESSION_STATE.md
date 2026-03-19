# SESSION_STATE

## Latest landed sequence
1. **Operational guardrails / source degradation** landed: deterministic source-trust cues on analyst surfaces plus recurring stale/failure trend telemetry in Ops.
2. **Release-readiness pass** landed: posture/policy visibility, compare/Focus Mode checks, and degraded-source workflow checks were consolidated into a checklist.
3. **Railway deployment readiness** landed: split web vs scheduler deploy roles, internal-first posture guidance, and a minimal Railway runbook were added.
4. **Current hardening pass (this sprint)** tightens repo-memory accuracy, Railway boot clarity, and deterministic startup/readiness behavior.

## Current focus
- Keep the internal Railway launch path boring and deterministic.
- Make web/scheduler roles explicit in code, scripts, and docs.
- Keep health/readiness behavior honest: fail early on missing DB config or failed DB connectivity.

## Current risks
- First deploy can still fail if Railway variables are incomplete or pointed at the wrong Postgres instance.
- `/healthz` is intentionally a process + database readiness check, not a full end-to-end analyst workflow probe.
- Early internal deployments will have sparse compare/history data until enough cycle snapshots accumulate.

## Next review target
- First internal Railway boot: verify migrate/seed flow, `DEPLOYMENT_POSTURE=internal`, and one clean scheduler cycle before any broader visibility change.

## Canonical system state
- **Web service** is the analyst dashboard + ops console + API surface only.
- **Scheduler service** is recurring cycle execution only.
- Canonical product scope remains: backend, scheduler, ops console, analyst dashboard, internal map, posture enforcement, policy/about surface, deterministic explainability, Focus Mode, pinned sections, snapshot compare, source-quality guardrails, release-readiness checklist, and Railway deployment prep.
- Non-goal remains unchanged: no public marketing UI and no scoring-math changes.
