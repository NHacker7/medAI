from pathlib import Path
import csv
import re
from difflib import SequenceMatcher


BASE_DIR = Path(__file__).resolve().parents[2]

INDIAN_MEDICINE_DB = (
    BASE_DIR
    / "datasets"
    / "medicine_india"
    / "indian_medicine_data.csv"
)


# ---------------------------------------------------------
# Text utilities
# ---------------------------------------------------------

def normalize_text(text: str) -> str:
    """
    Convert medicine text into a comparison-friendly format.

    Examples:
        Dolo-650       -> dolo650
        Dolo 650       -> dolo650
        DOLO 650       -> dolo650
        Dolo 650mg     -> dolo650mg
    """

    if not text:
        return ""

    text = str(text).lower().strip()

    # Normalize common OCR punctuation
    text = text.replace("–", "-")
    text = text.replace("—", "-")
    text = text.replace("_", "-")

    # Remove everything except letters/numbers
    return re.sub(r"[^a-z0-9]+", "", text)


def extract_strength(text: str):
    """
    Extract medicine strength.

    Examples:
        Dolo-650       -> 650
        Dolo 650mg     -> 650
        Paracetamol 650 mg -> 650
    """

    if not text:
        return None

    match = re.search(
        r"(\d+(?:\.\d+)?)\s*(mg|mcg|g|ml|%)?",
        text.lower()
    )

    if not match:
        return None

    try:
        return float(match.group(1))
    except ValueError:
        return None


def similarity(a: str, b: str) -> float:
    a = normalize_text(a)
    b = normalize_text(b)

    if not a or not b:
        return 0.0

    if a == b:
        return 1.0

    return SequenceMatcher(None, a, b).ratio()


# ---------------------------------------------------------
# Database loading
# ---------------------------------------------------------

_medicines = None


def load_medicines():
    """
    Load Indian medicine database once and keep it in memory.
    """

    global _medicines

    if _medicines is not None:
        return _medicines

    if not INDIAN_MEDICINE_DB.exists():
        raise FileNotFoundError(
            f"Indian medicine database not found: "
            f"{INDIAN_MEDICINE_DB}"
        )

    medicines = []

    with open(
        INDIAN_MEDICINE_DB,
        "r",
        encoding="utf-8-sig",
        newline=""
    ) as file:

        reader = csv.DictReader(file)

        for row in reader:
            medicines.append(row)

    _medicines = medicines

    return medicines


# ---------------------------------------------------------
# Candidate scoring
# ---------------------------------------------------------

def score_candidate(
    ocr_text: str,
    ocr_confidence: float,
    medicine: dict
):
    """
    Score an Indian medicine candidate.

    Name similarity is important, but strength matching gets
    a significant bonus because medicines often have very
    similar names but different strengths.
    """

    medicine_name = medicine.get("name", "") or ""

    if not medicine_name:
        return 0.0, {}

    name_score = similarity(
        ocr_text,
        medicine_name
    )

    ocr_strength = extract_strength(ocr_text)
    medicine_strength = extract_strength(medicine_name)

    strength_score = 0.0

    if (
        ocr_strength is not None
        and medicine_strength is not None
    ):
        if ocr_strength == medicine_strength:
            strength_score = 1.0
        else:
            strength_score = 0.0

    # Look for exact normalized match first
    normalized_ocr = normalize_text(ocr_text)
    normalized_name = normalize_text(medicine_name)

    exact_match = (
        normalized_ocr == normalized_name
        and normalized_ocr != ""
    )

    if exact_match:
        name_score = 1.0

    # Main score
    score = (
        name_score * 0.65
        + strength_score * 0.25
        + min(max(ocr_confidence, 0.0), 1.0) * 0.10
    )

    # Strong bonus for exact name
    if exact_match:
        score += 0.10

    score = min(score, 1.0)

    details = {
        "name_similarity": round(name_score, 4),
        "strength_match": strength_score == 1.0,
        "ocr_strength": ocr_strength,
        "medicine_strength": medicine_strength,
        "exact_name_match": exact_match,
    }

    return score, details


# ---------------------------------------------------------
# Search
# ---------------------------------------------------------

def search_indian_medicines(
    ocr_results,
    limit: int = 10,
    minimum_score: float = 0.45
):
    """
    Search Indian medicine database using OCR results.

    ocr_results format:

        [
            {
                "text": "Dolo-650",
                "confidence": 0.67
            }
        ]
    """

    medicines = load_medicines()

    ranked = []

    for medicine in medicines:

        best_score = 0.0
        best_details = {}
        best_ocr_text = ""

        for ocr in ocr_results:

            text = str(
                ocr.get("text", "")
            ).strip()

            confidence = float(
                ocr.get("confidence", 0.0)
            )

            if not text:
                continue

            # Ignore extremely weak OCR
            if confidence < 0.20:
                continue

            score, details = score_candidate(
                text,
                confidence,
                medicine
            )

            if score > best_score:
                best_score = score
                best_details = details
                best_ocr_text = text

        if best_score >= minimum_score:

            ranked.append({
                "score": round(best_score, 4),
                "ocr_text": best_ocr_text,
                "match_details": best_details,
                "medicine": {
                    "id": medicine.get("id"),
                    "name": medicine.get("name"),
                    "price": medicine.get("price(₹)"),
                    "is_discontinued": medicine.get(
                        "Is_discontinued"
                    ),
                    "manufacturer_name": medicine.get(
                        "manufacturer_name"
                    ),
                    "type": medicine.get("type"),
                    "pack_size_label": medicine.get(
                        "pack_size_label"
                    ),
                    "short_composition1": medicine.get(
                        "short_composition1"
                    ),
                    "short_composition2": medicine.get(
                        "short_composition2"
                    ),
                }
            })

    ranked.sort(
        key=lambda item: item["score"],
        reverse=True
    )

    return ranked[:limit]


# ---------------------------------------------------------
# Identify medicine
# ---------------------------------------------------------

def identify_indian_medicine(
    ocr_results,
    minimum_confirm_score: float = 0.80
):
    """
    Return the best Indian medicine candidate.

    Safety behavior:
        - High confidence -> identified
        - Medium confidence -> verify
        - Low confidence -> unknown
    """

    results = search_indian_medicines(
        ocr_results,
        limit=10
    )

    if not results:
        return {
            "status": "UNKNOWN",
            "medicine": None,
            "confidence": 0.0,
            "candidates": [],
        }

    best = results[0]

    confidence = best["score"]

    # Check whether the second candidate is too close.
    ambiguous = False

    if len(results) >= 2:

        second = results[1]

        if (
            best["score"] - second["score"]
            < 0.05
        ):
            ambiguous = True

    if confidence >= minimum_confirm_score and not ambiguous:

        status = "IDENTIFIED"

    elif confidence >= 0.60:

        status = "VERIFY"

    else:

        status = "UNKNOWN"

    return {
        "status": status,
        "medicine": (
            best["medicine"]
            if status != "UNKNOWN"
            else None
        ),
        "confidence": round(confidence, 4),
        "ocr_text": best["ocr_text"],
        "match_details": best["match_details"],
        "candidates": results,
    }