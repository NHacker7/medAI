from pathlib import Path

import numpy as np
import pandas as pd

from app.database.supabase import supabase


# ==========================================================
# DATABASE FILES
# ==========================================================

PROJECT_ROOT = Path(__file__).resolve().parents[3]

GLOBAL_MASTER_FILE = (
    PROJECT_ROOT
    / "python-backend"
    / "datasets"
    / "medicine_cleaned"
    / "medicine_master.csv"
)

INDIAN_MASTER_FILE = (
    PROJECT_ROOT
    / "python-backend"
    / "datasets"
    / "indian_medicines"
    / "indian_medicine_data.csv"
)


# ==========================================================
# LOAD GLOBAL MEDICINE DATABASE
# ==========================================================

try:

    global_df = pd.read_csv(
        GLOBAL_MASTER_FILE,
        low_memory=False
    )

    global_columns = [
        "ndc_code",
        "generic_name",
        "brand_name",
        "manufacturer",
        "dosage_form",
        "route",
        "active_ingredients",
        "marketing_category",
        "product_type",
        "rxcui",
        "spl_set_id",
        "upc",
        "dailymed_title",
    ]

    for column in global_columns:

        if column in global_df.columns:

            global_df[column] = (
                global_df[column]
                .fillna("")
                .astype(str)
            )

    print(
        f"[Global Medicine DB] Loaded "
        f"{len(global_df)} medicines"
    )

except Exception as e:

    global_df = pd.DataFrame()

    print(
        f"[Global Medicine DB] Failed to load: {e}"
    )


# ==========================================================
# LOAD INDIAN MEDICINE DATABASE
# ==========================================================

try:

    indian_df = pd.read_csv(
        INDIAN_MASTER_FILE,
        low_memory=False
    )

    # Remove discontinued medicines
    if "Is_discontinued" in indian_df.columns:

        indian_df["Is_discontinued"] = (
            indian_df["Is_discontinued"]
            .fillna(False)
            .astype(str)
            .str.lower()
            .isin(["true", "1", "yes"])
        )

        indian_df = indian_df[
            indian_df["Is_discontinued"] == False
        ].copy()

    # Clean important text fields
    indian_columns = [
        "name",
        "manufacturer_name",
        "type",
        "pack_size_label",
        "short_composition1",
        "short_composition2",
    ]

    for column in indian_columns:

        if column in indian_df.columns:

            indian_df[column] = (
                indian_df[column]
                .fillna("")
                .astype(str)
            )

    print(
        f"[Indian Medicine DB] Loaded "
        f"{len(indian_df)} active medicines"
    )

except Exception as e:

    indian_df = pd.DataFrame()

    print(
        f"[Indian Medicine DB] Failed to load: {e}"
    )


# ==========================================================
# VALUE CLEANING
# ==========================================================

def clean_value(value):

    if value is None:
        return None

    try:

        if pd.isna(value):
            return None

    except (TypeError, ValueError):

        pass

    if isinstance(value, np.integer):
        return int(value)

    if isinstance(value, np.floating):
        return float(value)

    if isinstance(value, np.bool_):
        return bool(value)

    return value


# ==========================================================
# NORMALIZE SEARCH TEXT
# ==========================================================

def normalize_text(value):

    if value is None:
        return ""

    text = str(value).lower()

    replacements = {
        "-": " ",
        "/": " ",
        ",": " ",
        "(": " ",
        ")": " ",
        ".": " ",
        "+": " ",
    }

    for old, new in replacements.items():

        text = text.replace(old, new)

    return " ".join(
        text.split()
    )


# ==========================================================
# GLOBAL MEDICINE → DICTIONARY
# ==========================================================

def global_medicine_to_dict(row):

    return {

        "source": "global",

        "medicine_id": clean_value(
            row.get("medicine_id")
        ),

        "ndc_code": clean_value(
            row.get("ndc_code")
        ),

        "generic_name": clean_value(
            row.get("generic_name")
        ),

        "brand_name": clean_value(
            row.get("brand_name")
        ),

        "manufacturer": clean_value(
            row.get("manufacturer")
        ),

        "dosage_form": clean_value(
            row.get("dosage_form")
        ),

        "route": clean_value(
            row.get("route")
        ),

        "active_ingredients": clean_value(
            row.get("active_ingredients")
        ),

        "marketing_category": clean_value(
            row.get("marketing_category")
        ),

        "product_type": clean_value(
            row.get("product_type")
        ),

        "rxcui": clean_value(
            row.get("rxcui")
        ),

        "spl_set_id": clean_value(
            row.get("spl_set_id")
        ),

        "upc": clean_value(
            row.get("upc")
        ),

        "dailymed_title": clean_value(
            row.get("dailymed_title")
        ),

        "published_date": clean_value(
            row.get("published_date")
        ),

        "spl_version": clean_value(
            row.get("spl_version")
        ),

        "ndc_count": clean_value(
            row.get("ndc_count")
        ),

        "package_count": clean_value(
            row.get("package_count")
        ),

        "image_count": clean_value(
            row.get("image_count")
        ),

        "history_versions": clean_value(
            row.get("history_versions")
        ),
    }


