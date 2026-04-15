from __future__ import annotations

import argparse

from .baselines import build_arc_baselines


def main() -> None:
    parser = argparse.ArgumentParser(prog="arc")
    subparsers = parser.add_subparsers(dest="command", required=True)

    build_parser = subparsers.add_parser(
        "build-baselines", help="Build ARC cohort baseline summary tables from cohort outputs."
    )
    build_parser.add_argument(
        "--small-sample-threshold",
        type=int,
        default=10,
        help="Threshold used to flag small-sample cohorts.",
    )

    args = parser.parse_args()

    if args.command == "build-baselines":
        primary, fallback = build_arc_baselines(
            small_sample_threshold=args.small_sample_threshold
        )
        print(f"Wrote primary cohort baselines: {primary}")
        print(f"Wrote fallback career-year baselines: {fallback}")


if __name__ == "__main__":
    main()
