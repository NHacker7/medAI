import json
from pathlib import Path

import pandas as pd

from config import OPENFDA
from utils import log


def find_json_file():
    files = list(OPENFDA.glob("*.json"))

    if not files:
        raise FileNotFoundError("No JSON file found inside OpenFDA folder.")

    return files[0]


def explore():

    json_file = find_json_file()

    log(f"Reading: {json_file.name}")

    with open(json_file, "r", encoding="utf-8") as f:
        data = json.load(f)

    results = data.get("results", [])

    df = pd.json_normalize(results)

    print("\n" + "=" * 70)
    print("OPENFDA DATASET SUMMARY")
    print("=" * 70)

    print(f"\nRows    : {df.shape[0]}")
    print(f"Columns : {df.shape[1]}")

    print("\nColumn Names\n")
    for column in df.columns:
        print(f"• {column}")

    print("\nFirst Five Records\n")
    print(df.head())

    print("\nMissing Values\n")
    print(df.isnull().sum().sort_values(ascending=False).head(20))


if __name__ == "__main__":
    explore()