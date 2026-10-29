"""
One-shot data-fetch script.

Downloads FUELHH (wind actuals) and WINDFOR (wind forecasts) from
the Elexon BMRS API and saves CSV snapshots to ``backend/data/``.

Usage (from the backend/ directory):
    python -m scripts.fetch_data            # fresh fetch from API
    python -m scripts.fetch_data --from-json <dir>  # convert cached JSON

The deployed app loads these snapshots at startup and never calls the
Elexon API at runtime.
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timedelta
from pathlib import Path

import httpx
import pandas as pd

BASE_URL = "https://data.elexon.co.uk/bmrs/api/v1"
DATA_DIR = Path(__file__).resolve().parent.parent / "data"


def fetch_fuelhh(client: httpx.Client) -> list[dict]:
    """Fetch FUELHH WIND actuals for delivery days Jan 2 - Feb 1."""
    all_rows: list[dict] = []
    base = datetime(2026, 1, 2)
    for i in range(31):  # Jan 2 through Feb 1
        day = (base + timedelta(days=i)).strftime("%Y-%m-%d")
        url = f"{BASE_URL}/datasets/FUELHH/stream"
        params = {
            "settlementDateFrom": day,
            "settlementDateTo": day,
            "fuelType": "WIND",
        }
        print(f"  FUELHH {day} ... ", end="", flush=True)
        r = client.get(url, params=params, timeout=60)
        r.raise_for_status()
        rows = r.json()
        all_rows.extend(rows)
        print(f"{len(rows)} records")
    return all_rows


def fetch_windfor(client: httpx.Client) -> list[dict]:
    """Fetch WINDFOR forecasts published Dec 29 - Jan 31."""
    all_rows: list[dict] = []
    base = datetime(2025, 12, 29)
    for i in range(34):  # Dec 29 through Jan 31
        day = base + timedelta(days=i)
        pub_from = day.strftime("%Y-%m-%dT00:00:00Z")
        pub_to = (day + timedelta(days=1)).strftime("%Y-%m-%dT00:00:00Z")
        url = f"{BASE_URL}/datasets/WINDFOR/stream"
        params = {
            "publishDateTimeFrom": pub_from,
            "publishDateTimeTo": pub_to,
        }
        print(f"  WINDFOR {day.strftime('%Y-%m-%d')} ... ", end="", flush=True)
        r = client.get(url, params=params, timeout=60)
        r.raise_for_status()
        rows = r.json()
        all_rows.extend(rows)
        print(f"{len(rows)} records")
    return all_rows


def save_csv(data: list[dict], path: Path, name: str) -> None:
    """Save list of dicts to a CSV file."""
    df = pd.DataFrame(data)
    path.mkdir(parents=True, exist_ok=True)
    out = path / name
    df.to_csv(out, index=False)
    print(f"  Saved {len(df)} rows to {out}")


def from_api() -> None:
    """Fetch all data from the Elexon API and save as CSV."""
    print("Fetching FUELHH (actuals) ...")
    with httpx.Client() as client:
        fuelhh = fetch_fuelhh(client)
    print(f"Total FUELHH: {len(fuelhh)}\n")

    print("Fetching WINDFOR (forecasts) ...")
    with httpx.Client() as client:
        windfor = fetch_windfor(client)
    print(f"Total WINDFOR: {len(windfor)}\n")

    print("Saving snapshots ...")
    save_csv(fuelhh, DATA_DIR, "fuelhh_wind.csv")
    save_csv(windfor, DATA_DIR, "windfor.csv")
    print("Done!")


def from_json(json_dir: str) -> None:
    """Convert cached JSON files to CSV (avoids re-fetching)."""
    jdir = Path(json_dir)
    fuelhh_path = jdir / "fuelhh_all.json"
    windfor_path = jdir / "windfor_all.json"

    if not fuelhh_path.exists() or not windfor_path.exists():
        print(f"ERROR: Expected {fuelhh_path} and {windfor_path}")
        sys.exit(1)

    print(f"Reading {fuelhh_path} ...")
    fuelhh = json.loads(fuelhh_path.read_text())
    print(f"  {len(fuelhh)} records")

    print(f"Reading {windfor_path} ...")
    windfor = json.loads(windfor_path.read_text())
    print(f"  {len(windfor)} records")

    print("Saving snapshots ...")
    save_csv(fuelhh, DATA_DIR, "fuelhh_wind.csv")
    save_csv(windfor, DATA_DIR, "windfor.csv")
    print("Done!")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Fetch Elexon BMRS data")
    parser.add_argument(
        "--from-json", metavar="DIR",
        help="Convert existing JSON cache instead of fetching from API",
    )
    args = parser.parse_args()

    if args.from_json:
        from_json(args.from_json)
    else:
        from_api()
