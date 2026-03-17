# ARC Metric Definitions

- `sample_size`: Number of player-season rows in the cohort.
- `avg_ppg`: Mean of player-season `ppg`.
- `median_ppg`: Median of player-season `ppg`.
- `ppg_std`: Standard deviation of player-season `ppg`.
- `avg_season_points`: Mean of player-season `season_points`.
- `median_season_points`: Median of player-season `season_points`.
- `avg_games_played`: Mean of player-season `games_played`.
- `spike_rate`: Mean of player-season spike rates (`spike_weeks / games_played`).
- `dud_rate`: Mean of player-season dud rates (`dud_weeks / games_played`).
- `elite_finish_rate`: Mean of `top_tier_finish` (boolean treated as 1/0).
- `starter_finish_rate`: Mean of `starter_tier_finish` (boolean treated as 1/0).
- `is_small_sample`: `True` when `sample_size < small_sample_threshold`.
- `small_sample_threshold`: Threshold used for small-sample flagging (default `10`).
