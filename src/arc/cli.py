from __future__ import annotations

import argparse
import csv
from pathlib import Path
from typing import Any

from .exports import export_csv, export_parquet_if_available
from .metrics import compute_career_year_baselines, compute_cohort_baselines

DEFAULT_PLAYER_WEEKS = Path("outputs/cohort_tables/arc_player_weeks.csv")
DEFAULT_PLAYER_SEASONS = Path("outputs/cohort_tables/arc_player_seasons.csv")
DEFAULT_SUMMARY_DIR = Path("outputs/summary_tables")


def _read_csv(path: Path) -> list[dict[str, Any]]:
    with path.open("r", newline="", encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


def build_baselines(args: argparse.Namespace) -> int:
    player_weeks_path = Path(args.player_weeks_path)
    player_seasons_path = Path(args.player_seasons_path)

    if not player_weeks_path.exists():
        raise FileNotFoundError(f"Missing required player weeks file: {player_weeks_path}")
    if not player_seasons_path.exists():
        raise FileNotFoundError(f"Missing required player seasons file: {player_seasons_path}")

    player_weeks_rows = _read_csv(player_weeks_path)
    player_seasons_rows = _read_csv(player_seasons_path)

    primary = compute_cohort_baselines(player_seasons_rows, player_weeks_rows)
    fallback = compute_career_year_baselines(player_seasons_rows, player_weeks_rows)

    summary_dir = Path(args.summary_dir)
    primary_csv = export_csv(primary, summary_dir / "arc_cohort_baselines.csv")
    fallback_csv = export_csv(fallback, summary_dir / "arc_career_year_baselines.csv")
    primary_parquet = export_parquet_if_available(primary, summary_dir / "arc_cohort_baselines.parquet")

    print(f"wrote {len(primary)} primary rows -> {primary_csv}")
    print(f"wrote {len(fallback)} fallback rows -> {fallback_csv}")
    if primary_parquet:
        print(f"wrote parquet -> {primary_parquet}")
    else:
        print("skipped parquet export (no parquet engine available)")
    return 0


def parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(description="ARC utilities")
    sub = p.add_subparsers(dest="command", required=True)

    baselines = sub.add_parser("build-baselines", help="Build ARC baseline summary tables")
    baselines.add_argument("--player-weeks-path", default=str(DEFAULT_PLAYER_WEEKS))
    baselines.add_argument("--player-seasons-path", default=str(DEFAULT_PLAYER_SEASONS))
    baselines.add_argument("--summary-dir", default=str(DEFAULT_SUMMARY_DIR))
    baselines.set_defaults(func=build_baselines)
    return p


def main() -> int:
    args = parser().parse_args()
    try:
        return args.func(args)
    except FileNotFoundError as exc:
        print(f"error: {exc}")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