# ==========================================================
# INDIAN MEDICINE → DICTIONARY
# ==========================================================

def indian_medicine_to_dict(row):

    composition1 = clean_value(
        row.get("short_composition1")
    )

    composition2 = clean_value(
        row.get("short_composition2")
    )

    compositions = []

    if composition1:
        compositions.append(
            str(composition1)
        )

    if composition2:
        compositions.append(
            str(composition2)
        )

    active_ingredients = " + ".join(
        compositions
    )

    return {

        "source": "india",

        "medicine_id": (
            f"IND-{clean_value(row.get('id'))}"
        ),

        "ndc_code": None,

        "generic_name": active_ingredients,

        "brand_name": clean_value(
            row.get("name")
        ),

        "manufacturer": clean_value(
            row.get("manufacturer_name")
        ),

        "dosage_form": clean_value(
            row.get("type")
        ),

        "route": None,

        "active_ingredients": active_ingredients,

        "marketing_category": None,

        "product_type": clean_value(
            row.get("type")
        ),

        "rxcui": None,

        "spl_set_id": None,

        "upc": None,

        "dailymed_title": None,

        "published_date": None,

        "spl_version": None,

        "ndc_count": None,

        "package_count": None,

        "image_count": None,

        "history_versions": None,

        # Indian-specific information
        "price_inr": clean_value(
            row.get("price(₹)")
        ),

        "pack_size": clean_value(
            row.get("pack_size_label")
        ),

        "discontinued": clean_value(
            row.get("Is_discontinued")
        ),
    }


# ==========================================================
# SEARCH INDIAN MEDICINES
# ==========================================================

def search_indian_medicines(
    query: str,
    limit: int = 10
):
    if indian_df.empty:
        return []

    query = normalize_text(query)

    if not query:
        return []

    tokens = [
        token
        for token in query.split()
        if len(token) >= 2
    ]

    if not tokens:
        return []

    scored_results = []

    for index, row in indian_df.iterrows():

        name = normalize_text(
            row.get("name", "")
        )

        composition1 = normalize_text(
            row.get("short_composition1", "")
        )

        composition2 = normalize_text(
            row.get("short_composition2", "")
        )

        manufacturer = normalize_text(
            row.get("manufacturer_name", "")
        )

        # Create individual words from medicine name
        name_words = name.split()

        score = 0

        # ==================================================
        # 1. EXACT MEDICINE NAME
        # Example:
        # query = "dolo 650 tablet"
        # name  = "dolo 650 tablet"
        # ==================================================

        if name == query:
            score += 10000

        # ==================================================
        # 2. NAME STARTS WITH QUERY
        # Example:
        # "dolo" → "dolo 650 tablet"
        # ==================================================

        elif name.startswith(query + " "):
            score += 5000

        # ==================================================
        # 3. FIRST WORD EXACTLY MATCHES
        # Example:
        # "dolo" → "dolo 650 tablet"
        # ==================================================

        elif name_words and name_words[0] == query:
            score += 4000

        # ==================================================
        # 4. WHOLE WORD MATCH
        # Example:
        # "dolo" matches "dolo 650"
        # but NOT "aldoloc"
        # ==================================================

        if query in name_words:
            score += 3000

        # ==================================================
        # 5. QUERY APPEARS INSIDE NAME
        # Lower priority.
        # This catches things like "Aeldolo"
        # ==================================================

        elif query in name:
            score += 500

        # ==================================================
        # 6. TOKEN MATCHING
        # ==================================================

        matched_name_tokens = 0

        for token in tokens:

            if token in name_words:
                matched_name_tokens += 1
                score += 1000

            elif token in name:
                matched_name_tokens += 1
                score += 300

        # ==================================================
        # 7. COMPOSITION MATCHING
        # ==================================================

        for token in tokens:

            if token in composition1:
                score += 100

            if token in composition2:
                score += 100

        # ==================================================
        # 8. MANUFACTURER MATCH
        # ==================================================

        if query in manufacturer:
            score += 20

        # ==================================================
        # ONLY KEEP RELEVANT RESULTS
        # ==================================================

        if score > 0:

            scored_results.append(
                (
                    index,
                    score
                )
            )

    if not scored_results:
        return []

    # ======================================================
    # SORT BY SCORE
    # ======================================================

    scored_results.sort(
        key=lambda item: item[1],
        reverse=True
    )

    selected_indices = [
        index
        for index, score in scored_results[:limit]
    ]

    results = indian_df.loc[
        selected_indices
    ]

    return [
        indian_medicine_to_dict(row)
        for _, row in results.iterrows()
    ]
