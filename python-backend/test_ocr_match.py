import csv
import re
import sys
from pathlib import Path
from difflib import SequenceMatcher


# ---------------------------------------------------------
# Paths
# ---------------------------------------------------------

BASE_DIR = Path(__file__).resolve().parent

MEDICINE_DB = (
    BASE_DIR
    / "datasets"
    / "medicine_cleaned"
    / "medicine_master.csv"
)


# ---------------------------------------------------------
# Text normalization
# ---------------------------------------------------------

def normalize_text(text: str) -> str:
    """
    Normalize OCR/database text so that small differences such as:

        Dolo 650
        Dolo-650
        dolo 650

    become comparable.
    """

    text = text.lower()

    # Common OCR cleanup
    replacements = {
        "–": "-",
        "—": "-",
        "_": "-",
    }

    for old, new in replacements.items():
        text = text.replace(old, new)

    # Keep only letters and numbers
    text = re.sub(r"[^a-z0-9]+", "", text)

    return text


def similarity(a: str, b: str) -> float:
    return SequenceMatcher(
        None,
        normalize_text(a),
        normalize_text(b)
    ).ratio()


# ---------------------------------------------------------
# Load medicine database
# ---------------------------------------------------------

def load_medicines():
    if not MEDICINE_DB.exists():
        print("ERROR: Medicine database not found:")
        print(MEDICINE_DB)
        sys.exit(1)

    print("Loading medicine database...")
    print(MEDICINE_DB)

    medicines = []

    with open(
        MEDICINE_DB,
        "r",
        encoding="utf-8-sig",
        newline=""
    ) as f:

        reader = csv.DictReader(f)

        for row in reader:
            medicines.append(row)

    print(f"Loaded medicines: {len(medicines)}")

    return medicines


# ---------------------------------------------------------
# Match OCR text against medicine database
# ---------------------------------------------------------

def find_matches(ocr_results, medicines, top_k=10):

    candidates = []

    for bbox, text, confidence in ocr_results:

        # Ignore extremely weak OCR
        if confidence < 0.30:
            continue

        cleaned_ocr = normalize_text(text)

        if len(cleaned_ocr) < 3:
            continue

        candidates.append({
            "text": text,
            "confidence": confidence,
            "normalized": cleaned_ocr,
        })

    print("\nOCR candidates used for matching:")
    print("-" * 60)

    for item in candidates:
        print(
            f"{item['text']!r} "
            f"(OCR confidence={item['confidence']:.4f})"
        )

    ranked = []

    for medicine in medicines:

        brand = medicine.get("brand_name", "") or ""
        generic = medicine.get("generic_name", "") or ""
        active = medicine.get("active_ingredients", "") or ""

        best_score = 0.0
        best_ocr_text = ""
        best_field = ""

        for ocr in candidates:

            ocr_text = ocr["text"]
            ocr_conf = ocr["confidence"]

            # Compare OCR against brand
            brand_score = similarity(ocr_text, brand)

            # Compare OCR against generic
            generic_score = similarity(ocr_text, generic)

            # Active ingredient can also help
            active_score = similarity(ocr_text, active)

            scores = [
                ("brand_name", brand_score),
                ("generic_name", generic_score),
                ("active_ingredients", active_score),
            ]

            field, raw_score = max(
                scores,
                key=lambda x: x[1]
            )

            # Combine visual/OCR confidence with text similarity
            combined_score = (
                raw_score * 0.75
                + ocr_conf * 0.25
            )

            if combined_score > best_score:
                best_score = combined_score
                best_ocr_text = ocr_text
                best_field = field

        if best_score > 0:
            ranked.append({
                "score": best_score,
                "ocr_text": best_ocr_text,
                "matched_field": best_field,
                "medicine": medicine,
            })

    ranked.sort(
        key=lambda x: x["score"],
        reverse=True
    )

    return ranked[:top_k]


# ---------------------------------------------------------
# Main
# ---------------------------------------------------------

def main():

    if len(sys.argv) < 2:
        print("Usage:")
        print("python test_ocr_match.py <image_path>")
        return

    image_path = Path(sys.argv[1])

    if not image_path.exists():
        print(f"ERROR: Image not found: {image_path}")
        return

    # Import EasyOCR
    import easyocr

    print("Loading EasyOCR...")

    reader = easyocr.Reader(
        ["en"],
        gpu=True,
        verbose=False
    )

    print("Reading image...")

    ocr_results = reader.readtext(
        str(image_path)
    )

    if not ocr_results:
        print("No OCR text detected.")
        return

    medicines = load_medicines()

    matches = find_matches(
        ocr_results,
        medicines,
        top_k=10
    )

    print("\n")
    print("=" * 70)
    print("TOP MEDICINE DATABASE MATCHES")
    print("=" * 70)

    if not matches:
        print("No suitable medicine matches found.")
        return

    for i, result in enumerate(matches, start=1):

        medicine = result["medicine"]

        print(f"\n#{i}")
        print(f"Match score : {result['score']:.4f}")
        print(f"OCR text    : {result['ocr_text']}")
        print(f"Matched by  : {result['matched_field']}")

        print(f"Medicine ID : {medicine.get('medicine_id', '')}")
        print(f"NDC         : {medicine.get('ndc_code', '')}")
        print(f"Brand       : {medicine.get('brand_name', '')}")
        print(f"Generic     : {medicine.get('generic_name', '')}")
        print(f"Manufacturer: {medicine.get('manufacturer', '')}")
        print(f"Dosage form : {medicine.get('dosage_form', '')}")
        print(f"Route       : {medicine.get('route', '')}")
        print(
            f"Ingredients : "
            f"{medicine.get('active_ingredients', '')}"
        )

    print("\n")
    print("=" * 70)
    print("END")
    print("=" * 70)


if __name__ == "__main__":
    main()