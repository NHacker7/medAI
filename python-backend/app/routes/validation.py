from fastapi import APIRouter
from pydantic import BaseModel

from app.services.validation_service import (
    validate_detected_medicine
)


router = APIRouter(
    prefix="/validation",
    tags=["Validation"]
)


class MedicineValidationRequest(BaseModel):
    expected_medicine: str
    detected_medicine: str | None = None
    confidence: float = 0.0


@router.post("/medicine")
def validate_medicine(
    request: MedicineValidationRequest
):

    result = validate_detected_medicine(
        expected_medicine=request.expected_medicine,
        detected_medicine=request.detected_medicine,
        confidence=request.confidence,
    )

    return result