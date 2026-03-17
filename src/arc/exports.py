from __future__ import annotations

import csv
from pathlib import Path
from typing import Any


def export_csv(rows: list[dict[str, Any]], path: Path) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    headers: list[str] = list(rows[0].keys()) if rows else []
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=headers)
        writer.writeheader()
        writer.writerows(rows)
    return path


def export_parquet_if_available(rows: list[dict[str, Any]], path: Path) -> Path | None:
    try:
        import pyarrow as pa
        import pyarrow.parquet as pq
    except Exception:
        return None

    path.parent.mkdir(parents=True, exist_ok=True)
    table = pa.Table.from_pylist(rows)
    pq.write_table(table, path)
    return path
