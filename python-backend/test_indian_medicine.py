from app.services.indian_medicine_service import (
    identify_indian_medicine,
)


def main():

    ocr_results = [
        {
            "text": "Dolo 650",
            "confidence": 0.4386,
        },
        {
            "text": "Dolo-650",
            "confidence": 0.6719,
        },
    ]

    result = identify_indian_medicine(
        ocr_results
    )

    print("\n" + "=" * 70)
    print("INDIAN MEDICINE IDENTIFICATION")
    print("=" * 70)

    print("Status:", result["status"])
    print("Confidence:", result["confidence"])
    print("OCR text:", result.get("ocr_text"))

    print("\nMedicine:")

    medicine = result.get("medicine")

    if medicine:
        for key, value in medicine.items():
            print(f"{key}: {value}")

    print("\nCandidates:")

    for i, candidate in enumerate(
        result["candidates"],
        start=1
    ):

        medicine = candidate["medicine"]

        print(
            f"{i}. "
            f"{medicine['name']} | "
            f"Score={candidate['score']} | "
            f"Manufacturer="
            f"{medicine['manufacturer_name']}"
        )

    print("=" * 70)


if __name__ == "__main__":
    main()