from src.arc.metrics import (
    build_player_season_event_rates,
    compute_career_year_baselines,
    compute_cohort_baselines,
)


def _sample_weeks():
    return [
        {"player_id": "p1", "season": 2022, "position": "WR", "career_year": 2, "age_bucket": "22-23", "is_spike_week": 1, "is_dud_week": 0},
        {"player_id": "p1", "season": 2022, "position": "WR", "career_year": 2, "age_bucket": "22-23", "is_spike_week": 0, "is_dud_week": 1},
        {"player_id": "p2", "season": 2022, "position": "WR", "career_year": 2, "age_bucket": "22-23", "is_spike_week": 1, "is_dud_week": 0},
        {"player_id": "p2", "season": 2022, "position": "WR", "career_year": 2, "age_bucket": "22-23", "is_spike_week": 1, "is_dud_week": 0},
        {"player_id": "p3", "season": 2022, "position": "WR", "career_year": 2, "age_bucket": None, "is_spike_week": 0, "is_dud_week": 1},
    ]


def _sample_seasons():
    return [
        {"player_id": "p1", "season": 2022, "position": "WR", "career_year": 2, "age_bucket": "22-23", "ppg": 10.0, "season_points": 160, "games_played": 16, "top_tier_finish": 1, "starter_tier_finish": 1},
        {"player_id": "p2", "season": 2022, "position": "WR", "career_year": 2, "age_bucket": "22-23", "ppg": 14.0, "season_points": 196, "games_played": 14, "top_tier_finish": 0, "starter_tier_finish": 1},
        {"player_id": "p3", "season": 2022, "position": "WR", "career_year": 2, "age_bucket": None, "ppg": 8.0, "season_points": 80, "games_played": 10, "top_tier_finish": 0, "starter_tier_finish": 0},
    ]


def test_build_player_season_event_rates():
    rates = build_player_season_event_rates(_sample_weeks())
    p1 = next(r for r in rates if r["player_id"] == "p1")
    assert p1["spike_weeks"] == 1
    assert p1["dud_weeks"] == 1
    assert p1["games_played_from_weeks"] == 2
    assert p1["spike_rate"] == 0.5
    assert p1["dud_rate"] == 0.5


def test_compute_cohort_baselines_excludes_null_age_buckets_and_flags_small_samples():
    out = compute_cohort_baselines(_sample_seasons(), _sample_weeks(), small_sample_threshold=3)
    assert len(out) == 1
    row = out[0]
    assert row["position"] == "WR"
    assert row["career_year"] == 2
    assert row["age_bucket"] == "22-23"
    assert row["sample_size"] == 2
    assert row["is_small_sample"] is True
    assert row["small_sample_threshold"] == 3


def test_compute_career_year_baselines_include_null_age_bucket_rows():
    out = compute_career_year_baselines(_sample_seasons(), _sample_weeks(), small_sample_threshold=2)
    assert len(out) == 1
    row = out[0]
    assert row["sample_size"] == 3
    assert row["is_small_sample"] is False