# ==========================================================
# SEARCH GLOBAL MEDICINES
# ==========================================================

def search_global_medicines(
    query: str,
    limit: int = 10
):

    if global_df.empty:
        return []

    query = normalize_text(query)

    if not query:
        return []

    columns = [
        column
        for column in [
            "generic_name",
            "brand_name",
            "active_ingredients",
            "dailymed_title",
            "manufacturer",
            "dosage_form",
        ]
        if column in global_df.columns
    ]

    mask = pd.Series(
        False,
        index=global_df.index
    )

    for column in columns:

        values = (
            global_df[column]
            .map(normalize_text)
        )

        mask |= values.str.contains(
            query,
            na=False,
            regex=False
        )

    results = global_df[
        mask
    ].copy()

    if results.empty:

        # Token-based fallback
        tokens = [
            token
            for token in query.split()
            if len(token) >= 2
        ]

        if tokens:

            scores = []

            for index, row in global_df.iterrows():

                searchable_text = " ".join(
                    normalize_text(
                        row.get(column, "")
                    )
                    for column in columns
                )

                score = sum(
                    token in searchable_text
                    for token in tokens
                )

                if score > 0:

                    scores.append(
                        (
                            index,
                            score
                        )
                    )

            scores.sort(
                key=lambda item: item[1],
                reverse=True
            )

            results = global_df.loc[
                [
                    index
                    for index, score
                    in scores[:limit]
                ]
            ]

    else:

        results = results.head(limit)

    if "medicine_id" in results.columns:

        results = results.drop_duplicates(
            subset=["medicine_id"],
            keep="first"
        )

    return [
        global_medicine_to_dict(row)
        for _, row in results.head(limit).iterrows()
    ]


# ==========================================================
# COMBINED MEDICINE SEARCH
# ==========================================================

def search_medicines(
    query: str,
    limit: int = 10
):

    if not query or not str(query).strip():

        return []

    # ------------------------------------------------------
    # Indian medicines FIRST
    # ------------------------------------------------------

    indian_results = search_indian_medicines(
        query=query,
        limit=limit
    )

    # ------------------------------------------------------
    # If India has enough results, return them
    # ------------------------------------------------------

    if len(indian_results) >= limit:

        return indian_results[:limit]

    # ------------------------------------------------------
    # Fill remaining results from global database
    # ------------------------------------------------------

    remaining = limit - len(
        indian_results
    )

    global_results = search_global_medicines(
        query=query,
        limit=remaining
    )

    return (
        indian_results
        + global_results
    )[:limit]


# ==========================================================
# ADD MEDICINE TO SUPABASE
# ==========================================================

def add_medicine(data: dict):

    response = (
        supabase
        .table("medicines")
        .insert(data)
        .execute()
    )

    return response.data


# ==========================================================
# VALIDATE MEDICINE
# ==========================================================

def validate_medicine(
    medicine_name: str
):

    if not medicine_name:

        return {
            "valid": False,
            "message": "Medicine name is required.",
            "medicine": None
        }

    query = normalize_text(
        medicine_name
    )

    # ------------------------------------------------------
    # FIRST: Search Indian medicines
    # ------------------------------------------------------

    indian_results = search_indian_medicines(
        query=query,
        limit=1
    )

    if indian_results:

        return {
            "valid": True,
            "message": "Medicine found in Indian medicine database.",
            "medicine": indian_results[0]
        }

    # ------------------------------------------------------
    # SECOND: Search global medicines
    # ------------------------------------------------------

    global_results = search_global_medicines(
        query=query,
        limit=1
    )

    if global_results:

        return {
            "valid": True,
            "message": "Medicine found in global medicine database.",
            "medicine": global_results[0]
        }

    # ------------------------------------------------------
    # Not found
    # ------------------------------------------------------

    return {
        "valid": False,
        "message": "Medicine not found in medicine databases.",
        "medicine": None
    }