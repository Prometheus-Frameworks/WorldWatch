# TASK_QUEUE

## Now
- Run the new analyst UX validation checklist for each analyst-detail change.
- Prioritize analyst polish items that improve first-scan interpretation speed and reduce stale/disagreement misreads.
- Maintain deterministic fixture coverage for escalation posture and disagreement ordering.

## Next
- Refine internal map ergonomics only where they accelerate region selection without displacing table/detail workflow.
- Add small historical snapshot spot-check routine to release checklist (no replay system expansion).
- Reconfirm posture banner/policy visibility after any dashboard layout changes.

## Later
- Add additional operational guardrails/observability around recurring source degradation patterns.
- Continue hardening docs as live repo-memory during each landed sprint.

## Not now
- Public marketing-facing map experience.
- Non-deterministic or opaque scoring narratives.
- Features that imply military/targeting posture or non-civilian use.

## Completed: PR27 Analyst ergonomics pass
- [x] Focus mode default with collapsible deep-detail sections and preserved trust cues.
- [x] Pin-this-section affordances with localStorage persistence.
- [x] Deterministic latest-vs-prior snapshot compare in region detail (with optional 24h-ago mode).
- [x] Test coverage updates for compare endpoint and analyst detail render affordances.
