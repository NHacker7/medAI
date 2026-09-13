from pathlib import Path

from ultralytics import YOLO
import numpy as np
import cv2


# ==========================================================
# YOLO MODEL
# ==========================================================

MODEL_PATH = (
    Path(__file__).resolve().parents[3]
    / "runs"
    / "detect"
    / "train-2"
    / "weights"
    / "best.pt"
)

model = YOLO(str(MODEL_PATH))


# ==========================================================
# MEDICINE CLASSES
# ==========================================================

CLASS_NAMES = {
    0: "Anarex",
    1: "Atenelol",
    2: "Calcium",
    3: "Lozarsin",
    4: "Paracetamol",
}


# ==========================================================
# DETECT MEDICINE
# ==========================================================

def detect_medicine(file_bytes: bytes):

    # ------------------------------------------------------
    # Convert bytes to OpenCV image
    # ------------------------------------------------------

    image_array = np.frombuffer(
        file_bytes,
        dtype=np.uint8
    )

    image = cv2.imdecode(
        image_array,
        cv2.IMREAD_COLOR
    )

    if image is None:
        raise ValueError("Invalid image.")


    # ------------------------------------------------------
    # Run YOLO
    # ------------------------------------------------------

    results = model.predict(
        source=image,
        conf=0.50,
        device=0,
        verbose=False
    )


    # ------------------------------------------------------
    # Collect detections
    # ------------------------------------------------------

    detections = []


    for result in results:

        if result.boxes is None:
            continue


        for box in result.boxes:

            # Class ID
            class_id = int(
                box.cls[0].item()
            )


            # Confidence
            confidence = float(
                box.conf[0].item()
            )


            # Bounding box
            xyxy = box.xyxy[0].tolist()

            x1 = float(xyxy[0])
            y1 = float(xyxy[1])
            x2 = float(xyxy[2])
            y2 = float(xyxy[3])


            # Convert xyxy -> xywh
            x = x1
            y = y1
            width = x2 - x1
            height = y2 - y1


            # Medicine name
            medicine_name = CLASS_NAMES.get(
                class_id,
                "Unknown"
            )


            # ------------------------------------------------
            # Frontend-compatible detection
            # ------------------------------------------------

            detections.append({

                "class_name": medicine_name,

                # Keep confidence between 0 and 1
                "confidence": round(
                    confidence,
                    4
                ),

                # [x, y, width, height]
                "bbox": [
                    round(x, 2),
                    round(y, 2),
                    round(width, 2),
                    round(height, 2)
                ]
            })


    # ------------------------------------------------------
    # Sort highest confidence first
    # ------------------------------------------------------

    detections.sort(
        key=lambda x: x["confidence"],
        reverse=True
    )


    # ------------------------------------------------------
    # Top detection
    # ------------------------------------------------------

    top_detection = (
        detections[0]
        if detections
        else None
    )


    # ------------------------------------------------------
    # Final response
    # ------------------------------------------------------

    return {

        "success": True,

        "count": len(detections),

        "detections": detections,

        "top_detection": top_detection
    }