from __future__ import annotations

import csv
import math
import statistics
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

SMALL_SAMPLE_THRESHOLD = 10

PLAYER_WEEK_INPUT = Path("outputs/cohort_tables/arc_player_weeks.csv")
PLAYER_SEASON_INPUT = Path("outputs/cohort_tables/arc_player_seasons.csv")
PRIMARY_OUTPUT = Path("outputs/summary_tables/arc_cohort_baselines.csv")
FALLBACK_OUTPUT = Path("outputs/summary_tables/arc_career_year_baselines.csv")


@dataclass(frozen=True)
class CohortKeys:
    position: str
    career_year: str
    age_bucket: str | None


def build_arc_baselines(
    player_weeks_path: Path = PLAYER_WEEK_INPUT,
    player_seasons_path: Path = PLAYER_SEASON_INPUT,
    primary_output_path: Path = PRIMARY_OUTPUT,
    fallback_output_path: Path = FALLBACK_OUTPUT,
    small_sample_threshold: int = SMALL_SAMPLE_THRESHOLD,
) -> tuple[Path, Path]:
    _validate_inputs_exist(player_weeks_path, player_seasons_path)

    season_rows = _read_csv_rows(player_seasons_path)
    week_rows = _read_csv_rows(player_weeks_path)

    primary_rows = _build_baseline_rows(
        season_rows=season_rows,
        week_rows=week_rows,
        include_age_bucket=True,
        small_sample_threshold=small_sample_threshold,
    )
    fallback_rows = _build_baseline_rows(
        season_rows=season_rows,
        week_rows=week_rows,
        include_age_bucket=False,
        small_sample_threshold=small_sample_threshold,
    )

    _write_csv(primary_output_path, primary_rows, include_age_bucket=True)
    _write_csv(fallback_output_path, fallback_rows, include_age_bucket=False)

    _try_write_parquet(primary_output_path, primary_rows)
    _try_write_parquet(fallback_output_path, fallback_rows)

    return primary_output_path, fallback_output_path


def _validate_inputs_exist(*paths: Path) -> None:
    missing = [str(path) for path in paths if not path.exists()]
    if missing:
        raise FileNotFoundError(
            "Missing required ARC cohort input files: " + ", ".join(missing)
        )


