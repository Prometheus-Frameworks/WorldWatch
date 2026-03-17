from __future__ import annotations

import math
from collections import defaultdict
from statistics import mean, median, stdev
from typing import Any, Iterable, Sequence

PLAYER_KEY_CANDIDATES = ("player_id", "gsis_id", "player")
SEASON_KEY_CANDIDATES = ("season", "nfl_season", "year")
SPIKE_COLUMN_CANDIDATES = ("is_spike_week", "spike_week", "is_spike")
DUD_COLUMN_CANDIDATES = ("is_dud_week", "dud_week", "is_dud")


def _first_present(rows: list[dict[str, Any]], candidates: Sequence[str], label: str) -> str:
    keys = set().union(*(r.keys() for r in rows)) if rows else set()
    for candidate in candidates:
        if candidate in keys:
            return candidate
    raise ValueError(f"Missing {label}. Expected one of: {', '.join(candidates)}")


def _to_float(value: Any) -> float | None:
    if value in (None, ""):
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _to_bool_num(value: Any) -> float | None:
    if value in (None, ""):
        return None
    if isinstance(value, bool):
        return 1.0 if value else 0.0
    if isinstance(value, (int, float)):
        return 1.0 if float(value) != 0 else 0.0
    lowered = str(value).strip().lower()
    if lowered in {"true", "t", "1", "yes"}:
        return 1.0
    if lowered in {"false", "f", "0", "no"}:
        return 0.0
    return None


