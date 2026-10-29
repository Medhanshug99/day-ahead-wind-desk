"""
Load snapshot data from CSV files on disk.

The app never calls the Elexon API at runtime.  Data is fetched once by
``backend/scripts/fetch_data.py`` and saved to ``backend/data/``.
"""

from __future__ import annotations

from pathlib import Path

import pandas as pd

from .config import settings


class DataStore:
    """In-memory store populated from CSV snapshots at startup."""

    def __init__(self) -> None:
        self.fuelhh: pd.DataFrame = pd.DataFrame()
        self.windfor: pd.DataFrame = pd.DataFrame()
        self._loaded = False

    # ------------------------------------------------------------------
    def load(self, data_dir: str | Path | None = None) -> None:
        """
        Read CSV snapshots into memory.

        Raises ``FileNotFoundError`` if the snapshots are missing --
        the operator must run ``fetch_data.py`` first.
        """
        data_path = Path(data_dir or settings.data_dir)

        fuelhh_path = data_path / "fuelhh_wind.csv"
        windfor_path = data_path / "windfor.csv"

        if not fuelhh_path.exists() or not windfor_path.exists():
            raise FileNotFoundError(
                f"Data snapshots not found in {data_path.resolve()}. "
                "Run  python -m scripts.fetch_data  from the backend/ "
                "directory to fetch data first."
            )

        self.fuelhh = pd.read_csv(fuelhh_path)
        self.windfor = pd.read_csv(windfor_path)

        # Ensure datetime columns are tz-aware UTC
        for col in ("startTime", "publishTime"):
            if col in self.fuelhh.columns:
                self.fuelhh[col] = pd.to_datetime(
                    self.fuelhh[col], utc=True,
                )
            if col in self.windfor.columns:
                self.windfor[col] = pd.to_datetime(
                    self.windfor[col], utc=True,
                )

        self._loaded = True

    # ------------------------------------------------------------------
    @property
    def is_loaded(self) -> bool:
        return self._loaded

    @property
    def windfor_publish_schedule(self) -> list[str]:
        """Distinct publish HH:MM values observed in the data."""
        if not self._loaded:
            return []
        times = (
            self.windfor["publishTime"]
            .dt.strftime("%H:%M")
            .drop_duplicates()
            .sort_values()
            .tolist()
        )
        return times


# Module-level singleton
data_store = DataStore()
