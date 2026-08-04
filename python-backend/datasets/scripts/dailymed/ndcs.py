import time

import pandas as pd
import requests

from .api import DailyMedAPI
from .checkpoint import load_checkpoint, save_checkpoint

from config import (
    DAILYMED,
    ENRICHED,
    ENRICH_BATCH_SIZE,
    CHECKPOINT_INTERVAL,
    REQUEST_DELAY,
    MAX_RETRIES,
)

from utils import log


api = DailyMedAPI()

INPUT = DAILYMED / "dailymed_filtered.csv"
OUTPUT = ENRICHED / "dailymed_ndcs.csv"


def fetch_ndcs(setid):
    """
    Fetch NDCs for a DailyMed SETID.
    """

    endpoint = f"/spls/{setid}/ndcs.json"

    for attempt in range(MAX_RETRIES):

        try:
            data = api.get(endpoint)
            return data.get("data", {}).get("ndcs", [])

        except requests.RequestException:

            log(f"Retry {attempt + 1}/{MAX_RETRIES} : {setid}")

            time.sleep(2)

    return []


def enrich():

    log("=" * 60)
    log("DailyMed NDC Enrichment")
    log("=" * 60)

    df = pd.read_csv(INPUT)

    start = load_checkpoint("ndcs")

    log(f"Dataset : {INPUT.name}")
    log(f"Total medicines : {len(df)}")
    log(f"Resume from : {start}")

    if start >= len(df):
        log("Dataset already completed.")
        return

    for index in range(
        start,
        min(start + ENRICH_BATCH_SIZE, len(df))
    ):

        medicine = df.iloc[index]

        setid = medicine["setid"]
        title = medicine["title"]

        log(f"[{index + 1:>6}/{len(df)}] {title[:70]}")

        ndcs = fetch_ndcs(setid)

        log(f"Found {len(ndcs)} NDC(s)")

        if not ndcs:
            continue

        for item in ndcs:

            record = pd.DataFrame([{
                "setid": setid,
                "title": title,
                "ndc": item.get("ndc")
            }])

            record.to_csv(
                OUTPUT,
                mode="a",
                header=not OUTPUT.exists(),
                index=False
            )

        if (index + 1) % CHECKPOINT_INTERVAL == 0:

            save_checkpoint("ndcs", index + 1)

            log(f"Checkpoint -> {index + 1}")

        time.sleep(REQUEST_DELAY)

    save_checkpoint(
        "ndcs",
        min(start + ENRICH_BATCH_SIZE, len(df))
    )

    log("=" * 60)
    log("NDC enrichment batch completed.")
    log(f"Output -> {OUTPUT}")
    log("=" * 60)


if __name__ == "__main__":
    enrich()