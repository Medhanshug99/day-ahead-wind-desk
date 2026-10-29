"""
Application configuration from environment variables.

Key settings:
    DECISION_CUTOFF_HOUR: Hour (0-23) on D-1 when the day-ahead decision is made.
        Default 9 (09:00 UK time). In January, UK time == UTC (no DST).
        EPEX Spot GB day-ahead auction gate closure is 09:20 UK time on D-1
        (source: EPEX Spot SE, "GB Day-Ahead Auction Trading Specifications").
        Our default of 09:00 is conservative — 20 minutes before actual closure —
        ensuring we only use forecasts genuinely available at decision time.

    DELIVERY_START / DELIVERY_END: Scope window for delivery days.
        Default Jan 2 to Feb 1 (decisions made Jan 1-31, delivery = decision + 1 day).
"""
import os
from datetime import date
from pathlib import Path
from pydantic import BaseModel, Field


def _load_env_file():
    """Simple loader for .env file if present."""
    env_path = Path(".env")
    if not env_path.exists():
        env_path = Path(__file__).resolve().parent.parent / ".env"
    if env_path.exists():
        for line in env_path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip())


_load_env_file()


class Settings(BaseModel):
    """All settings configurable via environment variables or .env file."""

    elexon_base_url: str = Field(
        default_factory=lambda: os.getenv("ELEXON_BASE_URL", "https://data.elexon.co.uk/bmrs/api/v1")
    )
    decision_cutoff_hour: int = Field(
        default_factory=lambda: int(os.getenv("DECISION_CUTOFF_HOUR", "9"))
    )
    delivery_start: date = Field(
        default_factory=lambda: date.fromisoformat(os.getenv("DELIVERY_START", "2026-01-02"))
    )
    delivery_end: date = Field(
        default_factory=lambda: date.fromisoformat(os.getenv("DELIVERY_END", "2026-02-01"))
    )
    data_dir: str = Field(
        default_factory=lambda: os.getenv("DATA_DIR", "data")
    )
    cors_origins: str = Field(
        default_factory=lambda: os.getenv("CORS_ORIGINS", "http://localhost:5173")
    )

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",")]

    def validate_delivery_date(self, d: date) -> bool:
        """Check if a date falls within the configured delivery window."""
        return self.delivery_start <= d <= self.delivery_end


settings = Settings()
