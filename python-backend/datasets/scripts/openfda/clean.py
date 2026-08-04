import json
import pandas as pd

from config import OPENFDA, CLEANED
from utils import log


# -------------------------------------------------
# LOAD DATA
# -------------------------------------------------
def load_openfda():
    """Load OpenFDA JSON into a DataFrame."""

    json_files = list(OPENFDA.glob("*.json"))

    if not json_files:
        raise FileNotFoundError("No OpenFDA JSON file found.")

    json_file = json_files[0]

    log(f"Loading {json_file.name}")

    with open(json_file, "r", encoding="utf-8") as f:
        data = json.load(f)

    results = data.get("results", [])

    df = pd.json_normalize(results)

    return df


# -------------------------------------------------
# SELECT COLUMNS
# -------------------------------------------------
def select_columns(df):
    """Keep only required columns."""

    columns = {
        "product_ndc": "ndc_code",
        "generic_name": "generic_name",
        "brand_name": "brand_name",
        "labeler_name": "manufacturer",
        "dosage_form": "dosage_form",
        "route": "route",
        "active_ingredients": "active_ingredients",
        "marketing_category": "marketing_category",
        "product_type": "product_type",
        "openfda.rxcui": "rxcui",
        "openfda.spl_set_id": "spl_set_id",
        "openfda.upc": "upc",
    }

    available = [c for c in columns if c in df.columns]

    missing = [c for c in columns if c not in df.columns]

    if missing:
        log(f"Skipped missing columns: {missing}")

    df = df[available].copy()

    df.rename(
        columns={c: columns[c] for c in available},
        inplace=True
    )

    return df


# -------------------------------------------------
# REMOVE MISSING VALUES
# -------------------------------------------------
def remove_missing_generic(df):

    before = len(df)

    df = df.dropna(subset=["generic_name"])

    log(f"Removed {before-len(df)} rows (missing generic name)")

    return df


def remove_missing_brand(df):

    before = len(df)

    df = df.dropna(subset=["brand_name"])

    log(f"Removed {before-len(df)} rows (missing brand name)")

    return df


# -------------------------------------------------
# NORMALIZE TEXT
# -------------------------------------------------
def normalize_text(df):

    text_columns = [
        "generic_name",
        "brand_name",
        "manufacturer",
        "dosage_form",
        "marketing_category",
        "product_type",
    ]

    for col in text_columns:

        if col in df.columns:

            df[col] = (
                df[col]
                .fillna("")
                .astype(str)
                .str.strip()
            )

    return df


# -------------------------------------------------
# FLATTEN ACTIVE INGREDIENTS
# -------------------------------------------------
def flatten_active_ingredients(df):

    if "active_ingredients" not in df.columns:
        return df

    def extract(value):

        if isinstance(value, list):

            names = []

            for item in value:

                if isinstance(item,dict):

                    names.append(item.get("name",""))

                else:

                    names.append(str(item))

            return ", ".join(filter(None,names))

        return value

    df["active_ingredients"] = df["active_ingredients"].apply(extract)

    return df


# -------------------------------------------------
# CONVERT LISTS / DICTS
# -------------------------------------------------
def convert_lists_to_strings(df):

    def convert(value):

        if isinstance(value,list):

            return ", ".join(map(str,value))

        elif isinstance(value,dict):

            return json.dumps(value)

        return value

    for col in df.columns:

        df[col] = df[col].apply(convert)

    return df


# -------------------------------------------------
# DEBUG TYPES
# -------------------------------------------------
def inspect_column_types(df):

    print("\n========== COLUMN TYPES ==========\n")

    for col in df.columns:

        sample = df[col].dropna()

        if len(sample)==0:
            continue

        print(f"{col:<25} {type(sample.iloc[0])}")


# -------------------------------------------------
# REMOVE DUPLICATES
# -------------------------------------------------
def remove_duplicates(df):
    """Remove duplicate rows while preserving unique NDCs."""

    if "ndc_code" in df.columns:

        before = len(df)

        df = df.drop_duplicates(subset=["ndc_code"])

        removed = before - len(df)

        log(f"Removed {removed} duplicate NDC records")

        return df

    log("ndc_code not found. Skipping duplicate removal.")

    return df

# -------------------------------------------------
# SAVE
# -------------------------------------------------
def save_csv(df):

    output = CLEANED / "openfda_cleaned.csv"

    df.to_csv(output,index=False)

    log(f"Saved cleaned dataset -> {output}")


# -------------------------------------------------
# MAIN PIPELINE
# -------------------------------------------------
def clean():

    log("="*60)
    log("Starting OpenFDA Cleaning")
    log("="*60)

    df = load_openfda()

    log(f"Original rows : {len(df)}")

    df = select_columns(df)

    df = remove_missing_generic(df)

    df = remove_missing_brand(df)

    df = normalize_text(df)

    df = flatten_active_ingredients(df)

    df = convert_lists_to_strings(df)

    inspect_column_types(df)

    log("Checking sample values...")

    print("route :",type(df["route"].iloc[0]),df["route"].iloc[0])

    print("rxcui :",type(df["rxcui"].iloc[0]),df["rxcui"].iloc[0])

    print("upc :",type(df["upc"].iloc[0]),df["upc"].iloc[0])

    df = remove_duplicates(df)

    log(f"Final rows : {len(df)}")

    save_csv(df)

    log("OpenFDA cleaning completed successfully.")


if __name__=="__main__":
    clean()