def _read_csv_rows(path: Path) -> list[dict[str, str]]:
    with path.open("r", newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        return list(reader)


def _build_baseline_rows(
    season_rows: list[dict[str, str]],
    week_rows: list[dict[str, str]],
    *,
    include_age_bucket: bool,
    small_sample_threshold: int,
) -> list[dict[str, object]]:
    filtered_seasons = _filter_season_rows(season_rows, include_age_bucket=include_age_bucket)
    grouped_seasons = _group_rows_by_cohort(filtered_seasons, include_age_bucket=include_age_bucket)

    grouped_event_rates = _aggregate_event_rates(
        week_rows,
        include_age_bucket=include_age_bucket,
    )

    results: list[dict[str, object]] = []
    for cohort_key in sorted(grouped_seasons.keys(), key=_cohort_sort_key):
        rows = grouped_seasons[cohort_key]
        sample_size = len(rows)
        event_rates = grouped_event_rates.get(cohort_key, {})

        baseline_row: dict[str, object] = {
            "position": cohort_key.position,
            "career_year": cohort_key.career_year,
            "sample_size": sample_size,
            "avg_ppg": _mean(_extract_numeric(rows, ["ppg", "avg_ppg"])),
            "median_ppg": _median(_extract_numeric(rows, ["ppg", "avg_ppg"])),
            "ppg_std": _std(_extract_numeric(rows, ["ppg", "avg_ppg"])),
            "avg_season_points": _mean(_extract_numeric(rows, ["season_points", "total_points"])),
            "median_season_points": _median(_extract_numeric(rows, ["season_points", "total_points"])),
            "avg_games_played": _mean(_extract_numeric(rows, ["games_played", "gp"])),
            "elite_finish_rate": _rate(rows, ["elite_finish", "is_elite_finish", "elite"], "elite"),
            "starter_finish_rate": _rate(rows, ["starter_finish", "is_starter_finish", "starter"], "starter"),
            "spike_rate": event_rates.get("spike_rate"),
            "dud_rate": event_rates.get("dud_rate"),
            "small_sample_threshold": small_sample_threshold,
            "is_small_sample": sample_size < small_sample_threshold,
        }
        if include_age_bucket:
            baseline_row["age_bucket"] = cohort_key.age_bucket

        results.append(baseline_row)

    return results


def _filter_season_rows(
    rows: Iterable[dict[str, str]], *, include_age_bucket: bool
) -> list[dict[str, str]]:
    filtered: list[dict[str, str]] = []
    for row in rows:
        position = _normalize_text(row.get("position"))
        career_year = _normalize_text(row.get("career_year"))
        age_bucket = _normalize_text(row.get("age_bucket"))

        if position is None or career_year is None:
            continue
        if include_age_bucket and age_bucket is None:
            continue

        row = dict(row)
        row["position"] = position
        row["career_year"] = career_year
        row["age_bucket"] = age_bucket or ""
        filtered.append(row)
    return filtered


def _group_rows_by_cohort(
    rows: Iterable[dict[str, str]], *, include_age_bucket: bool
) -> dict[CohortKeys, list[dict[str, str]]]:
    grouped: dict[CohortKeys, list[dict[str, str]]] = {}
    for row in rows:
        key = CohortKeys(
            position=row["position"],
            career_year=row["career_year"],
            age_bucket=row["age_bucket"] if include_age_bucket else None,
        )
        grouped.setdefault(key, []).append(row)
    return grouped


def _aggregate_event_rates(
    week_rows: list[dict[str, str]], *, include_age_bucket: bool
) -> dict[CohortKeys, dict[str, float | None]]:
    player_col = _first_present_column(week_rows, ["player_id", "athlete_id", "player"])
    season_col = _first_present_column(week_rows, ["season", "season_year", "year"])
    spike_col = _first_present_column(week_rows, ["spike", "is_spike_week", "spike_week"])
    dud_col = _first_present_column(week_rows, ["dud", "is_dud_week", "dud_week"])

    if not (player_col and season_col and spike_col and dud_col):
        return {}

    by_player_season: dict[tuple[str, str, CohortKeys], list[dict[str, str]]] = {}
    for row in week_rows:
        position = _normalize_text(row.get("position"))
        career_year = _normalize_text(row.get("career_year"))
        age_bucket = _normalize_text(row.get("age_bucket"))
        player_id = _normalize_text(row.get(player_col))
        season = _normalize_text(row.get(season_col))

        if position is None or career_year is None or player_id is None or season is None:
            continue
        if include_age_bucket and age_bucket is None:
            continue

        cohort = CohortKeys(
            position=position,
            career_year=career_year,
            age_bucket=age_bucket if include_age_bucket else None,
        )
        by_player_season.setdefault((player_id, season, cohort), []).append(row)

    cohort_rates: dict[CohortKeys, list[tuple[float | None, float | None]]] = {}
    for (_, _, cohort), rows in by_player_season.items():
        spike_rate = _mean(_extract_binary(rows, spike_col))
        dud_rate = _mean(_extract_binary(rows, dud_col))
        cohort_rates.setdefault(cohort, []).append((spike_rate, dud_rate))

    aggregated: dict[CohortKeys, dict[str, float | None]] = {}
    for cohort, rates in cohort_rates.items():
        spikes = [rate[0] for rate in rates if rate[0] is not None]
        duds = [rate[1] for rate in rates if rate[1] is not None]
        aggregated[cohort] = {
            "spike_rate": _mean(spikes),
            "dud_rate": _mean(duds),
        }
    return aggregated


def _extract_numeric(rows: Iterable[dict[str, str]], columns: list[str]) -> list[float]:
    values: list[float] = []
    for row in rows:
        for column in columns:
            value = _to_float(row.get(column))
            if value is not None:
                values.append(value)
                break
    return values


def _extract_binary(rows: Iterable[dict[str, str]], column: str) -> list[float]:
    values: list[float] = []
    for row in rows:
        parsed = _to_binary(row.get(column))
        if parsed is not None:
            values.append(float(parsed))
    return values


def _rate(
    rows: Iterable[dict[str, str]], columns: list[str], finish_tier_target: str
) -> float | None:
    values: list[float] = []
    for row in rows:
        explicit_value = None
        for column in columns:
            explicit_value = _to_binary(row.get(column))
            if explicit_value is not None:
                values.append(float(explicit_value))
                break
        else:
            finish_tier = _normalize_text(row.get("finish_tier"))
            if finish_tier is None:
                continue
            if finish_tier_target == "elite":
                values.append(float(finish_tier == "elite"))
            elif finish_tier_target == "starter":
                values.append(float(finish_tier in {"starter", "elite"}))
    return _mean(values)


def _mean(values: Iterable[float]) -> float | None:
    values = list(values)
    if not values:
        return None
    return statistics.fmean(values)


def _median(values: Iterable[float]) -> float | None:
    values = list(values)
    if not values:
        return None
    return statistics.median(values)


def _std(values: Iterable[float]) -> float | None:
    values = list(values)
    if len(values) < 2:
        return None
    return statistics.stdev(values)


def _to_float(value: str | None) -> float | None:
    if value is None:
        return None
    raw = value.strip()
    if raw == "":
        return None
    try:
        parsed = float(raw)
    except ValueError:
        return None
    if math.isnan(parsed):
        return None
    return parsed


def _to_binary(value: str | None) -> int | None:
    if value is None:
        return None
    raw = value.strip().lower()
    if raw in {"", "na", "null", "none", "nan"}:
        return None
    if raw in {"1", "true", "t", "yes", "y"}:
        return 1
    if raw in {"0", "false", "f", "no", "n"}:
        return 0
    try:
        return 1 if float(raw) > 0 else 0
    except ValueError:
        return None


def _normalize_text(value: str | None) -> str | None:
    if value is None:
        return None
    normalized = value.strip()
    if normalized == "" or normalized.lower() in {"null", "none", "nan"}:
        return None
    return normalized


def _first_present_column(rows: list[dict[str, str]], columns: list[str]) -> str | None:
    if not rows:
        return None
    headers = set(rows[0].keys())
    for column in columns:
        if column in headers:
            return column
    return None


def _write_csv(path: Path, rows: list[dict[str, object]], *, include_age_bucket: bool) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fieldnames = ["position", "career_year"]
    if include_age_bucket:
        fieldnames.append("age_bucket")
    fieldnames.extend(
        [
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
        ]
    )

    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        for row in rows:
            writer.writerow(row)


def _try_write_parquet(csv_path: Path, rows: list[dict[str, object]]) -> None:
    try:
        import pandas as pd  # type: ignore
    except Exception:
        return

    parquet_path = csv_path.with_suffix(".parquet")
    try:
        dataframe = pd.DataFrame(rows)
        dataframe.to_parquet(parquet_path, index=False)
    except Exception:
        return


def _cohort_sort_key(cohort: CohortKeys) -> tuple[str, str, str]:
    return (
        cohort.position,
        cohort.career_year,
        cohort.age_bucket or "",
    )
