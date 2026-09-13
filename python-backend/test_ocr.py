import sys
from pathlib import Path

import easyocr
import cv2


def main():
    if len(sys.argv) < 2:
        print("Usage:")
        print("python test_ocr.py <image_path>")
        return

    image_path = Path(sys.argv[1])

    if not image_path.exists():
        print(f"ERROR: Image not found: {image_path}")
        return

    print("Loading EasyOCR...")
    print("GPU:", True)

    reader = easyocr.Reader(
        ["en"],
        gpu=True,
        verbose=True
    )

    print("\nReading image...")
    results = reader.readtext(str(image_path))

    print("\n" + "=" * 60)
    print("OCR RESULTS")
    print("=" * 60)

    if not results:
        print("No text detected.")
        return

    for i, (bbox, text, confidence) in enumerate(results, start=1):
        print(
            f"{i}. Text: {text!r} | "
            f"Confidence: {confidence:.4f}"
        )

    # Create annotated image
    image = cv2.imread(str(image_path))

    for bbox, text, confidence in results:
        points = [(int(x), int(y)) for x, y in bbox]

        for j in range(4):
            cv2.line(
                image,
                points[j],
                points[(j + 1) % 4],
                (0, 255, 0),
                2
            )

        x = min(p[0] for p in points)
        y = min(p[1] for p in points)

        cv2.putText(
            image,
            f"{text} ({confidence:.2f})",
            (x, max(20, y - 5)),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.6,
            (0, 255, 0),
            2
        )

    output_path = image_path.parent / "ocr_result.jpg"
    cv2.imwrite(str(output_path), image)

    print("\nAnnotated image saved to:")
    print(output_path)


if __name__ == "__main__":
    main()