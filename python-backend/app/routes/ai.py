"""Versioned, gateway-facing AI endpoints.

Existing unversioned endpoints remain intact as compatibility routes. These
endpoints accept JSON and are reserved for the Supabase Edge Function.
"""

from __future__ import annotations

import base64
import binascii
from pathlib import Path

from fastapi import APIRouter, Depends

from app.core.security import require_ai_backend_token
from app.schemas.ai import (
    FaceEncodingData,
    FaceEncodingResponse,
    FaceMatch,
    FaceMatchData,
    FaceMatchRequest,
    FaceMatchResponse,
    ImageRequest,
    MedicationValidationData,
    MedicationValidationRequest,
    MedicationValidationResponse,
    MedicineDetection,
    MedicineDetectionData,
    MedicineDetectionResponse,
)
from app.services.face_service import compare_face, generate_face_encoding
from app.services.medicine_detection_service import detect_medicine
from app.services.validation_service import validate_detected_medicine


router = APIRouter(
    prefix="/api/v1/ai",
    tags=["AI v1"],
    dependencies=[Depends(require_ai_backend_token)],
)


def decode_image(image: str) -> bytes:
    """Decode a base64 image/data URL without retaining its contents."""

    encoded_image = image.split(",", 1)[1] if image.startswith("data:") and "," in image else image
    try:
        image_bytes = base64.b64decode(encoded_image, validate=True)
    except (binascii.Error, ValueError) as exc:
        raise ValueError("Invalid base64 image.") from exc
    if not image_bytes:
        raise ValueError("Empty image.")
    return image_bytes


@router.post("/face-encodings", response_model=FaceEncodingResponse)
def create_face_encoding(request: ImageRequest) -> FaceEncodingResponse:
    embedding = generate_face_encoding(decode_image(request.image))
    return FaceEncodingResponse(data=FaceEncodingData(embedding=embedding, face_count=1))


@router.post("/face-matches", response_model=FaceMatchResponse)
def create_face_match(request: FaceMatchRequest) -> FaceMatchResponse:
    probe_embedding = generate_face_encoding(decode_image(request.image))
    matches: list[FaceMatch] = []
    for candidate in request.candidates:
        is_match, distance = compare_face(probe_embedding, candidate.embedding)
        if is_match:
            matches.append(FaceMatch(
                patient_id=candidate.patient_id,
                full_name=candidate.full_name,
                distance=round(distance, 4),
                confidence=round(max(0.0, min(100.0, (1.0 - distance) * 100)), 2),
            ))
    matches.sort(key=lambda match: match.distance)
    return FaceMatchResponse(data=FaceMatchData(
        face_count=1,
        matches=matches,
        best_match=matches[0] if matches else None,
    ))


@router.post("/medicine-detections", response_model=MedicineDetectionResponse)
def create_medicine_detection(request: ImageRequest) -> MedicineDetectionResponse:
    result = detect_medicine(decode_image(request.image))
    detections = [MedicineDetection(**detection) for detection in result["detections"]]
    top_detection = MedicineDetection(**result["top_detection"]) if result["top_detection"] else None
    model_path = Path(__file__).resolve().parents[3] / "runs" / "detect" / "train-2" / "weights" / "best.pt"
    return MedicineDetectionResponse(data=MedicineDetectionData(
        model_version=model_path.as_posix(),
        detections=detections,
        top_detection=top_detection,
    ))


@router.post("/medication-validations", response_model=MedicationValidationResponse)
def create_medication_validation(
    request: MedicationValidationRequest,
) -> MedicationValidationResponse:
    """Adapt the existing validation service without changing its rules."""

    result = validate_detected_medicine(
        expected_medicine=request.expected_medicine.name,
        detected_medicine=request.detected_medicine.class_name,
        confidence=request.detected_medicine.confidence,
    )
    recommendations = {
        "correct": ["Proceed with administration."],
        "wrong": [
            "Do NOT administer — confirm with the prescribing physician.",
            "Re-scan the medicine to rule out a detection error.",
            "Check whether the schedule was recently updated.",
        ],
        "unknown": [
            "Place the medicine clearly in view of the camera.",
            "Improve lighting conditions.",
            "Re-scan the medicine.",
        ],
        "no_face": [
            "Reposition the patient in front of the camera.",
            "Ensure good lighting on the face.",
        ],
    }
    validation_status = result["status"]
    return MedicationValidationResponse(data=MedicationValidationData(
        status=validation_status,
        reason=result["message"],
        recommendations=recommendations[validation_status],
    ))
