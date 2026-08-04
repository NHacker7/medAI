import pandas as pd

from config import DAILYMED
from utils import log


INPUT = DAILYMED / "dailymed_full.csv"
OUTPUT = DAILYMED / "dailymed_filtered.csv"


# Products we don't want for medicine recognition
EXCLUDE_KEYWORDS = [

    # Cosmetics
    "COSMETIC",
    "BEAUTY",
    "MAKEUP",
    "FOUNDATION",
    "LIPSTICK",
    "LIP GLOSS",
    "LIP GLAZE",
    "MASCARA",
    "EYELINER",

    # Skin care
    "SUNSCREEN",
    "SPF",
    "MOISTURIZER",
    "FACE CREAM",
    "FACE WASH",
    "SERUM",

    # Personal care
    "SHAMPOO",
    "CONDITIONER",
    "SOAP",
    "BODY WASH",
    "DEODORANT",
    "ANTIPERSPIRANT",

    # Hygiene
    "HAND SANITIZER",
    "SANITIZER",

    # Dental
    "TOOTHPASTE",
    "MOUTHWASH",

    # Veterinary
    "DOG",
    "CAT",
    "VETERINARY",

    # Others
    "AIR FRESHENER",
    "CANDLE",
]


def should_keep(title):

    title = str(title).upper()

    for word in EXCLUDE_KEYWORDS:

        if word in title:
            return False

    return True


def filter_dataset():

    log("=" * 60)
    log("Filtering DailyMed Dataset")
    log("=" * 60)

    df = pd.read_csv(INPUT)

    before = len(df)

    filtered = df[
        df["title"].apply(should_keep)
    ]

    after = len(filtered)

    removed = before - after

    filtered.to_csv(
        OUTPUT,
        index=False
    )
    removed = df[
    ~df["title"].apply(should_keep)
    ]

    removed.to_csv(
        DAILYMED / "dailymed_removed.csv",
        index=False
    )
    log(f"Removed dataset -> {DAILYMED / 'dailymed_removed.csv'}")

    log(f"Original : {before}")
    log(f"Filtered : {after}")
    log(f"Removed : {len(removed)}")

    log(f"Saved -> {OUTPUT}")


if __name__ == "__main__":
    filter_dataset()