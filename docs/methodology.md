# ARC Baseline Methodology

## Inputs

`build-baselines` consumes PR2 cohort tables:

- `outputs/cohort_tables/arc_player_weeks.csv`
- `outputs/cohort_tables/arc_player_seasons.csv`

## Grouping logic

Primary baseline cohorts (`arc_cohort_baselines.csv`) are grouped by:

- `position`
- `career_year`
- `age_bucket`

Fallback cohorts (`arc_career_year_baselines.csv`) are grouped by:

- `position`
- `career_year`

Rows with null `position` or `career_year` are excluded from both outputs.
Primary cohorts exclude null `age_bucket` rows; fallback includes them.

## Metric computation

Season-level distributions come from `arc_player_seasons`:

- `avg_ppg`, `median_ppg`, `ppg_std` from `ppg`
- `avg_season_points`, `median_season_points` from `season_points`
- `avg_games_played` from `games_played`
- `elite_finish_rate` from mean(`top_tier_finish`)
- `starter_finish_rate` from mean(`starter_tier_finish`)

Weekly event rates use `arc_player_weeks`, then aggregate in two steps:

1. Per player-season rates:
   - `spike_rate = spike_weeks / games_played`
   - `dud_rate = dud_weeks / games_played`
2. Cohort rates:
   - mean of player-season `spike_rate`
   - mean of player-season `dud_rate`

This avoids overweighting cohorts with more total games.

## Small-sample flags

Both baseline outputs include:

- `small_sample_threshold` (default: `10`)
- `is_small_sample = sample_size < small_sample_threshold`

Small cohorts are not suppressed; they are explicitly flagged.

## Null behavior

- Numeric summaries ignore null values.
- Rate means ignore null denominators/rates.
- Standard deviation follows pandas behavior (`NaN` for one-value groups).
