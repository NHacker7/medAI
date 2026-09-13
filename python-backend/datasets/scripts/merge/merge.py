import pandas as pd

from config import CLEANED
from utils import log


OPENFDA_FILE = CLEANED / "openfda_cleaned.csv"
DAILYMED_FILE = CLEANED / "dailymed_enriched.csv"
OUTPUT_FILE = CLEANED / "medicine_master.csv"


def merge():

    log("=" * 60)
    log("Building Medicine Master Database")
    log("=" * 60)

    openfda = pd.read_csv(OPENFDA_FILE)
    dailymed = pd.read_csv(DAILYMED_FILE)

    master = openfda.merge(
        dailymed,
        left_on="spl_set_id",
        right_on="setid",
        how="left"
    )

    master.insert(
        0,
        "medicine_id",
        range(1, len(master) + 1)
    )

    master.rename(
        columns={
            "title": "dailymed_title"
        },
        inplace=True
    )

    master.to_csv(
        OUTPUT_FILE,
        index=False
    )

    log(f"Medicines : {len(master)}")
    log(f"Saved -> {OUTPUT_FILE}")
    log("=" * 60)


if __name__ == "__main__":
    merge()