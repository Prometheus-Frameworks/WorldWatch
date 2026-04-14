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

## ARC cohort baselines from PR2 outputs

### Quickstart
1. Ensure PR2 cohort tables exist:
   - `outputs/cohort_tables/arc_player_weeks.csv`
   - `outputs/cohort_tables/arc_player_seasons.csv`
2. Run baseline generation:
   - `python -m arc.cli build-baselines`
3. Review generated summary tables:
   - `outputs/summary_tables/arc_cohort_baselines.csv` (primary)
   - `outputs/summary_tables/arc_career_year_baselines.csv` (fallback)

### Methodology and grouping rules
- Primary baseline cohorts group by: `position`, `career_year`, `age_bucket`.
- Fallback baseline cohorts group by: `position`, `career_year`.
- Both tables exclude rows where `position` or `career_year` is null.
- Primary table excludes rows with null `age_bucket`; fallback table includes them.

### Metrics
From player-season rows:
- `sample_size`
- `avg_ppg`, `median_ppg`, `ppg_std`
- `avg_season_points`, `median_season_points`
- `avg_games_played`
- `elite_finish_rate`, `starter_finish_rate`

From player-week rows:
- compute `spike_rate` and `dud_rate` per player-season first
- then average player-season rates within each cohort
- this prevents larger-game player-seasons from being overweighted

### Null and small-sample handling
- Numeric summaries ignore nulls.
- Standard deviation may be null for single-row cohorts.
- All cohorts are retained and flagged for sample size quality:
  - `small_sample_threshold` (default `10`)
  - `is_small_sample` (`sample_size < threshold`)