def build_player_season_event_rates(player_weeks_rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    join_player = _first_present(player_weeks_rows, PLAYER_KEY_CANDIDATES, "player key")
    join_season = _first_present(player_weeks_rows, SEASON_KEY_CANDIDATES, "season key")
    spike_col = _first_present(player_weeks_rows, SPIKE_COLUMN_CANDIDATES, "spike indicator column")
    dud_col = _first_present(player_weeks_rows, DUD_COLUMN_CANDIDATES, "dud indicator column")

    groups: dict[tuple[Any, ...], dict[str, Any]] = {}
    for row in player_weeks_rows:
        key = (
            row.get(join_player),
            row.get(join_season),
            row.get("position"),
            row.get("career_year"),
            row.get("age_bucket"),
        )
        if key not in groups:
            groups[key] = {
                join_player: row.get(join_player),
                join_season: row.get(join_season),
                "position": row.get("position"),
                "career_year": row.get("career_year"),
                "age_bucket": row.get("age_bucket"),
                "spike_weeks": 0.0,
                "dud_weeks": 0.0,
                "games_played_from_weeks": 0,
            }
        groups[key]["spike_weeks"] += _to_bool_num(row.get(spike_col)) or 0.0
        groups[key]["dud_weeks"] += _to_bool_num(row.get(dud_col)) or 0.0
        groups[key]["games_played_from_weeks"] += 1

    out: list[dict[str, Any]] = []
    for grouped in groups.values():
        gp = grouped["games_played_from_weeks"]
        grouped["spike_rate"] = grouped["spike_weeks"] / gp if gp else None
        grouped["dud_rate"] = grouped["dud_weeks"] / gp if gp else None
        out.append(grouped)
    return out


def aggregate_player_season_event_rates(
    player_seasons_rows: list[dict[str, Any]], player_weeks_rows: list[dict[str, Any]]
) -> list[dict[str, Any]]:
    rates = build_player_season_event_rates(player_weeks_rows)
    join_player = _first_present(player_weeks_rows, PLAYER_KEY_CANDIDATES, "player key")
    join_season = _first_present(player_weeks_rows, SEASON_KEY_CANDIDATES, "season key")
    rate_lookup = {(r[join_player], r[join_season]): r for r in rates}

    merged: list[dict[str, Any]] = []
    for season in player_seasons_rows:
        row = dict(season)
        key = (season.get(join_player), season.get(join_season))
        rate = rate_lookup.get(key, {})
        row["spike_weeks"] = rate.get("spike_weeks")
        row["dud_weeks"] = rate.get("dud_weeks")
        row["games_played_from_weeks"] = rate.get("games_played_from_weeks")

        gp = _to_float(season.get("games_played"))
        if gp and gp > 0 and rate:
            row["spike_rate"] = (rate.get("spike_weeks") or 0.0) / gp
            row["dud_rate"] = (rate.get("dud_weeks") or 0.0) / gp
        else:
            row["spike_rate"] = rate.get("spike_rate")
            row["dud_rate"] = rate.get("dud_rate")
        merged.append(row)
    return merged


def _safe_mean(values: list[float | None]) -> float | None:
    nums = [v for v in values if v is not None]
    return mean(nums) if nums else None


def _safe_std(values: list[float | None]) -> float | None:
    nums = [v for v in values if v is not None]
    if len(nums) < 2:
        return None
    return stdev(nums)


def _compute_baselines(
    player_seasons_rows: list[dict[str, Any]],
    player_weeks_rows: list[dict[str, Any]],
    group_columns: Iterable[str],
    small_sample_threshold: int = 10,
) -> list[dict[str, Any]]:
    merged = aggregate_player_season_event_rates(player_seasons_rows, player_weeks_rows)
    filtered = [r for r in merged if r.get("position") not in (None, "") and r.get("career_year") not in (None, "")]

    groups: dict[tuple[Any, ...], list[dict[str, Any]]] = defaultdict(list)
    for row in filtered:
        groups[tuple(row.get(c) for c in group_columns)].append(row)

    output: list[dict[str, Any]] = []
    for key, rows in groups.items():
        ppg_vals = [_to_float(r.get("ppg")) for r in rows]
        season_pts = [_to_float(r.get("season_points")) for r in rows]
        games_vals = [_to_float(r.get("games_played")) for r in rows]
        spike_vals = [_to_float(r.get("spike_rate")) for r in rows]
        dud_vals = [_to_float(r.get("dud_rate")) for r in rows]
        elite_vals = [_to_bool_num(r.get("top_tier_finish")) for r in rows]
        starter_vals = [_to_bool_num(r.get("starter_tier_finish")) for r in rows]

        ppg_nums = [v for v in ppg_vals if v is not None]
        season_nums = [v for v in season_pts if v is not None]

        row = {c: v for c, v in zip(group_columns, key)}
        row.update(
            {
                "sample_size": len(rows),
                "avg_ppg": mean(ppg_nums) if ppg_nums else None,
                "median_ppg": median(ppg_nums) if ppg_nums else None,
                "ppg_std": _safe_std(ppg_vals),
                "avg_season_points": mean(season_nums) if season_nums else None,
                "median_season_points": median(season_nums) if season_nums else None,
                "avg_games_played": _safe_mean(games_vals),
                "spike_rate": _safe_mean(spike_vals),
                "dud_rate": _safe_mean(dud_vals),
                "elite_finish_rate": _safe_mean(elite_vals),
                "starter_finish_rate": _safe_mean(starter_vals),
                "small_sample_threshold": small_sample_threshold,
                "is_small_sample": len(rows) < small_sample_threshold,
            }
        )
        output.append(row)

    return sorted(output, key=lambda r: tuple("" if r.get(c) is None else str(r.get(c)) for c in group_columns))


def compute_cohort_baselines(
    player_seasons_rows: list[dict[str, Any]],
    player_weeks_rows: list[dict[str, Any]],
    small_sample_threshold: int = 10,
) -> list[dict[str, Any]]:
    seasons = [r for r in player_seasons_rows if r.get("age_bucket") not in (None, "")]
    return _compute_baselines(seasons, player_weeks_rows, ["position", "career_year", "age_bucket"], small_sample_threshold)


def compute_career_year_baselines(
    player_seasons_rows: list[dict[str, Any]],
    player_weeks_rows: list[dict[str, Any]],
    small_sample_threshold: int = 10,
) -> list[dict[str, Any]]:
    return _compute_baselines(player_seasons_rows, player_weeks_rows, ["position", "career_year"], small_sample_threshold)
