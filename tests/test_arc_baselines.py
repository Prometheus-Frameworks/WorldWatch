from __future__ import annotations

import csv
import sys
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

from arc.baselines import build_arc_baselines


class ArcBaselinePipelineTests(unittest.TestCase):
    def test_pipeline_generates_expected_outputs_and_rules(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            base = Path(tmp_dir)
            cohort_dir = base / "outputs" / "cohort_tables"
            summary_dir = base / "outputs" / "summary_tables"
            cohort_dir.mkdir(parents=True)

            self._write_csv(
                cohort_dir / "arc_player_seasons.csv",
                [
                    "player_id",
                    "season",
                    "position",
                    "career_year",
                    "age_bucket",
                    "ppg",
                    "season_points",
                    "games_played",
                    "elite_finish",
                    "starter_finish",
                ],
                [
                    ["p1", "2024", "WR", "2", "25-27", "10", "170", "17", "1", "1"],
                    ["p2", "2024", "WR", "2", "25-27", "20", "200", "16", "0", "1"],
                    ["p3", "2024", "WR", "2", "", "15", "180", "16", "0", "1"],
                    ["p4", "2024", "", "2", "25-27", "9", "130", "15", "0", "0"],
                ],
            )
            self._write_csv(
                cohort_dir / "arc_player_weeks.csv",
                [
                    "player_id",
                    "season",
                    "position",
                    "career_year",
                    "age_bucket",
                    "spike",
                    "dud",
                ],
                [
                    ["p1", "2024", "WR", "2", "25-27", "1", "0"],
                    ["p1", "2024", "WR", "2", "25-27", "0", "1"],
                    ["p2", "2024", "WR", "2", "25-27", "1", "0"],
                    ["p2", "2024", "WR", "2", "25-27", "1", "0"],
                    ["p3", "2024", "WR", "2", "", "0", "1"],
                ],
            )

            primary_path, fallback_path = build_arc_baselines(
                player_weeks_path=cohort_dir / "arc_player_weeks.csv",
                player_seasons_path=cohort_dir / "arc_player_seasons.csv",
                primary_output_path=summary_dir / "arc_cohort_baselines.csv",
                fallback_output_path=summary_dir / "arc_career_year_baselines.csv",
            )

            primary_rows = self._read_csv(primary_path)
            fallback_rows = self._read_csv(fallback_path)

            self.assertEqual(len(primary_rows), 1)
            self.assertEqual(primary_rows[0]["age_bucket"], "25-27")
            self.assertEqual(primary_rows[0]["sample_size"], "2")

            # Player-season rates: p1 spike=0.5, p2 spike=1.0 => cohort spike=0.75
            self.assertAlmostEqual(float(primary_rows[0]["spike_rate"]), 0.75)
            # Player-season rates: p1 dud=0.5, p2 dud=0.0 => cohort dud=0.25
            self.assertAlmostEqual(float(primary_rows[0]["dud_rate"]), 0.25)

            self.assertEqual(len(fallback_rows), 1)
            self.assertEqual(fallback_rows[0]["sample_size"], "3")
            self.assertEqual(fallback_rows[0]["is_small_sample"], "True")
            self.assertEqual(fallback_rows[0]["small_sample_threshold"], "10")

    def test_missing_input_files_raise_clear_error(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            base = Path(tmp_dir)
            with self.assertRaises(FileNotFoundError) as context:
                build_arc_baselines(
                    player_weeks_path=base / "missing_weeks.csv",
                    player_seasons_path=base / "missing_seasons.csv",
                    primary_output_path=base / "primary.csv",
                    fallback_output_path=base / "fallback.csv",
                )

            self.assertIn("missing_weeks.csv", str(context.exception))
            self.assertIn("missing_seasons.csv", str(context.exception))

    def test_missing_weekly_schema_column_fails_fast(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            base = Path(tmp_dir)
            cohort_dir = base / "outputs" / "cohort_tables"
            summary_dir = base / "outputs" / "summary_tables"
            cohort_dir.mkdir(parents=True)

            self._write_csv(
                cohort_dir / "arc_player_seasons.csv",
                [
                    "player_id",
                    "season",
                    "position",
                    "career_year",
                    "age_bucket",
                    "ppg",
                    "season_points",
                    "games_played",
                ],
                [["p1", "2024", "WR", "2", "25-27", "10", "170", "17"]],
            )
            # `dud` intentionally missing.
            self._write_csv(
                cohort_dir / "arc_player_weeks.csv",
                ["player_id", "season", "position", "career_year", "age_bucket", "spike"],
                [["p1", "2024", "WR", "2", "25-27", "1"]],
            )

            with self.assertRaises(ValueError) as context:
                build_arc_baselines(
                    player_weeks_path=cohort_dir / "arc_player_weeks.csv",
                    player_seasons_path=cohort_dir / "arc_player_seasons.csv",
                    primary_output_path=summary_dir / "arc_cohort_baselines.csv",
                    fallback_output_path=summary_dir / "arc_career_year_baselines.csv",
                )

            error = str(context.exception)
            self.assertIn("missing required columns", error)
            self.assertIn("dud indicator column", error)

    def test_empty_outputs_preserve_parquet_schema(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            base = Path(tmp_dir)
            cohort_dir = base / "outputs" / "cohort_tables"
            summary_dir = base / "outputs" / "summary_tables"
            cohort_dir.mkdir(parents=True)

            self._write_csv(
                cohort_dir / "arc_player_seasons.csv",
                [
                    "player_id",
                    "season",
                    "position",
                    "career_year",
                    "age_bucket",
                    "ppg",
                    "season_points",
                    "games_played",
                    "elite_finish",
                    "starter_finish",
                ],
                [],
            )
            self._write_csv(
                cohort_dir / "arc_player_weeks.csv",
                [
                    "player_id",
                    "season",
                    "position",
                    "career_year",
                    "age_bucket",
                    "spike",
                    "dud",
                ],
                [],
            )

            calls: list[dict[str, object]] = []

            class FakeDataFrame:
                def __init__(self, rows: list[dict[str, object]], columns: list[str]) -> None:
                    calls.append({"rows": rows, "columns": columns})

                def to_parquet(self, path: Path, index: bool = False) -> None:
                    calls.append({"path": str(path), "index": index})

            fake_pandas = SimpleNamespace(DataFrame=FakeDataFrame)
            with patch.dict(sys.modules, {"pandas": fake_pandas}):
                build_arc_baselines(
                    player_weeks_path=cohort_dir / "arc_player_weeks.csv",
                    player_seasons_path=cohort_dir / "arc_player_seasons.csv",
                    primary_output_path=summary_dir / "arc_cohort_baselines.csv",
                    fallback_output_path=summary_dir / "arc_career_year_baselines.csv",
                )

            dataframe_calls = [call for call in calls if "columns" in call]
            self.assertEqual(len(dataframe_calls), 2)
            self.assertEqual(dataframe_calls[0]["rows"], [])
            self.assertEqual(
                dataframe_calls[0]["columns"],
                [
                    "position",
                    "career_year",
                    "age_bucket",
                    "sample_size",
                    "avg_ppg",
                    "median_ppg",
                    "ppg_std",
                    "avg_season_points",
                    "median_season_points",
                    "avg_games_played",
                    "elite_finish_rate",
                    "starter_finish_rate",
                    "spike_rate",
                    "dud_rate",
                    "small_sample_threshold",
                    "is_small_sample",
                ],
            )
            self.assertEqual(
                dataframe_calls[1]["columns"],
                [
                    "position",
                    "career_year",
                    "sample_size",
                    "avg_ppg",
                    "median_ppg",
                    "ppg_std",
                    "avg_season_points",
                    "median_season_points",
                    "avg_games_played",
                    "elite_finish_rate",
                    "starter_finish_rate",
                    "spike_rate",
                    "dud_rate",
                    "small_sample_threshold",
                    "is_small_sample",
                ],
            )

    def _write_csv(self, path: Path, headers: list[str], rows: list[list[str]]) -> None:
        with path.open("w", newline="", encoding="utf-8") as handle:
            writer = csv.writer(handle)
            writer.writerow(headers)
            writer.writerows(rows)

    def _read_csv(self, path: Path) -> list[dict[str, str]]:
        with path.open("r", newline="", encoding="utf-8") as handle:
            return list(csv.DictReader(handle))


if __name__ == "__main__":
    unittest.main()
