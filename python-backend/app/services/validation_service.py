from datetime import datetime
import re
from pathlib import Path

import pandas as pd


# ==========================================================
# INDIAN MEDICINE DATABASE
# ==========================================================

PROJECT_ROOT = Path(__file__).resolve().parents[3]

INDIAN_MASTER_FILE = (
    PROJECT_ROOT
    / "python-backend"
    / "datasets"
    / "indian_medicines"
    / "indian_medicine_data.csv"
)

try:
    indian_df = pd.read_csv(
        INDIAN_MASTER_FILE,
        low_memory=False
    )

    for column in [
        "name",
        "short_composition1",
        "short_composition2",
    ]:
        if column in indian_df.columns:
            indian_df[column] = (
                indian_df[column]
                .fillna("")
                .astype(str)
            )

    print(
        f"[Validation Medicine DB] Loaded "
        f"{len(indian_df)} medicines"
    )

except Exception as e:

    indian_df = pd.DataFrame()

    print(
        f"[Validation Medicine DB] Failed to load: {e}"
    )


# ==========================================================
# NORMALIZE TEXT
# ==========================================================

def normalize_medicine_name(name: str) -> str:

    if not name:
        return ""

    text = str(name).lower()

    text = re.sub(
        r"[^a-z0-9]+",
        " ",
        text
    )

    return " ".join(
        text.split()
    )


# ==========================================================
# EXTRACT STRENGTH
# ==========================================================

def extract_strength(text: str) -> list[str]:

    if not text:
        return []

    text = str(text).lower()

    matches = re.findall(
        r"\d+(?:\.\d+)?\s*(?:mg|mcg|g|ml|%)?",
        text
    )

    return [
        normalize_medicine_name(match)
        for match in matches
    ]


# ==========================================================
# FIND INDIAN MEDICINE
# ==========================================================

def find_indian_medicine(
    medicine_name: str
):

    if indian_df.empty:
        return None

    query = normalize_medicine_name(
        medicine_name
    )

    if not query:
        return None

    # ------------------------------------------------------
    # Exact medicine name
    # ------------------------------------------------------

    for _, row in indian_df.iterrows():

        name = normalize_medicine_name(
            row.get("name", "")
        )

        if name == query:
            return row

    # ------------------------------------------------------
    # Medicine name contains complete query
    # ------------------------------------------------------

    candidates = []

    for _, row in indian_df.iterrows():

        name = normalize_medicine_name(
            row.get("name", "")
        )

        if query in name:

            candidates.append(row)

    if candidates:

        # Prefer shortest matching name
        candidates.sort(
            key=lambda row: len(
                normalize_medicine_name(
                    row.get("name", "")
                )
            )
        )

        return candidates[0]

    return None


# ==========================================================
# GET ACTIVE INGREDIENTS
# ==========================================================

def get_medicine_ingredients(
    medicine_name: str
):

    row = find_indian_medicine(
        medicine_name
    )

    if row is None:
        return []

    ingredients = []

    composition1 = str(
        row.get(
            "short_composition1",
            ""
        )
    ).strip()

    composition2 = str(
        row.get(
            "short_composition2",
            ""
        )
    ).strip()

    if composition1:
        ingredients.append(
            composition1
        )

    if composition2:
        ingredients.append(
            composition2
        )

    return ingredients


# ==========================================================
# CHECK INGREDIENT MATCH
# ==========================================================

def ingredient_matches(
    expected_medicine: str,
    detected_medicine: str
):

    expected_ingredients = (
        get_medicine_ingredients(
            expected_medicine
        )
    )

    if not expected_ingredients:
        return False

    detected = normalize_medicine_name(
        detected_medicine
    )

    if not detected:
        return False

    # ------------------------------------------------------
    # Check whether detected medicine name appears
    # inside an expected active ingredient.
    #
    # Example:
    # expected = Dolo 650 Tablet
    # ingredient = Paracetamol (650mg)
    # detected = Paracetamol
    # ------------------------------------------------------

    for ingredient in expected_ingredients:

        ingredient_normalized = (
            normalize_medicine_name(
                ingredient
            )
        )

        ingredient_words = (
            ingredient_normalized.split()
        )

        detected_words = (
            detected.split()
        )

        # Check name/ingredient word overlap
        if all(
            word in ingredient_words
            for word in detected_words
        ):
            return True

        # Also allow direct substring match
        if detected in ingredient_normalized:
            return True

    return False


# ==========================================================
# VALIDATE DETECTED MEDICINE
# ==========================================================

def validate_detected_medicine(
    expected_medicine: str,
    detected_medicine: str | None,
    confidence: float = 0.0,
):

    expected = normalize_medicine_name(
        expected_medicine
    )

    detected = normalize_medicine_name(
        detected_medicine
    )

    # ------------------------------------------------------
    # No medicine detected
    # ------------------------------------------------------

    if not detected:

        return {
            "status": "unknown",
            "valid": False,
            "message": "No medicine detected.",
            "expected_medicine": expected_medicine,
            "detected_medicine": None,
            "confidence": confidence,
            "timestamp": datetime.now().isoformat(),
        }

    # ------------------------------------------------------
    # Low confidence
    # ------------------------------------------------------

    if confidence < 50:

        return {
            "status": "unknown",
            "valid": False,
            "message": "Medicine detection confidence is too low.",
            "expected_medicine": expected_medicine,
            "detected_medicine": detected_medicine,
            "confidence": confidence,
            "timestamp": datetime.now().isoformat(),
        }

    # ------------------------------------------------------
    # Exact match
    # ------------------------------------------------------

    if expected == detected:

        return {
            "status": "correct",
            "valid": True,
            "message": "Correct medicine detected.",
            "expected_medicine": expected_medicine,
            "detected_medicine": detected_medicine,
            "confidence": confidence,
            "timestamp": datetime.now().isoformat(),
        }

    # ------------------------------------------------------
    # Direct partial match
    # ------------------------------------------------------

    if (
        expected in detected
        or detected in expected
    ):

        return {
            "status": "correct",
            "valid": True,
            "message": "Matching medicine detected.",
            "expected_medicine": expected_medicine,
            "detected_medicine": detected_medicine,
            "confidence": confidence,
            "timestamp": datetime.now().isoformat(),
        }

    # ------------------------------------------------------
    # Ingredient-based match
    # ------------------------------------------------------

    if ingredient_matches(
        expected_medicine,
        detected_medicine
    ):

        return {
            "status": "correct",
            "valid": True,
            "message": (
                f'Detected "{detected_medicine}" '
                f'matches an active ingredient of '
                f'"{expected_medicine}".'
            ),
            "expected_medicine": expected_medicine,
            "detected_medicine": detected_medicine,
            "confidence": confidence,
            "timestamp": datetime.now().isoformat(),
        }

    # ------------------------------------------------------
    # Wrong medicine
    # ------------------------------------------------------

    return {
        "status": "wrong",
        "valid": False,
        "message": (
            f'Detected "{detected_medicine}" '
            f'but the schedule expects '
            f'"{expected_medicine}".'
        ),
        "expected_medicine": expected_medicine,
        "detected_medicine": detected_medicine,
        "confidence": confidence,
        "timestamp": datetime.now().isoformat(),
    }