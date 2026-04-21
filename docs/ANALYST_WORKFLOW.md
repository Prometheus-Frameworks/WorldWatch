# ANALYST_WORKFLOW

## Intended analyst path
1. Open dashboard (`/analyst`) and review summary cards + triage spotlight.
2. Filter/sort region table by status, confidence, freshness, evidence, and movement.
3. Select a region and use detail pane for explainability, source contributions, and trend history.
4. Use map as optional spatial context; keep table/detail as primary decision surface.

## How to interpret key patterns

### Hot regions
- High/critical status plus strong recent movement (`delta_24h`, `delta_7d`) indicates immediate review priority.
- Validate whether pressure is broad-based across multiple domains or concentrated in one source class.

### Stale high-risk regions
- High/critical status with non-fresh freshness state is a caution condition.
- Treat as "high concern, lower recency assurance" and prioritize rerun/verification before escalation.

### Mixed-signal regions
- Evidence state `mixed` or mixed-signal indicators implies cross-source direction conflict.
- Use disagreement tables to identify if conflict is directional, stale-vs-fresh, or reliability-weighted.

### Source disagreement
- Review disagreement groups first, then freshest sources and stale high-impact contributors.
- Prefer interpretations anchored in reliable + fresh sources while preserving noted contradictions.

### Low-confidence high-severity cases
- These are intentional "slow down" states.
- Keep monitoring active, but avoid overconfident conclusions until confidence improves or new corroborating evidence arrives.
