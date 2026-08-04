import json
import pandas as pd

from config import DAILYMED, REPORTS
from utils import log


def explore():

    log("=" * 60)
    log("DailyMed Dataset Exploration")
    log("=" * 60)

    df = pd.read_csv(
        DAILYMED / "dailymed_full.csv"
    )

    report = {}

    report["rows"] = len(df)

    report["columns"] = len(df.columns)

    report["column_names"] = list(df.columns)

    report["missing_values"] = (
        df.isnull()
        .sum()
        .to_dict()
    )

    report["duplicate_setid"] = int(
        df["setid"].duplicated().sum()
    )

    report["duplicate_title"] = int(
        df["title"].duplicated().sum()
    )

    report["unique_titles"] = int(
        df["title"].nunique()
    )

    report["unique_setids"] = int(
        df["setid"].nunique()
    )

    report["first_date"] = str(
        df["published_date"].min()
    )

    report["last_date"] = str(
        df["published_date"].max()
    )

    report["top_10_titles"] = (
        df["title"]
        .value_counts()
        .head(10)
        .to_dict()
    )

    report_path = REPORTS / "dailymed_report.json"

    with open(report_path, "w", encoding="utf-8") as f:

        json.dump(
            report,
            f,
            indent=4
        )

    print()

    print("=" * 60)

    print("ROWS:", report["rows"])

    print("COLUMNS:", report["columns"])

    print()

    print("Duplicate SETIDs :", report["duplicate_setid"])

    print("Duplicate Titles :", report["duplicate_title"])

    print()

    print("Unique Titles :", report["unique_titles"])

    print("Unique SETIDs :", report["unique_setids"])

    print()

    print("Missing Values")

    print(df.isnull().sum())

    print()

    print("Saved report ->")

    print(report_path)


if __name__ == "__main__":

    explore()