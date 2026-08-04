import json
import time
from pathlib import Path

import pandas as pd
import requests

from .api import DailyMedAPI
from config import DAILYMED
from utils import log

api = DailyMedAPI()

CHECKPOINT = DAILYMED / "download_checkpoint.json"
OUTPUT = DAILYMED / "dailymed_full.csv"


def load_checkpoint():
    if CHECKPOINT.exists():
        with open(CHECKPOINT, "r") as f:
            return json.load(f)
    return {"page": 1}


def save_checkpoint(page):
    with open(CHECKPOINT, "w") as f:
        json.dump({"page": page}, f, indent=2)


def download_page(page, retries=5):

    for attempt in range(retries):

        try:
            return api.get(
                "/spls.json",
                params={"page": page}
            )

        except requests.exceptions.RequestException as e:

            log(f"Retry {attempt+1}/{retries} for page {page}")

            time.sleep(3)

    raise RuntimeError(f"Failed downloading page {page}")


def download_all():

    log("=" * 60)
    log("Downloading Complete DailyMed Dataset")
    log("=" * 60)

    checkpoint = load_checkpoint()

    page = checkpoint["page"]

    medicines = []

    seen_setids = set()

    if OUTPUT.exists():

        log("Existing CSV found. Loading...")

        old = pd.read_csv(OUTPUT)

        medicines = old.to_dict("records")

        if "setid" in old.columns:
            seen_setids = set(old["setid"])

        log(f"Loaded {len(medicines)} existing medicines")

    while True:

        log(f"Downloading page {page}")

        data = download_page(page)

        rows = data.get("data", [])

        if len(rows) == 0:

            log("No more medicines returned.")

            break

        new_count = 0

        for row in rows:

            setid = row.get("setid")

            if setid in seen_setids:
                continue

            seen_setids.add(setid)

            medicines.append(row)

            new_count += 1

        log(f"Added {new_count} new medicines")

        if page % 10 == 0:

            pd.DataFrame(medicines).to_csv(
                OUTPUT,
                index=False
            )

            save_checkpoint(page)

            log(f"Checkpoint saved at page {page}")

        metadata = data.get("metadata", {})

        next_page = metadata.get("next_page")

        if next_page in [None, "null", "", 0]:

            log("Reached final page.")

            break

        page += 1

    df = pd.DataFrame(medicines)

    df.to_csv(
        OUTPUT,
        index=False
    )

    save_checkpoint(page)

    log("=" * 60)
    log(f"Finished downloading {len(df)} medicines")
    log(f"Saved -> {OUTPUT}")
    log("=" * 60)


if __name__ == "__main__":
    download_all()