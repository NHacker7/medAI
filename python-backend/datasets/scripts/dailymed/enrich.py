import pandas as pd

from config import DAILYMED, CLEANED
from utils import log

from .enricher import enrich_medicine


# ==========================================================
# Configuration
# ==========================================================

INPUT_FILE = DAILYMED / "dailymed_full.csv"
OUTPUT_FILE = CLEANED / "dailymed_enriched.csv"

TEST_MODE = False
TEST_LIMIT = 10


# ==========================================================
# Main Enrichment Pipeline
# ==========================================================

def enrich():

    log("=" * 60)
    log("Starting DailyMed Enrichment")
    log("=" * 60)

    df = pd.read_csv(INPUT_FILE)

    if TEST_MODE:
        log(f"TEST MODE ENABLED ({TEST_LIMIT} medicines)")
        df = df.head(TEST_LIMIT)

    records = []

    total = len(df)

    for index, row in df.iterrows():

        setid = row["setid"]

        log(f"[{index + 1}/{total}] {row['title']}")

        try:

            data = enrich_medicine(setid)

            records.append({

                "setid": setid,

                "title": row["title"],

                "published_date": row["published_date"],

                "spl_version": row["spl_version"],

                "ndc_count": len(data["ndcs"]),

                "package_count": len(data["packaging"]),

                "image_count": len(data["media"]),

                "history_versions": len(data["history"])

            })

        except Exception as e:

            log(f"Failed : {e}")

    result = pd.DataFrame(records)

    result.to_csv(
        OUTPUT_FILE,
        index=False
    )

    log("=" * 60)
    log(f"Saved -> {OUTPUT_FILE}")
    log(f"Successfully enriched {len(result)} medicines")
    log("=" * 60)


if __name__ == "__main__":
    enrich()