from __future__ import annotations

from dataclasses import dataclass
from typing import Optional


@dataclass(frozen=True)
class ArcCohortBaseline:
    position: str
    career_year: int
    age_bucket: str
    sample_size: int
    avg_ppg: float
    median_ppg: float
    ppg_std: Optional[float]
    avg_season_points: float
    median_season_points: float
    avg_games_played: float
    spike_rate: Optional[float]
    dud_rate: Optional[float]
    elite_finish_rate: Optional[float]
    starter_finish_rate: Optional[float]
    is_small_sample: bool
    small_sample_threshold: int


@dataclass(frozen=True)
class ArcCareerYearBaseline:
    position: str
    career_year: int
    sample_size: int
    avg_ppg: float
    median_ppg: float
    ppg_std: Optional[float]
    avg_season_points: float
    median_season_points: float
    avg_games_played: float
    spike_rate: Optional[float]
    dud_rate: Optional[float]
    elite_finish_rate: Optional[float]
    starter_finish_rate: Optional[float]
    is_small_sample: bool
    small_sample_threshold: int
