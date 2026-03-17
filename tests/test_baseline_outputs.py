import csv
from pathlib import Path

from src.arc.cli import build_baselines


class Args:
    def __init__(self, weeks: Path, seasons: Path, out: Path):
        self.player_weeks_path = str(weeks)
        self.player_seasons_path = str(seasons)
        self.summary_dir = str(out)


def _write_rows(path: Path, rows: list[dict]):
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)


def _read_rows(path: Path):
    with path.open("r", newline="", encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


def test_build_baselines_writes_expected_outputs(tmp_path: Path):
    weeks = [
        {"player_id": "p1", "season": 2022, "position": "RB", "career_year": 3, "age_bucket": "24-25", "is_spike_week": 1, "is_dud_week": 0},
        {"player_id": "p1", "season": 2022, "position": "RB", "career_year": 3, "age_bucket": "24-25", "is_spike_week": 0, "is_dud_week": 1},
    ]
    seasons = [
        {"player_id": "p1", "season": 2022, "position": "RB", "career_year": 3, "age_bucket": "24-25", "ppg": 12.0, "season_points": 180, "games_played": 15, "top_tier_finish": 1, "starter_tier_finish": 1}
    ]

    weeks_path = tmp_path / "arc_player_weeks.csv"
    seasons_path = tmp_path / "arc_player_seasons.csv"
    out_dir = tmp_path / "summary"
    _write_rows(weeks_path, weeks)
    _write_rows(seasons_path, seasons)

    code = build_baselines(Args(weeks_path, seasons_path, out_dir))
    assert code == 0

    primary = _read_rows(out_dir / "arc_cohort_baselines.csv")
    fallback = _read_rows(out_dir / "arc_career_year_baselines.csv")

    assert primary
    assert fallback
    assert "spike_rate" in primary[0]
    assert "dud_rate" in primary[0]
    assert "is_small_sample" in primary[0]
